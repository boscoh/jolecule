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


/**
 * fullPageJolecule - the javascript based protein/dna viewer
 **/


function html_pad(s, n_padded) {
  let trim_s = trim(s)
  let n = (n_padded - trim_s.length);
  let padded_s = trim_s;
  for (let k=0; k<n; k++) {
    padded_s += '&nbsp;';
  }
  return padded_s;
}


/**
 * SequenceDisplay
 **/

class SequenceDisplay {

  constructor(div_tag, controller) {
    this.controller = controller;
    this.scene = controller.scene;
    this.protein = controller.scene.protein;
    this.res_div = [];
    this.div = $(div_tag)
      .append(
        $("<div>")
          .addClass('jolecule-sub-header')
          .append("RESIDUES")
          .append("<br>")
          .append(
            link_button(
              "", 'prev[k]', 'jolecule-button',
              () => this.goto_prev_residue())
          )
          .append(
            link_button(
              "", 'next[j]', 'jolecule-button',
              () => this.goto_next_residue())
          )
      )
      .append(
        $("<div>")
          .attr("id", 'jolecule-sequence')
      );
  }

  redraw() {
    for (let i = 0; i < this.res_div.length; i += 1) {
      let res_id = this.protein.residues[i].id;
      if (res_id == this.scene.current_view.res_id) {
        this.res_div[i].target.removeClass("jolecule-unselected-box");
        this.res_div[i].target.addClass("jolecule-selected-box");
        $('#jolecule-sequence')
          .stop()
          .scrollTo(
            this.res_div[i].target, 1000, {offset: {top: -80}});
      } else {
        this.res_div[i].target.removeClass("jolecule-selected-box");
        this.res_div[i].target.addClass("jolecule-unselected-box");
      }
    }
    for (let i = 0; i < this.protein.residues.length; i += 1) {
      if (this.protein.residues[i].selected) {
        this.res_div[i].select.prop('checked', true);
      } else {
        this.res_div[i].select.prop('checked', false);
      }
    }
  }

  goto_prev_residue() {
    this.controller.set_target_prev_residue();
    window.location.hash = this.scene.target_view.res_id;
  }

  goto_next_residue() {
    this.controller.set_target_next_residue();
    window.location.hash = this.scene.target_view.res_id;
  }

  set_residue_select(res_id, v) {
    let i = this.protein.get_i_res_from_res_id(res_id);
    this.controller.select_residue(i, v);
  }
  
  toggle_residue_select(res_id) {
    let r = this.protein.res_by_id[res_id]
    this.set_residue_select(res_id, !r.selected);
  }

  create_residue_div(i) {
    let controller = this.controller;
    let _this = this;
    let res_id = this.protein.residues[i].id;
    let res_type = this.protein.residues[i].type;
    let html = "&nbsp;" + html_pad(res_id, 7) + html_pad(res_type, 3) + "&nbsp;"
    let show_res_id = res_id + ":show";
    let checkbox = $("<input>")
        .attr('type', 'checkbox')
        .attr('id', show_res_id)
        .attr('name', show_res_id)
        .attr('checked', false)
        .click( 
            function(event) {
              let check_id = 'input[name="' + show_res_id + '"' + ']';
              let v = $(check_id).is(':checked');
              _this.set_residue_select(res_id, v);
            });
    let elem = $("<div>")
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
  
  build_divs() {
    let sequence_div = $("#jolecule-sequence");
    for (let i=0; i<this.protein.residues.length; i+=1) {
      let elem = this.create_residue_div(i);
      sequence_div.append(elem.target);
      this.res_div.push(elem);
    }
    
    this.scene.current_view.res_id = this.protein.residues[0].id;
    let hash_tag = url().split('#')[1];
    if (hash_tag in this.protein.res_by_id) {
      this.controller.set_target_view_by_res_id(hash_tag);
    }
    this.redraw();
  }

}


/**
 * ViewsDisplay keeps track of the views
 **/

class ViewsDisplay {

  constructor(div_tag, controller, protein_display, data_server) {
    this.div_tag = div_tag;
    this.protein_display = protein_display;
    this.scene = controller.scene;
    this.controller = controller;
    this.data_server = data_server;
    this.view_piece = {};
    this.top_div = $(this.div_tag)
      .append(
        $("<div>")
          .addClass("jolecule-sub-header")
          .append("VIEWS OF PROTEIN")
          .append("<br>")
          .append(
            link_button(
              '', 'create [v]iew', 'jolecule-button',
              () => { this.make_new_view(); }))
          .append(
            link_button(
              '', 'prev[&uarr;]', 'jolecule-button',
              () => { this.goto_prev_view(); }))
          .append(
            link_button(
              '', 'next[&darr;]', 'jolecule-button',
              () => { this.goto_next_view(); }))
          .append(
            link_button(
              '', '[a]dd label', 'jolecule-button',
              () => { this.protein_display.atom_label_dialog(); }
            ))
      )
      .append(
        $("<div>")
          .attr("id", "jolecule-views")
      );
  }
  
