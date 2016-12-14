import scrollTo from "jquery.scrollto";
import $ from "jquery";
import _ from "lodash";
import { EmbedJolecule } from "./embedjolecule";
import {
    url,
    link_button,
    ViewPiece,
    trim,
    do_nothing,
    random_id,
} from "./util";


//////////////////////////////////////////////////////////
// 
// jolecule - the javascript based protein/dna viewer
//
// relies on data_server jolecule.appspot.com, which, in turn
// relies on the RCSB website http://www.pdb.org.
//
///////////////////////////////////////////////////////////


/////////////////////////////////////
// SequenceDisplay
/////////////////////////////////////

var SequenceDisplay = function(div_tag, controller) {
  this.controller = controller;
  this.scene = controller.scene;
  this.protein = controller.scene.protein;
  this.res_div = [];

  this.redraw = function() {
    for (var i=0; i<this.res_div.length; i+=1) {
      var res_id = this.protein.residues[i].id;
      if (res_id == this.scene.current_view.res_id) {
        this.res_div[i].target.removeClass("jolecule-unselected-box");
        this.res_div[i].target.addClass("jolecule-selected-box");
        $('#jolecule-sequence').stop();
        $('#jolecule-sequence').scrollTo(
          this.res_div[i].target, 1000, {offset:{top:-80}});
      } else {
        this.res_div[i].target.removeClass("jolecule-selected-box");
        this.res_div[i].target.addClass("jolecule-unselected-box");
      }
    }
    for (var i=0; i<this.protein.residues.length; i+=1) {
      if (this.protein.residues[i].selected) {
        this.res_div[i].select.prop('checked', true);
      } else {
        this.res_div[i].select.prop('checked', false);
      }
    }
  }
  
  this.goto_prev_residue = function() {
    this.controller.set_target_prev_residue();
    window.location.hash = this.scene.target_view.res_id;
  }

  this.goto_next_residue = function() {
    this.controller.set_target_next_residue();
    window.location.hash = this.scene.target_view.res_id;
  }

  function html_pad(s, n_padded) {
    var trim_s = trim(s)
    var n = (n_padded - trim_s.length);
    var padded_s = trim_s;
    for (var k=0; k<n; k++) {
      padded_s += '&nbsp;';
    }
    return padded_s;
  }
  
  this.set_residue_select = function(res_id, v) {
    var i = this.protein.get_i_res_from_res_id(res_id);
    this.controller.select_residue(i, v);
  }
  
  this.toggle_residue_select = function(res_id) {
    var r = this.protein.res_by_id[res_id]
    this.set_residue_select(res_id, !r.selected);
  }

  this.create_residue_div = function(i) {
    var controller = this.controller;
    var _this = this;
    var res_id = this.protein.residues[i].id;
    var res_type = this.protein.residues[i].type;
    var html = "&nbsp;" + html_pad(res_id, 7) + html_pad(res_type, 3) + "&nbsp;"
    var show_res_id = res_id + ":show";
    var checkbox = $("<input>")
        .attr('type', 'checkbox')
        .attr('id', show_res_id)
        .attr('name', show_res_id)
        .attr('checked', false)
        .click( 
            function(event) {
              var check_id = 'input[name="' + show_res_id + '"' + ']';
              var v = $(check_id).is(':checked');
              _this.set_residue_select(res_id, v);
            });
    var elem = $("<div>")
        .addClass("jolecule-residue")
        .append(checkbox)
        .append(
          $("<a>")
            .addClass('jolecule-button')
            .attr("href", "#" + res_id)
            .html(html)
            .click(
              function() { 
                controller.set_target_view_by_res_id(res_id);
                _this.redraw();
            }))
        .append("<br>")
    return { 'target':elem, 'select':checkbox };
  }
  
  this.build_divs = function() {
    var sequence_div = $("#jolecule-sequence");
    for (var i=0; i<this.protein.residues.length; i+=1) {
      var elem = this.create_residue_div(i);
      sequence_div.append(elem.target);
      this.res_div.push(elem);
    }
    
    this.scene.current_view.res_id = this.protein.residues[0].id;
    var hash_tag = url().split('#')[1];
    if (hash_tag in this.protein.res_by_id) {
      this.controller.set_target_view_by_res_id(hash_tag);
    }
    this.redraw();
  }

  var _this = this;
  this.div = $(div_tag)
    .append(
      $("<div>")
        .addClass('jolecule-sub-header')
        .append("RESIDUES")
        .append("<br>")
        .append(
          link_button(
            "", 'prev[k]', 'jolecule-button', 
           function() { _this.goto_prev_residue(); })
        )    
        .append(
          link_button(
            "", 'next[j]', 'jolecule-button', 
            function() { _this.goto_next_residue(); }))
        )
    .append(
      $("<div>")
        .attr("id", 'jolecule-sequence')
    );
}


