import scrollTo from "jquery.scrollto";
import $ from "jquery";
import _ from "lodash";
import { EmbedJolecule } from "./embedjolecule";
import {
    url,
    link_button,
    ViewPiece,
    trim,
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
 * SequenceDisplay creates a vertical list of clickable links
 * to the residues in a protein, does not yet respond to
 * progressive data load
 **/

class SequenceDisplay {

  constructor(divTag, controller) {
    this.controller = controller;
    this.scene = controller.scene;
    this.protein = controller.scene.protein;
    this.resDiv = [];
    this.div = $(divTag)
      .append(
        $("<div>")
          .addClass('jolecule-sub-header')
          .append("RESIDUES")
          .append("<br>")
          .append(
            link_button(
              "", 'prev[k]', 'jolecule-button', () => this.gotoPrevResidue())
          )
          .append(
            link_button(
              "", 'next[j]', 'jolecule-button', () => this.gotoNextResidue())
          )
      )
      .append(
        $("<div>")
          .attr("id", 'jolecule-sequence')
      );
  }

  redraw() {
    for (let i = 0; i < this.resDiv.length; i += 1) {
      let resId = this.protein.residues[i].id;
      if (resId == this.scene.current_view.res_id) {
        this.resDiv[i].target.removeClass("jolecule-unselected-box");
        this.resDiv[i].target.addClass("jolecule-selected-box");
        $('#jolecule-sequence')
          .stop()
          .scrollTo(
            this.resDiv[i].target, 1000, {offset: {top: -80}});
      } else {
        this.resDiv[i].target.removeClass("jolecule-selected-box");
        this.resDiv[i].target.addClass("jolecule-unselected-box");
      }
    }
    for (let i = 0; i < this.protein.residues.length; i += 1) {
      if (this.protein.residues[i].selected) {
        this.resDiv[i].select.prop('checked', true);
      } else {
        this.resDiv[i].select.prop('checked', false);
      }
    }
  }

  gotoPrevResidue() {
    this.controller.set_target_prev_residue();
    window.location.hash = this.scene.target_view.res_id;
  }

  gotoNextResidue() {
    this.controller.set_target_next_residue();
    window.location.hash = this.scene.target_view.res_id;
  }

  setResidueSelect(res_id, v) {
    let i = this.protein.get_i_res_from_res_id(res_id);
    this.controller.select_residue(i, v);
  }
  
  toggleResidueSelect(res_id) {
    let r = this.protein.res_by_id[res_id]
    this.setResidueSelect(res_id, !r.selected);
  }

  createResidueDiv(i) {
    let controller = this.controller;
    let resId = this.protein.residues[i].id;
    let resType = this.protein.residues[i].type;
    let html = "&nbsp;" + html_pad(resId, 7) + html_pad(resType, 3) + "&nbsp;"
    let showResId = resId + ":show";
    let checkbox = $("<input>")
        .attr('type', 'checkbox')
        .attr('id', showResId)
        .attr('name', showResId)
        .attr('checked', false)
        .click( 
            (event) => {
              let check_id = 'input[name="' + showResId + '"' + ']';
              let v = $(check_id).is(':checked');
              this.setResidueSelect(resId, v);
            });
    let elem = $("<div>")
        .addClass("jolecule-residue")
        .append(checkbox)
        .append(
          $("<a>")
            .addClass('jolecule-button')
            .attr("href", "#" + resId)
            .html(html)
            .click(
              () => {
                controller.set_target_view_by_res_id(resId);
                this.redraw();
            }))
        .append("<br>")
    return { 'target':elem, 'select':checkbox };
  }
  
  buildDivs() {
    let sequenceDiv = $("#jolecule-sequence");
    sequenceDiv.clear();
    for (let i=0; i<this.protein.residues.length; i+=1) {
      let elem = this.createResidueDiv(i);
      sequenceDiv.append(elem.target);
      this.resDiv.push(elem);
    }
    
    this.scene.current_view.res_id = this.protein.residues[0].id;
    let hashTag = url().split('#')[1];
    if (hashTag in this.protein.res_by_id) {
      this.controller.set_target_view_by_res_id(hashTag);
    }
    this.redraw();
  }

}


/**
 * ViewsDisplay keeps track of the views
 **/

class ViewsDisplay {

  constructor(divTag, controller, proteinDisplay, data_server) {
    this.divTag = divTag;
    this.proteinDisplay = proteinDisplay;
    this.scene = controller.scene;
    this.controller = controller;
    this.data_server = data_server;
    this.viewPiece = {};
    this.topDiv = $(this.divTag)
      .append(
        $("<div>")
          .addClass("jolecule-sub-header")
          .append("VIEWS OF PROTEIN")
          .append("<br>")
          .append(
            link_button(
              '', 'create [v]iew', 'jolecule-button',
              () => { this.makeNewView(); }))
          .append(
            link_button(
              '', 'prev[&uarr;]', 'jolecule-button',
              () => { this.gotoPrevView(); }))
          .append(
            link_button(
              '', 'next[&darr;]', 'jolecule-button',
              () => { this.gotoNextView(); }))
          .append(
            link_button(
              '', '[a]dd label', 'jolecule-button',
              () => { this.proteinDisplay.atom_label_dialog(); }
            ))
      )
      .append(
        $("<div>")
          .attr("id", "jolecule-views")
      );
  }
  
  saveViewsToDataServer(success) {
    this.data_server.save_views(
      this.controller.get_view_dicts(), success);
  }

  updateViews() {
    for (let id in this.viewPiece) {
      if (!(id in this.scene.saved_views_by_id)) {
        this.viewPiece[id].div.remove();
        delete this.viewPiece[id];
      }
    }
    for (let i=0; i<this.scene.saved_views.length; i++) {
      let view = this.scene.saved_views[i];
      let id = view.id;

      if (!(view.id in this.viewPiece)) {
        this.insertNewViewDiv(view.id);
      }

      let i_last_view = this.scene.i_last_view
      let last_id = this.scene.saved_views[i_last_view].id;

      if (last_id == id) {
        this.viewPiece[id].div.removeClass("jolecule-unselected-box");
        this.viewPiece[id].div.addClass("jolecule-selected-box");
      } else {
        this.viewPiece[id].div.removeClass("jolecule-selected-box");
        this.viewPiece[id].div.addClass("jolecule-unselected-box");
      }

      let viewPiece = this.viewPiece[id];
      if (view.text != viewPiece.show_text_div.html()) {
        viewPiece.show_text_div.html(view.text);
      }

      let a = viewPiece.div.find('a').eq(0);
      a.text(view.order + 1);
    }
  }

  redrawSelectedViewId(id) {
    this.updateViews();
    $("#jolecule-views")
      .stop()
      .scrollTo(
        this.viewPiece[id].div, 1000, {offset:{top:-80}});
  }
  
  setTargetByViewId(id) {
    this.controller.set_target_view_by_id(id);
    this.redrawSelectedViewId(id);
    window.location.hash = id;
  }
  
  gotoPrevView() {
    let id = this.controller.set_target_prev_view();
    this.redrawSelectedViewId(id);
    window.location.hash = id;
  }
  
  gotoNextView() {
    let id = this.controller.set_target_next_view();
    this.redrawSelectedViewId(id);
    window.location.hash = id;
  }

  removeView(id) {
    this.viewPiece[id].div.css('background-color', 'lightgray')
    this.data_server.delete_protein_view(id, () => {
      this.controller.delete_view(id);
      this.viewPiece[id].div.remove();
      delete this.viewPiece[id];
      this.updateViews();
    });
  }

  swapViews(i, j) {
    let i_id = this.scene.saved_views[i].id;
    let j_id = this.scene.saved_views[j].id;
    let i_div = this.viewPiece[i_id].div;
    let j_div = this.viewPiece[j_id].div;

    this.controller.swapViews(i, j);

    i_div.css('background-color', 'lightgray')
    j_div.css('background-color', 'lightgray')

    this.saveViewsToDataServer(() => {
      j_div.insertBefore(i_div);
      this.updateViews();
      i_div.css('background-color', '')
      j_div.css('background-color', '')
    });
  }

  swapUp(view_id) {
    let i = this.scene.get_i_saved_view_from_id(view_id);
    if (i < 2) {
      return;
    }
    this.swapViews(i-1, i);
  }

  swapDown(view_id) {
    let i = this.scene.get_i_saved_view_from_id(view_id);
    if (i > this.scene.saved_views.length-2) {
      return;
    }
    this.swapViews(i, i+1);
  }

  makeViewDiv(id) {
    let view = this.scene.saved_views_by_id[id];
    this.viewPiece[id] = new ViewPiece({
      view: view,
      isEditable: true,
      delete_view: () => { this.removeView(id); },
      save_change: (changed_text, sucess) => {
        view.text = changed_text;
        this.viewPiece[id].div.css('background-color', 'lightgray');
        this.saveViewsToDataServer(() => {
          this.viewPiece[id].div.css('background-color', '');
        });
        this.scene.changed = true;
      },
      pick: () => { this.setTargetByViewId(id); },
      goto: view.order+1, 
      swapUp: () => { this.swapUp(id) },
      swapDown: () => { this.swapDown(id) },
      embed_view: () => {
        window.location.href = '/embed/pdb?pdb_id=' + view.pdb_id + '&view=' + view.id;
      },
    });
    return this.viewPiece[id].div;
  }

  makeAllViews() {
    for (let i=0; i<this.scene.saved_views.length; i+=1) {
      let id = this.scene.saved_views[i].id;
      let div = this.makeViewDiv(id);
      $('#jolecule-views').append(div);
    }
  }

  insertNewViewDiv(new_id) {
    let div = this.makeViewDiv(new_id);

    if (this.scene.i_last_view == this.scene.saved_views.length-1) {
      $("#jolecule-views").append(div);
    } else {
      let j = this.scene.i_last_view-1;
      let j_id = this.scene.saved_views[j].id;
      let j_div = this.viewPiece[j_id].div;
      div.insertAfter(j_div);
    }
  }

  makeNewView() {
    let new_id = random_id();
    this.controller.calculate_current_abs_camera();
    this.controller.save_current_view(new_id);
    this.insertNewViewDiv(new_id);
    this.updateViews();
    this.viewPiece[new_id].div.css('background-color', 'lightgray');
    this.saveViewsToDataServer(() => {
      this.viewPiece[new_id].div.css('background-color', '');
      $("#jolecule-views").stop();
      $("#jolecule-views").scrollTo(
        this.viewPiece[new_id].div,
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
      proteinDisplayTag,
      sequenceDisplayTag,
      viewsDisplayTag,
      dataServers) {

    this.viewsDisplayTag = viewsDisplayTag;
    this.sequence_display_tag = sequenceDisplayTag;
    // this.data_server = data_server;
    this.dataServers = dataServers;

    this.embedJolecule;
    new EmbedJolecule({
      divTag: proteinDisplayTag,
      viewId: '',
      viewHeight: 170,
      isViewTextShown: false,
      isEditable: true,
      isLoop: false,
      dataServers: dataServers,
      onload: (embedJolecule) => {
        this.embedJolecule = embedJolecule;
        this.scene = this.embedJolecule.scene;
        this.controller = this.embedJolecule.controller;
        this.proteinDisplay = this.embedJolecule.proteinDisplay;
        this.postDataLoadBuildElements();
      }
    });
  }

  postDataLoadBuildElements() {

    this.viewsDisplay = new ViewsDisplay(
      this.viewsDisplayTag,
      this.controller,
      this.proteinDisplay,
      this.data_server);

    this.viewsDisplay.makeAllViews();

    this.sequence_display = new SequenceDisplay(
      this.sequence_display_tag, this.controller);
    this.sequence_display.buildDivs();

    let hashTag = url().split('#')[1];
    if (hashTag in this.scene.saved_views_by_id) {
      this.viewsDisplay.setTargetByViewId(hashTag);
    } else {
      this.viewsDisplay.setTargetByViewId('view:000000');
    }
    this.viewsDisplay.updateViews();

    document.oncontextmenu = _.noop;

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
      this.viewsDisplay.updateViews();
      if (this.scene.is_new_view_chosen) {
        this.sequence_display.redraw();
        this.scene.is_new_view_chosen = false;
      }
      this.embedJolecule.draw();
      this.scene.changed = false;
    }
  }

  animate() {
    if (typeof this.embedJolecule !== "undefined") {
      this.embedJolecule.animate();
    }
  }
  
  resize(event) {
    if (typeof this.scene !== "undefined") {
      this.scene.changed = true;
    }
    if (typeof this.embedJolecule !== "undefined") {
      this.embedJolecule.resize();
    }
  }

  onkeydown(event) {
    if (!window.keyboard_lock) {
      let c = String.fromCharCode(event.keyCode).toUpperCase();
      let s = "[" + c + "]";
      if (c == 'V') {
        this.viewsDisplay.makeNewView();
        return;
      } else if ((c == "K") || (event.keyCode == 37)) {
        this.sequence_display.gotoPrevResidue();
      } else if ((c == "J") || (event.keyCode == 39)) {
        this.sequence_display.gotoNextResidue();
      } else if (c == "X") {
        let i_atom = this.scene.current_view.i_atom;
        if (i_atom >= 0) {
          let res_id = this.controller.protein.atoms[i_atom].res_id;
          this.sequence_display.toggleResidueSelect(res_id);
        }
      } else if (event.keyCode == 38) {
        this.viewsDisplay.gotoPrevView();
      } else if (c == " " || event.keyCode == 40) {
        this.viewsDisplay.gotoNextView();
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
        this.proteinDisplay.controller.clear_selected();
      } else if (c == 'E') {
        let i_view = this.proteinDisplay.scene.i_last_view;
        if (i_view > 0) {
          let view_id = this.proteinDisplay.scene.saved_views[i_view].id;
          this.viewsDisplay.div[view_id].edit_fn();
        }
      } else if (c == 'N') {
        this.proteinDisplay.controller.toggle_neighbors();
      } else if (c == 'A') {
        this.proteinDisplay.atom_label_dialog();
      } else {
        let i = parseInt(c)-1;
        if ((i || i==0) && (i<this.scene.saved_views.length)) {
          let id = this.scene.saved_views[i].id;
          this.viewsDisplay.setTargetByViewId(id);
        }
      }
      this.proteinDisplay.scene.changed = true;
    }
  }

}


export { FullPageJolecule }



