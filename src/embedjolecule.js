import $ from "jquery";
import _ from "lodash";
import {Protein, Controller, Scene} from "./protein";
import {ProteinDisplay} from "./proteindisplay";
import {
  exists,
  blink,
  link_button,
  toggle_button,
  ViewPiece,
  stick_in_top_left,
  do_nothing,
  random_id,
} from "./util.js";


/**
 *
 * EmbedJolecule - the widget that shows proteins and
 * annotations
 *
 **/

class EmbedJolecule {

  constructor (params) {
    this.params = params;
    this.is_loop = this.params.is_loop;

    this.div_tag = this.params.div_tag;
    this.div = $(this.params.div_tag);

    this.div[0].oncontextmenu = do_nothing;

    this.init_view_id = this.params.view_id;
    this.data_server = this.params.data_server;
    this.h_annotation_view = this.params.view_height;

    this.protein = new Protein();
    this.scene = new Scene(this.protein);
    this.controller = new Controller(this.scene);

    this.create_protein_div();
    this.protein_display = new ProteinDisplay(
      this.scene, '#jolecule-protein-display', this.controller);
    this.protein_display.min_radius = 10;

    this.create_status_div();
    this.create_view_div();

    var blink_text = $('<div>').html(this.params.loading_html);
    blink(blink_text);
    this.loading_message_div = $('<div>').append(blink_text);
    stick_in_top_left(this.div, this.loading_message_div, 30, 90);

    this.is_view_text_shown = this.params.is_view_text_shown;
    this.set_text_state();

    $(window).resize(() => this.resize());

    this.data_server.get_protein_data((protein_data) => {

      this.load_protein_data(protein_data);

      this.data_server.get_views((view_dicts) => {

        this.load_views_from_server(view_dicts);

        if (this.params.onload) {
          this.params.onload(this);
        }
      });
    });
  };

  load_protein_data(protein_data) {

    this.loading_message_div.text("Parsing protein " + protein_data.pdb_id);

    if (protein_data['pdb_text'].length == 0) {
      console.log(this.params.loading_failure_html);
      this.loading_message_div.html(
        this.params.loading_failure_html);
      return;
    }

    this.protein.load(protein_data);

    if (this.protein.parsing_error) {
      this.loading_message_div.text(
        "Error parsing protein: " + this.protein.parsing_error);
      return;
    }

    this.protein_display.buildAfterDataLoad();

    this.loading_message_div.remove();

    this.resize();
  }

  addDataServer(data_server) {

    data_server.get_protein_data((protein_data) => {
      if (protein_data['pdb_text'].length == 0) {
        this.loading_message_div.html(
          this.params.loading_failure_html);
        return;
      }
      this.loading_message_div.text("Parsing protein " + protein_data.pdb_id);
      console.log("EmbedJolecule.addDataServer", protein_data.pdb_id);

      this.protein.load(protein_data);
      function empty(elem) {
        while (elem.lastChild) elem.removeChild(elem.lastChild);
      }
      // let scene = this.protein_display.threeJsScene;
      // for (let i = scene.children.length - 1; i >= 0 ; i--) {
      //   let child = scene.children[ i ];
      //
      //   if ( child !== plane && child !== camera ) { // plane & camera are stored earlier
      //     scene.remove(child);
      //   }
      // }
      // this.protein_display.setLights();
      this.protein_display.buildScene();
      this.protein_display.sequenceWidget.resetResidues();
    });

  }

  load_views_from_server(view_dicts) {

    this.controller.load_views_from_flat_views(view_dicts);

    let view_id = this.scene.current_view.id;
    if (this.init_view_id) {
      if (this.init_view_id in this.scene.saved_views_by_id) {
        view_id = this.init_view_id;
      }
    }
    this.update_view();

    if (this.params.view_id in this.scene.saved_views_by_id) {
      this.controller.set_target_view_by_id(this.params.view_id);
      this.update_view();
    }
  }

  save_views_to_server(success) {
    this.data_server.save_views(
      this.controller.get_view_dicts(), success);
    this.scene.changed = true;
  }

  save_curr_view() {
    var new_id = random_id();
    this.controller.calculate_current_abs_camera();
    this.controller.save_current_view(new_id);
    this.update_view();
    this.view_div.css('background-color', 'lightgray');
    var _this = this;
    this.save_views_to_server(
      function() { 
        _this.view_div.css('background-color', ''); 
      }
    );
  }

  get_curr_view() {
    var i = this.scene.i_last_view;
    if (i in this.scene.saved_views) {
      var id = this.scene.saved_views[i].id;
      return this.scene.saved_views_by_id[id];
    } else {
      return this.scene.saved_views[0]
    }
  }

