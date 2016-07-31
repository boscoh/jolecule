import $ from "jquery";
import _ from "underscore";
import {Protein, Controller, Scene} from "./protein";
import {GlProteinDisplay} from "./glproteindisplay";


// Utility functions

function exists(x) {
  return !_.isUndefined(x);
}


function is_ipad() {
  return navigator.userAgent.match(/iPad/i) != null;
}


function url() {
  return "" + window.location;
}


function get_pdb_id_from_url(loc) {
  var pieces = loc.split('#')[0].split('/');
  var i = pieces.length - 1;
  return pieces[i];
}


function blink(selector) {
  $(selector).animate(
      {opacity: 0}, 50, "linear",
      function () {
        $(this).delay(800);
        $(this).animate(
            {opacity: 1}, 50,
            function () {
              blink(this);
            });
        $(this).delay(800);
      }
  );
}


function link_button(id_tag, html_text, class_tag, click) {
  var item =
      $('<a>')
          .attr('id', id_tag)
          .attr('href', '')
          .html(html_text);

  if (class_tag) {
    item.addClass(class_tag);
  }

  if (click) {
    item.on(' click touch ',
        function (e) {
          console.log('clickity click ');
          e.preventDefault();
          click();
        }
    );
  }

  return item;
}


function toggle_button(id_tag, html_text, class_tag, get_toggle, toggle) {
  var item =
      $('<a>')
          .attr('id', id_tag)
          .attr('href', '')
          .html(html_text);

  var color = function () {
    if (get_toggle()) {
      item.addClass('jolecule-button-toggle-on');
    } else {
      item.removeClass('jolecule-button-toggle-on');
    }

  }

  color();

  if (class_tag) {
    item.addClass(class_tag);
  }

  item.click(
      function (e) {
        toggle(!get_toggle());
        color();
        return false;
      }
  );

  item.redraw = color;

  return item;
}


function create_message_div(text, width, cleanup) {
  var edit_div = $('<div>')
      .addClass('jolecule-textbox')
      .css({'width': width});

  var okay = link_button(
      'okay', 'okay', 'jolecule-button',
      function () {
        cleanup();
        return false;
      });

  edit_div
      .append(text)
      .append("<br><br>")
      .append(okay);
  return edit_div;
}


function create_edit_box_div(init_text, width, change, cleanup, label) {

  var accept_edit = function () {
    change(textarea.val());
    cleanup();
    window.keyboard_lock = false;
  }

  var discard_edit = function () {
    cleanup();
    window.keyboard_lock = false;
  }

  var save_button = link_button(
      'okay', 'okay', 'jolecule-small-button', accept_edit);

  var discard_button = link_button(
      'discard', 'discard', 'jolecule-small-button', discard_edit);

  var textarea = $("<textarea>")
      .css('width', width)
      .addClass('jolecule-view-text')
      .text(init_text)
      .keydown(
          function (e) {
            if (e.keyCode == 27) {
              discard_edit();
              return true;
            }
          })

  if (!label) {
    label = '';
  }

  window.keyboard_lock = true;

  return $('<div>')
      .css('width', width)
      .append(label)
      .append(textarea)
      .append(save_button)
      .append(' ')
      .append(discard_button);
}


var ViewPiece = function (params) {

  this.save_change = function () {
    var changed_text = this.edit_textarea.val();
    this.edit_div.hide();
    this.show_div.show();
    this.show_text_div.html(changed_text);
    this.params.save_change(changed_text);
    window.keyboard_lock = false;
  }

  this.start_edit = function () {
    this.params.pick();
    this.edit_textarea.text(this.params.view.text);
    this.edit_div.show();
    this.show_div.hide();
    var textarea = this.edit_textarea.find('textarea')
    setTimeout(function () {
      textarea.focus();
    }, 100)
    window.keyboard_lock = true;
  }

  this.discard_change = function () {
    this.edit_div.hide();
    this.show_div.show();
    window.keyboard_lock = false;
  }

  this.make_edit_div = function () {
    var _this = this;

    this.edit_textarea = $("<textarea>")
        .addClass('jolecule-view-text')
        .css('width', '100%')
        .css('height', '5em')
        .click(do_nothing);

    this.edit_div = $('<div>')
        .css('width', '100%')
        .click(do_nothing)
        .append(this.edit_textarea)
        .append('<br><br>')
        .append(
            link_button(
                "", "save", "jolecule-small-button",
                function (event) {
                  _this.save_change()
                }))
        .append(' &nbsp; ')
        .append(
            link_button(
                "", "discard", "jolecule-small-button",
                function (event) {
                  _this.discard_change()
                }))
        .hide();

    this.div.append(this.edit_div);
  }

  this.make_show_div = function () {
    var view = this.params.view;

    var _this = this;

    var edit_button = link_button(
        "", "edit", "jolecule-small-button",
        function () {
          _this.start_edit();
        });

    var embed_button = link_button(
        "", "embed", "jolecule-small-button",
        function () {
          _this.params.embed_view()
        });

    var delete_button = link_button(
        "", "delete", "jolecule-small-button",
        function () {
          _this.params.delete_view()
        });

    this.show_text_div = $('<div>')
        .addClass("jolecule-view-text")
        .html(params.view.text)

    this.show_div = $('<div>')
        .css('width', '100%')
        .append(this.show_text_div);

    if (view.id != 'view:000000') {
      this.show_div
          .append(
              $('<div>')
                  .addClass("jolecule-author")
                  .html(view.creator)
          )
    }

    if (this.params.is_editable) {

      this.show_div
          .append(embed_button)
          .append(' ')

      if (!view.lock) {
        this.show_div
            .append(edit_button)

        if (exists(this.params.swap_up) && this.params.swap_up)
          this.show_div
              .append(" ")
              .append(
                  link_button(
                      "", "up", "jolecule-small-button",
                      function () {
                        _this.params.swap_up();
                      }))

        if (exists(this.params.swap_up) && this.params.swap_down)
          this.show_div
              .append(" ")
              .append(
                  link_button(
                      "", "down", "jolecule-small-button",
                      function () {
                        _this.params.swap_down();
                      }))

        this.show_div
            .append(
                $("<div>")
                    .css("float", "right")
                    .append(delete_button))
        ;
      }
    }

    this.div.append(this.show_div);
  }

  this.init = function (params) {
    this.params = params;
    this.div = $('<div>').addClass("jolecule-view");

    if (exists(params.goto)) {
      this.div.append(
          link_button(
              "",
              this.params.goto,
              'jolecule-large-button',
              this.params.pick)
      )
    }
    this.params = params;
    this.make_edit_div();
    this.make_show_div();
  }

  this.init(params)
}