  save_views_to_server(success) {
    this.data_server.save_views(
      this.controller.get_view_dicts(), success);
  }

  update_views() {
    for (let id in this.view_piece) {
      if (!(id in this.scene.saved_views_by_id)) {
        this.view_piece[id].div.remove();
        delete this.view_piece[id];
      }
    }
    for (let i=0; i<this.scene.saved_views.length; i++) {
      let view = this.scene.saved_views[i];
      let id = view.id;

      if (!(view.id in this.view_piece)) {
        this.insert_new_view_div(view.id);
      }

      let i_last_view = this.scene.i_last_view
      let last_id = this.scene.saved_views[i_last_view].id;

      if (last_id == id) {
        this.view_piece[id].div.removeClass("jolecule-unselected-box");
        this.view_piece[id].div.addClass("jolecule-selected-box");
      } else {
        this.view_piece[id].div.removeClass("jolecule-selected-box");
        this.view_piece[id].div.addClass("jolecule-unselected-box");
      }

      let view_piece = this.view_piece[id];
      if (view.text != view_piece.show_text_div.html()) {
        view_piece.show_text_div.html(view.text);
      }

      let a = view_piece.div.find('a').eq(0);
      a.text(view.order + 1);
    }
  }

  redraw_selected_view_id(id) {
    this.update_views();
    $("#jolecule-views")
      .stop()
      .scrollTo(
        this.view_piece[id].div, 1000, {offset:{top:-80}});
  }
  
  set_target_by_view_id(id) {
    this.controller.set_target_view_by_id(id);
    this.redraw_selected_view_id(id);
    window.location.hash = id;
  }
  
  goto_prev_view() {
    let id = this.controller.set_target_prev_view();
    this.redraw_selected_view_id(id);
    window.location.hash = id;
  }
  
  goto_next_view() {
    let id = this.controller.set_target_next_view();
    this.redraw_selected_view_id(id);
    window.location.hash = id;
  }

  remove_view(id) {
    this.view_piece[id].div.css('background-color', 'lightgray')
    this.data_server.delete_protein_view(id, () => {
      this.controller.delete_view(id);
      this.view_piece[id].div.remove();
      delete this.view_piece[id];
      this.update_views();
    });
  }

  swap_views(i, j) {
    let i_id = this.scene.saved_views[i].id;
    let j_id = this.scene.saved_views[j].id;
    let i_div = this.view_piece[i_id].div;
    let j_div = this.view_piece[j_id].div;

    this.controller.swap_views(i, j);

    i_div.css('background-color', 'lightgray')
    j_div.css('background-color', 'lightgray')

    this.save_views_to_server(() => {
      j_div.insertBefore(i_div);
      this.update_views();
      i_div.css('background-color', '')
      j_div.css('background-color', '')
    });
  }

  swap_up(view_id) {
    let i = this.scene.get_i_saved_view_from_id(view_id);
    if (i < 2) {
      return;
    }
    this.swap_views(i-1, i);
  }

  swap_down(view_id) {
    let i = this.scene.get_i_saved_view_from_id(view_id);
    if (i > this.scene.saved_views.length-2) {
      return;
    }
    this.swap_views(i, i+1);
  }

  make_view_div(id) {
    let view = this.scene.saved_views_by_id[id];
    this.view_piece[id] = new ViewPiece({
      view: view,
      is_editable: true,
      delete_view: () => { this.remove_view(id); },
      save_change: (changed_text, sucess) => {
        view.text = changed_text;
        this.view_piece[id].div.css('background-color', 'lightgray');
        this.save_views_to_server(() => {
          this.view_piece[id].div.css('background-color', '');
        });
        this.scene.changed = true;
      },
      pick: () => { this.set_target_by_view_id(id); },
      goto: view.order+1, 
      swap_up: () => { this.swap_up(id) },
      swap_down: () => { this.swap_down(id) },
      embed_view: () => {
        window.location.href = '/embed/pdb?pdb_id=' + view.pdb_id + '&view=' + view.id;
      },
    });
    return this.view_piece[id].div;
  }