///////////////////////////////////////////////
// ViewsDisplay keeps track of the views
///////////////////////////////////////////////


var ViewsDisplay = function(div_tag, controller, protein_display, data_server) {
  this.div_tag = div_tag;
  this.protein_display = protein_display;
  this.scene = controller.scene;
  this.controller = controller;
  this.data_server = data_server;
  this.view_piece = {}; 
  
  this.save_views_to_server = function(success) {
    this.data_server.save_views(
      this.controller.get_view_dicts(), success);
  }

  this.update_views = function() {
    for (var id in this.view_piece) {
      if (!(id in this.scene.saved_views_by_id)) {
        this.view_piece[id].div.remove();
        delete this.view_piece[id];
      }
    }
    for (var i=0; i<this.scene.saved_views.length; i++) {
      var view = this.scene.saved_views[i];
      var id = view.id;

      if (!(view.id in this.view_piece)) {
        this.insert_new_view_div(view.id);
      }

      var i_last_view = this.scene.i_last_view
      var last_id = this.scene.saved_views[i_last_view].id;

      if (last_id == id) {
        this.view_piece[id].div.removeClass("jolecule-unselected-box");
        this.view_piece[id].div.addClass("jolecule-selected-box");
      } else {
        this.view_piece[id].div.removeClass("jolecule-selected-box");
        this.view_piece[id].div.addClass("jolecule-unselected-box");
      }

      var view_piece = this.view_piece[id];
      if (view.text != view_piece.show_text_div.html()) {
        view_piece.show_text_div.html(view.text);
      }

      var a = view_piece.div.find('a').eq(0);
      a.text(view.order + 1);
    }
  }

  this.redraw_selected_view_id = function(id) {
    this.update_views();
    $("#jolecule-views").stop();
    $("#jolecule-views").scrollTo(
      this.view_piece[id].div, 1000, {offset:{top:-80}});
  }
  
  this.set_target_by_view_id = function(id) {
    this.controller.set_target_view_by_id(id);
    this.redraw_selected_view_id(id);
    window.location.hash = id;
  }
  
  this.goto_prev_view = function() {
    var id = this.controller.set_target_prev_view();
    this.redraw_selected_view_id(id);
    window.location.hash = id;
  }
  
  this.goto_next_view = function() {
    var id = this.controller.set_target_next_view();
    this.redraw_selected_view_id(id);
    window.location.hash = id;
  }

  this.remove_view = function(id) {
    var _this = this;
    var success = function() {
      _this.controller.delete_view(id);
      _this.view_piece[id].div.remove();
      delete _this.view_piece[id];
      _this.update_views();
    }
    this.view_piece[id].div.css('background-color', 'lightgray')
    this.data_server.delete_protein_view(id, success);
  }

  this.swap_views = function(i, j) {
    var i_id = this.scene.saved_views[i].id;
    var j_id = this.scene.saved_views[j].id;
    var i_div = this.view_piece[i_id].div;
    var j_div = this.view_piece[j_id].div;

    this.controller.swap_views(i, j);

    i_div.css('background-color', 'lightgray')
    j_div.css('background-color', 'lightgray')

    var _this = this
    var success = function() {
      j_div.insertBefore(i_div);
      _this.update_views();
      i_div.css('background-color', '')
      j_div.css('background-color', '')
    }
    this.save_views_to_server(success);
  }

  this.swap_up = function(view_id) {
    var i = this.scene.get_i_saved_view_from_id(view_id);
    if (i < 2) {
      return;
    }
    this.swap_views(i-1, i);
  }

  this.swap_down = function(view_id) {
    var i = this.scene.get_i_saved_view_from_id(view_id);
    if (i > this.scene.saved_views.length-2) {
      return;
    }
    this.swap_views(i, i+1);
  }

  this.make_view_div = function(id) {
    var view = this.scene.saved_views_by_id[id];
    var _this = this;

    this.view_piece[id] = new ViewPiece({
      view: view,
      is_editable: true,
      delete_view: function() { 
        _this.remove_view(id);
      },
      save_change: function(changed_text, sucess) { 
        view.text = changed_text;
        _this.view_piece[id].div.css('background-color', 'lightgray');
        var success = function() {
          _this.view_piece[id].div.css('background-color', '');
        }
        _this.save_views_to_server(success);
        _this.scene.changed = true;
      },
      pick: function() { _this.set_target_by_view_id(id); },
      goto: view.order+1, 
      swap_up: function() { _this.swap_up(id) },
      swap_down: function() { _this.swap_down(id) },
      embed_view: function() {
        window.location.href = '/embed/pdb?pdb_id=' + view.pdb_id + '&view=' + view.id;
      },
    });
    return this.view_piece[id].div;
  }

  this.make_all_views = function() {
    for (var i=0; i<this.scene.saved_views.length; i+=1) {
      var id = this.scene.saved_views[i].id;
      var div = this.make_view_div(id);
      $('#jolecule-views').append(div);
    }
  }

  this.insert_new_view_div = function(new_id) {
    var div = this.make_view_div(new_id);

    if (this.scene.i_last_view == this.scene.saved_views.length-1) {
      $("#jolecule-views").append(div);
    } else {
      var j = this.scene.i_last_view-1;
      var j_id = this.scene.saved_views[j].id;
      var j_div = this.view_piece[j_id].div;
      div.insertAfter(j_div);
    }
  }

  this.make_new_view = function() {
    var new_id = random_id();
    this.controller.calculate_current_abs_camera();
    this.controller.save_current_view(new_id);
    this.insert_new_view_div(new_id);
    this.update_views();
    this.view_piece[new_id].div.css('background-color', 'lightgray');

    var _this = this;
    var success = function() {
      _this.view_piece[new_id].div.css('background-color', '');
      $("#jolecule-views").stop();
      $("#jolecule-views").scrollTo(
        _this.view_piece[new_id].div, 
        1000, 
        {offset:{top:-80}});
    }
    this.save_views_to_server(success);
  }

  var _this = this;
  this.top_div = $(this.div_tag)
    .append(
      $("<div>")
        .addClass("jolecule-sub-header")
        .append("VIEWS OF PROTEIN")
        .append("<br>")
        .append(
          link_button(
            '', 'create [v]iew', 'jolecule-button', 
            function() { _this.make_new_view(); }))
        .append(
          link_button(
            '', 'prev[&uarr;]', 'jolecule-button', 
            function() { _this.goto_prev_view(); }))
        .append(
          link_button(
            '', 'next[&darr;]', 'jolecule-button', 
            function() { _this.goto_next_view(); }))
        .append(
          link_button(
            '', '[a]dd label', 'jolecule-button',
            function() { _this.protein_display.atom_label_dialog(); }
          ))
    )
    .append(
      $("<div>")
        .attr("id", "jolecule-views")
    );
}