function stick_in_top_left(parent, target, x_offset, y_offset) {
  target.css({
    'position': 'absolute',
    'z-index': '9000'
  });
  var top = parent.position().top;
  var left = parent.position().left;
  parent.append(target);
  var w_parent = parent.outerWidth();
  var h_parent = parent.outerHeight();
  target.width(w_parent - 2 * x_offset);
  target.height(h_parent - 2 * y_offset);
  target.css({
    'top': top + y_offset,
    'left': left + x_offset,
  });
}


function stick_in_center(parent, target, x_offset, y_offset) {
  target.css({
    'position': 'absolute',
    'z-index': '9000'
  });
  var top = parent.position().top;
  var left = parent.position().left;
  var w_parent = parent.outerWidth();
  var h_parent = parent.outerHeight();
  parent.prepend(target);
  var w_target = target.outerWidth();
  var h_target = target.outerHeight();
  target.css({
    'top': top + h_parent / 2 - h_target / 2 - y_offset,
    'left': left + w_parent / 2 - w_target / 2 - x_offset,
  });
}


function in_array(v, w_list) {
  return w_list.indexOf(v) >= 0;
}


function del_from_array(x, x_list) {
  for (var i = 0; i <= x_list.length; i += 1)
    if (x == x_list[i]) {
      x_list.splice(i, 1);
    }
}


function trim(text) {
  return text.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}


function do_nothing() {
  return false;
}


function clone_dict(d) {
  var new_d = {};
  for (var k in d) {
    new_d[k] = d[k];
  }
  ;
  return new_d;
}


function clone_list_of_dicts(list_of_dicts) {
  var new_list = [];
  for (var i = 0; i < list_of_dicts.length; i += 1) {
    new_list.push(clone_dict(list_of_dicts[i]));
  }
  return new_list;
}


function random_string(n_char) {
  var chars =
      "0123456789abcdefghiklmnopqrstuvwxyz";
  var s = '';
  for (var i = 0; i < n_char; i++) {
    var j = Math.floor(Math.random() * chars.length);
    s += chars.substring(j, j + 1);
  }
  return s;
}


function random_id() {
  return 'view:' + random_string(6);
}

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
    this.protein_display.post_load(default_text);
    this.populate_residue_selector();
    this.loading_message_div.remove();
  }

  this.load_views_from_server = function(view_dicts) {
    this.controller.load_views_from_flat_views(view_dicts);
    var view_id = this.scene.current_view.id;
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
    if (!exists(this.protein_display)) {
      return false;
    }
    return this.protein_display.is_changed();
  }

  this.animate = function() {
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
  }

  this.draw = function() { 
    if (exists(this.protein_display)) {
      if (this.scene.changed) {
        this.residue_selector.val(this.scene.current_view.res_id);
        this.update_view();
        this.protein_display.draw();
        this.scene.changed = false;
      }
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
    // this.hyd = toggle_button(
    //   '', 'h', 'jolecule-button', 
    //   function() { return _this.controller.get_show_option('hydrogen'); },
    //   function(b) { _this.controller.set_show_option('hydrogen', b); }
    // );

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
      function() { _this.controller.toggle_neighbors(); });

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
          // .append(this.hyd)
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
        .attr('id', 'jolecule-protein-display')
        .addClass('jolecule-embed-body')
        .css('overflow', 'hidden')
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
        window.location.href = '/embed/pdb/pdb?pdb_id=' + view.pdb_id + '&view=' + view.id;
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
    // this.hyd.redraw();
  }

  this.create_view_div = function() {
    this.view_div = $('<div>')
      .addClass('jolecule-embed-view');
    this.div.append(this.view_div);
  }

  this.resize = function(event) {
    this.protein_div.width(this.div.outerWidth());
    var new_height = this.div.outerHeight()
        - this.header_div.outerHeight()
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

  this.init = function(params) {
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
    this.controller = new Controller(this.scene)

    this.create_header_div();
    this.create_protein_div();
    this.create_status_div();
    this.create_view_div();

    this.protein_display = new GlProteinDisplay(
      this.scene, '#jolecule-protein-display', this.controller);

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
        _this.residue_selector.val(_this.scene.current_view.res_id);
      }
    }

    this.data_server.get_protein_data(
        load_protein_data, load_failure);
  }

  this.init(params);
}


export {
  EmbedJolecule
}