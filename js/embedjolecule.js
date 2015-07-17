

//////////////////////////////////////////////////////////
// 
// EmbedJolecule - the widget that shows proteins and 
// annotations
//
///////////////////////////////////////////////////////////


function EmbedJolecule(params) {
  
  this.load_protein_data = function(protein_data) {
    this.loading_message_div.text("Calculating bonds...");
    this.protein.load(protein_data);
    if (this.protein.parsing_error) {
      this.loading_message_div.text(
        "Error parsing protein: " + this.protein.parsing_error);
      return;
    }
    var data = protein_data['pdb_text']
    var lines = data.split(/\r?\n/);
    var default_text = "";
    for (var i=0; i<lines.length; i++) {
      var line = lines[i];
      if (line.substring(0, 5) == 'TITLE') {
        default_text += line.substring(10);
      }
    }
    if (!default_text) {
      default_text = "";
    }
    this.scene.make_default_view(default_text);
    this.populate_residue_selector();
    this.loading_message_div.remove();
  }

  this.load_views_from_server = function(view_dicts) {
    this.controller.load_views_from_flat_views(view_dicts);
    view_id = this.scene.current_view.id;
    if (this.init_view_id) {
      if (this.init_view_id in this.scene.saved_views_by_id) {
        view_id = this.init_view_id;
      }
    }
    this.update_view();
  }

  this.save_views_to_server = function(success) {
    this.data_server.save_views(
      this.controller.get_view_dicts(), success);
    this.scene.changed = true;
  }

  this.save_curr_view = function() {
    var new_id = random_id();
    this.controller.calculate_current_abs_camera();
    this.controller.save_current_view(new_id);
    this.update_view()
    this.view_div.css('background-color', 'lightgray');
    var _this = this;
    this.save_views_to_server(
      function() { 
        _this.view_div.css('background-color', ''); 
      }
    );
  }

  this.get_curr_view = function() {
    var i = this.scene.i_last_view;
    if (i in this.scene.saved_views) {
      var id = this.scene.saved_views[i].id;
      return this.scene.saved_views_by_id[id];
    } else {
      return this.scene.saved_views[0]
    }
  }

  this.change_text = function(changed_text) {
    var view = this.get_curr_view();
    view.text = changed_text;
    this.view_div.css('background-color', 'lightgray');
    var _this = this;
    var success = function() {
      _this.view_div.css('background-color', '');
    }
    this.save_views_to_server(success);
    this.scene.changed = true;
  }

  this.delete_curr_view = function() {
    var i = this.scene.i_last_view;
    if (i == 0) {
      // skip default view:000000
      return;
    }
    var id = this.scene.saved_views[i].id;
    this.controller.delete_view(id);
    this.view_div.css('background-color', 'lightgray');

    var _this = this;
    var success = function() {
      _this.update_view();
      _this.view_div.css('background-color', '');
    }
    this.data_server.delete_protein_view(id, success);
  }

  this.is_changed = function() {
    if (!this.scene) {
      return false;
    }
    return this.scene.changed;
  }

  this.animate = function() {
    if (this.protein_display) {
      this.protein_display.scene.animate();
      if (this.is_loop) {
        if (this.scene.n_update_step < 0) {
          // loop started
          this.scene.n_update_step -= 1;
          if (this.scene.n_update_step < -100) {
            this.controller.set_target_next_view();
            this.scene.changed = true;
          }
        }
      }
    }
  }

  this.draw =function() { 
    if (this.scene.changed) {
      this.residue_selector.val(this.scene.current_view.res_id);
      this.update_view();
      this.protein_display.draw();
      this.scene.changed = false;
    }
  }

  this.cycle_backbone = function() {
    if (this.scene.current_view.show.all_atom) {
      this.controller.set_backbone_option('ribbon');
    } else if (this.scene.current_view.show.ribbon) {
      this.controller.set_backbone_option('trace');
    } else if (this.scene.current_view.show.trace){
      this.controller.set_backbone_option('all_atom');
    }
  }

  this.set_text_state = function() {
    var h_padding = this.view_div.outerHeight() - this.view_div.height();
    if (this.is_view_text_shown) {
      this.view_div.height(this.h_annotation_view);
      this.view_div.css('visibility', 'visible');
    } else {
      this.view_div.height(0);
      this.view_div.css('visibility', 'hidden');
    }
    this.resize();
    this.controller.scene.changed = true;
  }

  this.toggle_text_state = function() {
    this.is_view_text_shown = !this.is_view_text_shown;
    this.set_text_state();
  }
  
  this.goto_prev_view = function() {
    this.controller.set_target_prev_view();
    this.update_view();
  }
  
  this.goto_next_view = function() {
    this.controller.set_target_next_view();
    this.update_view();
  }

  this.populate_residue_selector = function() {
    var residues = this.protein.residues;
    for (var i=0; i<residues.length; i++) {
      var value = residues[i].id;
      var text = residues[i].id + '-' + residues[i].type;
      this.residue_selector.append(
        $('<option>').attr('value',value).text(text));
    }
    var _this = this;
    var change_fn = function() {
      var res_id = _this.residue_selector.find(":selected").val();
      _this.controller.set_target_view_by_res_id(res_id);
    }
    this.residue_selector.change(change_fn);
  }

  this.create_header_div = function() {
    var _this = this;

    var help = link_button(
      '', 'j', 'jolecule-button', 
      function() { window.location = "http://jolecule.com/pdb/" + _this.protein.pdb_id; });

    this.residue_selector = $('<select>')
      .attr('id', this.div_tag.slice(1) + '-residue_selector')
      .addClass('jolecule-residue-selector');

    this.lig = toggle_button(
      '', 'lig', 'jolecule-button', 
      function() { return _this.controller.get_show_option('ligands'); },
      function(b) { _this.controller.set_show_option('ligands', b); }
    );
    this.wat = toggle_button(
      '', 'wat', 'jolecule-button', 
      function() { return _this.controller.get_show_option('water'); },
      function(b) { _this.controller.set_show_option('water', b); }
    );
    this.hyd = toggle_button(
      '', 'h', 'jolecule-button', 
      function() { return _this.controller.get_show_option('hydrogen'); },
      function(b) { _this.controller.set_show_option('hydrogen', b); }
    );

    var backbone = link_button(
      '', 'bb', 'jolecule-button', 
      function() { _this.cycle_backbone(); });

    var all = link_button('', 'sc', 'jolecule-button', 
      function() { _this.controller.set_show_option('sidechain', true); });
    var clear = link_button(
      '', 'clr', 'jolecule-button', 
      function() { 
        _this.controller.set_show_option('sidechain', false); 
        _this.controller.clear_selected(); 
      });
    var neighbour = link_button(
      '', 'neig', 'jolecule-button', 
      function() { _this.controller.select_neighbors(); });

    this.header_div = $('<div>')
      .addClass('jolecule-embed-header')
      .append(
        $('<span>')
          .css('float', 'left')
          .append(help)
      )
      .append(
        $('<span>')
          .css('float', 'right')
          .append(this.residue_selector)
          .append(' ')
          .append(this.lig)
          .append(this.hyd)
          .append(this.wat)
          .append(' ')
          .append(backbone)
          .append(' ')
          .append(all)
          .append(clear)
          .append(neighbour)
      )

    this.div.append(this.header_div);
  }

  this.create_protein_div = function() {
    var height = 
        this.div.outerHeight() - 
        this.header_div.outerHeight() - 
        this.h_annotation_view;
    this.protein_div = 
      $('<div>')
        .addClass('jolecule-embed-body')
        .css('width', this.div.outerWidth())
        .css('height', height);
    this.div.append(this.protein_div);
  }

  this.create_status_div = function() {
    var _this = this;

    var prev_button = link_button(
        'prev_view', '<', 'jolecule-button',
        function() { _this.goto_prev_view() });

    this.status_text = $('<span>');

    var next_button = link_button(
        'prev_view', '>', 'jolecule-button', 
        function() { _this.goto_next_view() });

    var loop_button = toggle_button(
        'loop', 'loop', 'jolecule-button', 
        function() { return _this.is_loop; },
        function(b) { _this.is_loop = b });

    if (_this.params.is_editable) {
      var save_button = link_button(
          'save_view', 'create', 'jolecule-button', 
           function() { _this.save_curr_view() });
    } else {
      var save_button = '';
    }

    var text_button = toggle_button(
        'toggle_text', 'text', 'jolecule-button', 
        function() { return _this.is_view_text_shown },
        function(b) { _this.toggle_text_state(); });

    this.status_div = $('<div>')
      .addClass('jolecule-embed-view-bar')
      .append(
        $('<span>')
          .css('float', 'left')
          .append(prev_button)
          .append(this.status_text)
          .append(next_button)
      )
      .append(
        $('<span>')
          .css('float', 'right')
          .append(loop_button)
          .append(save_button)
          .append(text_button)
      )
      .append('<br clear=all>')

    this.div.append(this.status_div);
  }

  this.update_view = function() {
    var _this = this;
    var view = this.get_curr_view();
    if (view == null) {
      return;
    }
    var n_view = this.scene.saved_views.length;
    var i_view = view.order + 1
    this.status_text.text(' ' + i_view + '/' + n_view + ' ');
    var view_piece = new ViewPiece({
      view: view,
      is_editable: _this.params.is_editable,
      delete_view: function() { _this.delete_curr_view() },
      save_change: function(text) { _this.change_text(text); },
      pick: do_nothing,
      embed_view: function() {
        window.location.href = '/embed/pdb/' + view.pdb_id + '?view=' + view.id;
      },
    });
    this.real_view_div = view_piece.div;
    this.real_view_div
      .css('overflow-y', 'auto')
      .css('height', '100%')
    this.view_div
      .empty()
      .append(this.real_view_div)
    this.lig.redraw();
    this.wat.redraw();
    this.hyd.redraw();
  }

  this.create_view_div = function() {
    this.view_div = $('<div>')
      .addClass('jolecule-embed-view');
    this.div.append(this.view_div);
  }

  this.resize = function(event) {
    this.protein_div.width(this.div.outerWidth());
    this.protein_div.height(
      this.div.outerHeight()
        - this.header_div.outerHeight()
        - this.view_div.outerHeight()
        - this.status_div.outerHeight());
    if (typeof this.scene !== "undefined") {
      this.scene.changed = true;
    }
  }

  this.init = function(params) {
    this.params = params;
    this.is_loop = this.params.is_loop;

    this.div_tag = this.params.div_tag;
    this.div = $(this.params.div_tag)

    this.div[0].oncontextmenu = do_nothing;

    this.init_view_id = this.params.view_id;
    this.data_server = this.params.data_server;
    this.h_annotation_view = this.params.view_height;

    this.protein = new Protein();
    this.scene = new Scene(this.protein);
    this.controller = new Controller(this.scene)

    this.create_header_div();
    this.create_protein_div();
    this.create_status_div();
    this.create_view_div();

    this.canvas_widget = new CanvasWidget(
        this.protein_div, 'black');
    this.protein_display = new ProteinDisplay(
        this.scene, this.canvas_widget, this.controller);
    this.protein_display.min_radius = 10;

    var blink_text = $('<div>').html(this.params.loading_html);
    blink(blink_text);
    this.loading_message_div = $('<div>').append(blink_text);
    stick_in_top_left(this.div, this.loading_message_div, 30, 90);      

    this.is_view_text_shown = this.params.is_view_text_shown;
    this.set_text_state();

    var _this = this;

    $(window).resize(function() { _this.resize(); });

    var load_failure = function() {
      _this.loading_message_div.html(
        _this.params.loading_failure_html);
    }

    var load_view_dicts = function(view_dicts) {
      _this.load_views_from_server(view_dicts); 
      if (_this.params.view_id in _this.scene.saved_views_by_id) {
        _this.controller.set_target_view_by_id(_this.params.view_id);
        _this.update_view();
      }
      if (_this.params.onload) {
        _this.params.onload(_this);
      }
    }

    var load_protein_data = function(protein_data) { 
      _this.loading_message_div.empty();
      if (protein_data['pdb_text'].length == 0) {
        load_failure();
      } else {
        _this.load_protein_data(protein_data); 
        _this.resize();
        _this.data_server.get_views(load_view_dicts);
      }
    }

    this.data_server.get_protein_data(
        load_protein_data, load_failure);
  }

  this.init(params);
}