  make_all_views() {
    for (let i=0; i<this.scene.saved_views.length; i+=1) {
      let id = this.scene.saved_views[i].id;
      let div = this.make_view_div(id);
      $('#jolecule-views').append(div);
    }
  }

  insert_new_view_div(new_id) {
    let div = this.make_view_div(new_id);

    if (this.scene.i_last_view == this.scene.saved_views.length-1) {
      $("#jolecule-views").append(div);
    } else {
      let j = this.scene.i_last_view-1;
      let j_id = this.scene.saved_views[j].id;
      let j_div = this.view_piece[j_id].div;
      div.insertAfter(j_div);
    }
  }

  make_new_view() {
    let new_id = random_id();
    this.controller.calculate_current_abs_camera();
    this.controller.save_current_view(new_id);
    this.insert_new_view_div(new_id);
    this.update_views();
    this.view_piece[new_id].div.css('background-color', 'lightgray');
    this.save_views_to_server(() => {
      this.view_piece[new_id].div.css('background-color', '');
      $("#jolecule-views").stop();
      $("#jolecule-views").scrollTo(
        this.view_piece[new_id].div,
        1000,
        {offset:{top:-80}});
    });
  }

}


/**
 * FullPageJolecule
 **/

class FullPageJolecule {

  constructor(
      protein_display_tag,
      sequence_display_tag,
      views_display_tag,
      data_server,
      pdb_id) {

    this.views_display_tag = views_display_tag;
    this.sequence_display_tag = sequence_display_tag;
    this.data_server = data_server;

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
      onload: (embed_jolecule) => {
        this.embed_jolecule = embed_jolecule;
        this.scene = this.embed_jolecule.scene;
        this.controller = this.embed_jolecule.controller;
        this.protein_display = this.embed_jolecule.protein_display;
        this.post_data_load();
      }
    });
  }

  post_data_load() {

    this.views_display = new ViewsDisplay(
      this.views_display_tag,
      this.controller,
      this.protein_display,
      this.data_server);

    this.views_display.make_all_views();

    this.sequence_display = new SequenceDisplay(
      this.sequence_display_tag, this.controller);
    this.sequence_display.build_divs();

    let hash_tag = url().split('#')[1];
    if (hash_tag in this.scene.saved_views_by_id) {
      this.views_display.set_target_by_view_id(hash_tag);
    } else {
      this.views_display.set_target_by_view_id('view:000000');
    }
    this.views_display.update_views();

    document.oncontextmenu = do_nothing;

    document.onkeydown = (e) => this.onkeydown(e);

    let resize_fn = () => this.resize();
    $(window).resize(resize_fn);
    window.onorientationchange = resize_fn;
    resize_fn();
  }

  is_changed() {
    if (typeof this.scene !== "undefined") {
      return this.scene.changed; 
    }
    return false;
  };

  draw() {
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

  animate() {
    if (typeof this.embed_jolecule !== "undefined") {
      this.embed_jolecule.animate();
    }
  }
  
  resize(event) {
    if (typeof this.scene !== "undefined") {
      this.scene.changed = true;
    }
    if (typeof this.embed_jolecule !== "undefined") {
      this.embed_jolecule.resize();
    }
  }

  onkeydown(event) {
    if (!window.keyboard_lock) {
      let c = String.fromCharCode(event.keyCode).toUpperCase();
      let s = "[" + c + "]";
      if (c == 'V') {
        this.views_display.make_new_view();
        return;
      } else if ((c == "K") || (event.keyCode == 37)) {
        this.sequence_display.goto_prev_residue();
      } else if ((c == "J") || (event.keyCode == 39)) {
        this.sequence_display.goto_next_residue();
      } else if (c == "X") {
        let i_atom = this.scene.current_view.i_atom;
        if (i_atom >= 0) {
          let res_id = this.controller.protein.atoms[i_atom].res_id;
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
        let i_view = this.protein_display.scene.i_last_view;
        if (i_view > 0) {
          let view_id = this.protein_display.scene.saved_views[i_view].id;
          this.views_display.div[view_id].edit_fn();
        }
      } else if (c == 'N') {
        this.protein_display.controller.toggle_neighbors();
      } else if (c == 'A') {
        this.protein_display.atom_label_dialog();
      } else {
        let i = parseInt(c)-1;
        if ((i || i==0) && (i<this.scene.saved_views.length)) {
          let id = this.scene.saved_views[i].id;
          this.views_display.set_target_by_view_id(id);
        }
      }
      this.protein_display.scene.changed = true;
    }
  }

}


export { FullPageJolecule }