/////////////////////////////////////
// FullPageJolecule
/////////////////////////////////////

var FullPageJolecule = function(
  protein_display_tag, 
  sequence_display_tag,
  views_display_tag,
  data_server, 
  pdb_id) {

  this.is_changed = function() { 
    if (typeof this.scene !== "undefined") {
      return this.scene.changed; 
    }
    return false;
  };

  this.draw = function() {
    if (this.scene.changed) {
      this.views_display.update_views();
      if (this.scene.is_new_view_chosen) {
        this.sequence_display.redraw();
        this.scene.is_new_view_chosen = false;
      }
      this.embed_jolecule.draw();
      this.scene.changed = false;
    }
  }

  this.animate = function() {
    if (typeof this.embed_jolecule !== "undefined") {
      this.embed_jolecule.animate();
    }
  }
  
  this.resize = function(event) {
    if (typeof this.scene !== "undefined") {
      this.scene.changed = true;
    }
  }

  this.onkeydown = function(event) {
    if (!window.keyboard_lock) {
      var c = String.fromCharCode(event.keyCode).toUpperCase();
      var s = "[" + c + "]";
      if (c == 'V') {
        this.views_display.make_new_view();
        return;
      } else if ((c == "K") || (event.keyCode == 37)) {
        this.sequence_display.goto_prev_residue();
      } else if ((c == "J") || (event.keyCode == 39)) {
        this.sequence_display.goto_next_residue();
      } else if (c == "X") {
        var i_atom = this.scene.current_view.i_atom;
        if (i_atom >= 0) {
          var res_id = this.controller.protein.atoms[i_atom].res_id;
          this.sequence_display.toggle_residue_select(res_id);
        }
      } else if (event.keyCode == 38) {
        this.views_display.goto_prev_view();
      } else if (c == " " || event.keyCode == 40) {
        this.views_display.goto_next_view();
      } else if (c == 'B') {
        if (this.scene.current_view.show.all_atom) {
          this.controller.set_backbone_option('ribbon');
        } else if (this.scene.current_view.show.ribbon) {
          this.controller.set_backbone_option('trace');
        } else if (this.scene.current_view.show.trace){
          this.controller.set_backbone_option('all_atom');
        }
      } else if (c == 'L') {
        this.controller.toggle_show_option('ligands');
      } else if (c == 'S') {
        this.controller.toggle_show_option('sidechain');
      } else if (c == 'W') {
        this.controller.toggle_show_option('water');
      // } else if (c == 'H') {
      //   this.controller.toggle_show_option('hydrogen');
      } else if (c == 'C') {
        this.protein_display.controller.clear_selected();
      } else if (c == 'E') {
        var i_view = this.protein_display.scene.i_last_view;
        if (i_view > 0) {
          var view_id = this.protein_display.scene.saved_views[i_view].id;
          this.views_display.div[view_id].edit_fn();
        }
      } else if (c == 'N') {
        this.protein_display.controller.toggle_neighbors();
      } else if (c == 'A') {
        this.protein_display.atom_label_dialog();
      } else {
        var i = parseInt(c)-1;
        if ((i || i==0) && (i<this.scene.saved_views.length)) {
          var id = this.scene.saved_views[i].id;
          this.views_display.set_target_by_view_id(id);
        }
      }
      this.protein_display.scene.changed = true;
    }
  }

  this.register_callacks = function() {
    var _this = this;

    document.oncontextmenu = do_nothing;
    document.onkeydown = function(e) { _this.onkeydown(e); }
    var resize_fn = function() { 
      _this.resize(); 
    }
    $(window).resize(resize_fn);
    window.onorientationchange = resize_fn;
  }

  this.onload = function(embed_jolecule) {
    this.embed_jolecule = embed_jolecule;

    this.data_server = embed_jolecule.data_server;
    this.scene = this.embed_jolecule.scene;
    this.controller = this.embed_jolecule.controller;
    this.protein_display = this.embed_jolecule.protein_display;

    // add decorators to DOM and data

    this.views_display_tag = views_display_tag;
    this.views_display = new ViewsDisplay(
        this.views_display_tag,
        this.controller, 
        this.protein_display,
        this.data_server);
    this.views_display.make_all_views();

    this.sequence_display_tag = sequence_display_tag;
    this.sequence_display = new SequenceDisplay(
        this.sequence_display_tag, this.controller);
    this.sequence_display.build_divs();

    var hash_tag = url().split('#')[1];
    if (hash_tag in this.scene.saved_views_by_id) {
      this.views_display.set_target_by_view_id(hash_tag);
    } else {
      this.views_display.set_target_by_view_id('view:000000');
    }
    this.views_display.update_views();

    this.register_callacks();
    this.resize();
    this.embed_jolecule.resize();
  }

  // Initialization

  var _this = this;
  var onload = function(instantiated_embed_jolecule) { 
      _this.onload(instantiated_embed_jolecule); 
  };

  new EmbedJolecule({
    div_tag: protein_display_tag, 
    data_server: data_server,
    loading_html: 'Loading PDB from RCSB web-site...', 
    loading_failure_html: 'Failed to load PDB.', 
    view_id: '',  
    view_height: 170, 
    is_view_text_shown: false,
    is_editable: true,
    is_loop: false,
    onload: onload,
  });

}


export { FullPageJolecule }