  change_text(changed_text) {
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

  delete_curr_view() {
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

  is_changed() {
    if (!exists(this.protein_display)) {
      return false;
    }
    return this.protein_display.is_changed();
  }

  animate() {
    if (exists(this.protein_display)) {
      this.protein_display.animate();
      if (this.is_loop) {
        if (this.scene.n_update_step <= 0) {
          // loop started
          this.scene.n_update_step -= 1;
          if (this.scene.n_update_step < -100) {
            this.controller.set_target_next_view();
            this.scene.changed = true;
          }
        }
      }
    }
  };

  draw() {
    if (exists(this.protein_display)) {
      if (this.scene.changed) {
        this.update_view();
        this.protein_display.draw();
        this.scene.changed = false;
      }
    }
  }

  cycle_backbone() {
    if (this.scene.current_view.show.all_atom) {
      this.controller.set_backbone_option('ribbon');
    } else if (this.scene.current_view.show.ribbon) {
      this.controller.set_backbone_option('trace');
    } else if (this.scene.current_view.show.trace){
      this.controller.set_backbone_option('all_atom');
    }
  }

  set_text_state() {
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

  toggle_text_state() {
    this.is_view_text_shown = !this.is_view_text_shown;
    this.set_text_state();
  }
  
  goto_prev_view() {
    this.controller.set_target_prev_view();
    this.update_view();
  }
  
  goto_next_view() {
    this.controller.set_target_next_view();
    this.update_view();
  }

  create_protein_div() {
    var height = 
        this.div.outerHeight() - 
        this.h_annotation_view;
    this.protein_div = 
      $('<div>')
        .attr('id', 'jolecule-protein-display')
        .addClass('jolecule-embed-body')
        .css('overflow', 'hidden')
        .css('width', this.div.outerWidth())
        .css('height', height);
    this.div.append(this.protein_div);
  }

  create_status_div() {
    var _this = this;

    this.status_text = $('<span>');

    var text_button = toggle_button(
        'toggle_text', 'T', 'jolecule-button',
        function() { return _this.is_view_text_shown },
        function(b) { _this.toggle_text_state(); });

    var prev_button = link_button(
      'prev_view', '<', 'jolecule-button',
      function() { _this.goto_prev_view() });

    var next_button = link_button(
        'prev_view', '>', 'jolecule-button', 
        function() { _this.goto_next_view() });

    var loop_button = toggle_button(
        'loop', '&orarr;', 'jolecule-button',
        function() { return _this.is_loop; },
        function(b) { _this.is_loop = b });

    var save_button = '';
    if (_this.params.is_editable) {
      save_button = link_button(
          'save_view', '+', 'jolecule-button',
           function() { _this.save_curr_view() });
    };

    this.lig_button = toggle_button(
      '', 'lig', 'jolecule-button',
      function() { return _this.controller.get_show_option('ligands'); },
      function(b) { _this.controller.set_show_option('ligands', b); }
    );

    this.wat_button = toggle_button(
      '', 'h2o', 'jolecule-button',
      function() { return _this.controller.get_show_option('water'); },
      function(b) { _this.controller.set_show_option('water', b); }
    );

    this.hyd_button = toggle_button(
      '', 'h', 'jolecule-button',
      function() { return _this.controller.get_show_option('hydrogen'); },
      function(b) { _this.controller.set_show_option('hydrogen', b); }
    );
    this.hyd_button = '';

    var backbone_button = link_button(
      '', 'backbone', 'jolecule-button',
      function() { _this.cycle_backbone(); });

    var all_button = link_button('', 'all', 'jolecule-button',
      function() { _this.controller.set_show_option('sidechain', true); });

    var clear_button = link_button(
      '', 'x', 'jolecule-button',
      function() {
        _this.controller.set_show_option('sidechain', false);
        _this.controller.clear_selected();
      });

    var neighbour_button = link_button(
      '', 'near', 'jolecule-button',
      function() { _this.controller.toggle_neighbors(); });

    this.status_div = $('<div style="flex-wrap: wrap; justify-content: flex-end">')
      .addClass('jolecule-embed-view-bar')
      .append(
        $('<div style="flex: 1; white-space: nowrap;">')
          .append(loop_button)
          .append(text_button)
          .append(prev_button)
          .append(this.status_text)
          .append(next_button)
          .append(save_button)
      )
      .append(
        $('<div style="margin-left: 0.75em; white-space: nowrap;">')
          .append(backbone_button)
      )
      .append(
        $('<div style="margin-left: 0.75em; white-space: nowrap;">')
          .append(this.lig_button)
          .append(this.hyd_button)
          .append(this.wat_button)
      ) 
      .append(
        $('<div style="margin-left: 0.75em; white-space: nowrap; align-self: flex-end">')
          .append(' sidechain:')
          .append(all_button)
          .append(clear_button)
          .append(neighbour_button)
          .append(' ')
      ) ;

    this.div.append(this.status_div);
  }

  update_view() {
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
        window.location.href = '/embed/pdb/pdb?pdb_id=' + view.pdb_id + '&view=' + view.id;
      },
    });
    this.real_view_div = view_piece.div;
    this.real_view_div
      .css('overflow-y', 'auto')
      .css('height', '100%');
    this.view_div
      .empty()
      .append(this.real_view_div);
    this.lig_button.redraw();
    this.wat_button.redraw();
    // this.hyd.redraw();
  }

  create_view_div() {
    this.view_div = $('<div>')
      .addClass('jolecule-embed-view');
    this.div.append(this.view_div);
  }

  resize() {
    this.protein_div.width(this.div.outerWidth());
    var new_height = this.div.outerHeight()
        - this.view_div.outerHeight()
        - this.status_div.outerHeight();
    if (exists(this.protein_display)) {
      if (exists(this.protein_display.renderer)) {
        this.protein_display.renderer.domElement.style.height = new_height;
        this.protein_display.resize();
      }
      this.scene.changed = true;
    }
    this.protein_div.css('height', new_height);
  }

}


export { EmbedJolecule }