import $ from "jquery";
import _ from "lodash";
import {Protein, Controller, Scene} from "./protein";
import {ProteinDisplay} from "./proteindisplay";
import {
  exists,
  link_button,
  toggle_button,
  ViewPiece,
  stick_in_top_left,
  random_id,
} from "./util.js";


function runWithProcessQueue(isProcessingFlag, fn) {
  function guardFn() {
    if (isProcessingFlag.flag) {
      setTimeout(guardFn, 50);
    } else {
      isProcessingFlag.flag = true;
      fn(isProcessingFlag);
    }
  };
  guardFn();
}


/**
 *
 * EmbedJolecule - the widget that shows proteins and
 * annotations
 *
 **/

let defaultArgs = {
  divTag: '',
  viewId: '',
  viewHeight: 170,
  isViewTextShown: false,
  isEditable: true,
  isLoop: false,
  isGrid: false
};

class EmbedJolecule {

  constructor (params) {
    this.params = params;
    this.isLoop = this.params.isLoop;

    this.divTag = this.params.divTag;
    this.div = $(this.params.divTag);
    // disable right mouse click
    this.div[0].oncontextmenu = _.noop;

    this.initViewId = this.params.viewId;
    this.hAnnotationView = this.params.viewHeight;

    this.protein = new Protein();
    this.scene = new Scene(this.protein);
    this.controller = new Controller(this.scene);

    this.createProteinDiv();
    this.proteinDisplay = new ProteinDisplay(
      this.scene, '#jolecule-protein-display', this.controller, params.isGrid);
    this.proteinDisplay.min_radius = 10;

    this.createStatusDiv();
    this.createViewDiv();

    this.isViewTextShown = this.params.isViewTextShown;
    this.setTextState();

    $(window).resize(() => this.resize());

    this.resize();

    this.isProcessing = { flag: false };
  };

  loadProteinData(isProcessingFlag, dataServer, proteinData, callback) {
    if (proteinData.pdb_text.length == 0) {
      this.proteinDisplay.setProcessingMesssage("Error: no protein data");
      isProcessingFlag.flag = false;
      return;
    }

    this.protein.load(proteinData);

    if (this.protein.parsing_error) {
      this.proteinDisplay.setProcessingMesssage("Error parsing protein: " + this.protein.parsing_error);
      isProcessingFlag.flag = false;
      return;
    }

    this.proteinDisplay.nDataServer += 1;
    if (this.proteinDisplay.nDataServer == 1) {
      this.proteinDisplay.buildAfterDataLoad();

      // need to keep track of a single dataServer
      // to save views, will take the first one
      this.dataServer = dataServer;
      this.dataServer.get_views((view_dicts) => {
        this.loadViewsFromDataServer(view_dicts);
        isProcessingFlag.flag = false;
        this.proteinDisplay.cleanupProcessingMessage();
        if (callback) {
          callback();
        }
      });
    } else {
      this.proteinDisplay.buildAfterAddProteinData();
      this.proteinDisplay.cleanupProcessingMessage();
      isProcessingFlag.flag = false;
      if (callback) {
        callback();
      }
    }
  }

  addDataServer(dataServer, callback) {
    runWithProcessQueue(
      this.isProcessing,
      (isProcessingFlag) => {
        dataServer.get_protein_data(
          (proteinData) => {
            this.proteinDisplay.displayProcessMessageAndRun(
              "Rendering '" + proteinData.pdb_id + "'", 
              () => { 
                this.loadProteinData(
                  isProcessingFlag, dataServer, proteinData, callback)
              });
          });
      })
  }

  loadViewsFromDataServer(viewDicts) {

    this.controller.load_views_from_flat_views(viewDicts);

    let viewId = this.scene.current_view.id;
    if (this.initViewId) {
      if (this.initViewId in this.scene.saved_views_by_id) {
        viewId = this.initViewId;
      }
    }
    this.updateView();

    if (this.params.viewId in this.scene.saved_views_by_id) {
      this.controller.set_target_view_by_id(this.params.viewId);
      this.updateView();
    }
  }

  saveViewsToDataServer(success) {
    this.dataServer.save_views(
      this.controller.get_view_dicts(), success);
    this.scene.changed = true;
  }

  saveCurrView() {
    var newId = random_id();
    this.controller.calculate_current_abs_camera();
    this.controller.save_current_view(newId);
    this.updateView();
    this.viewDiv.css('background-color', 'lightgray');
    this.saveViewsToDataServer(() => { this.viewDiv.css('background-color', ''); });
  }

  getCurrView() {
    var i = this.scene.i_last_view;
    if (i in this.scene.saved_views) {
      var id = this.scene.saved_views[i].id;
      return this.scene.saved_views_by_id[id];
    } else {
      return this.scene.saved_views[0]
    }
  }

  changeText(newText) {
    var view = this.getCurrView();
    view.text = newText;
    this.viewDiv.css('background-color', 'lightgray');
    this.saveViewsToDataServer(
      () => { this.viewDiv.css('background-color', ''); });
    this.scene.changed = true;
  }

  deleteCurrView() {
    var i = this.scene.i_last_view;
    if (i == 0) {
      // skip default view:000000
      return;
    }
    var id = this.scene.saved_views[i].id;
    this.controller.delete_view(id);
    this.viewDiv.css('background-color', 'lightgray');
    this.dataServer.delete_protein_view(
      id,
      () => {
        this.updateView();
        this.viewDiv.css('background-color', '');
      });
  }

  isChanged() {
    if (!exists(this.proteinDisplay)) {
      return false;
    }
    return this.proteinDisplay.isChanged();
  }

  animate() {
    if (exists(this.proteinDisplay)) {
      this.proteinDisplay.animate();
      if (this.isLoop) {
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
    if (exists(this.proteinDisplay)) {
      if (this.scene.changed) {
        this.updateView();
        this.proteinDisplay.draw();
        this.scene.changed = false;
      }
    }
  }

  cycleBackbone() {
    if (this.scene.current_view.show.all_atom) {
      this.controller.set_backbone_option('ribbon');
    } else if (this.scene.current_view.show.ribbon) {
      this.controller.set_backbone_option('trace');
    } else if (this.scene.current_view.show.trace){
      this.controller.set_backbone_option('all_atom');
    }
  }

  setTextState() {
    if (this.isViewTextShown) {
      this.viewDiv.height(this.hAnnotationView);
      this.viewDiv.css('visibility', 'visible');
    } else {
      this.viewDiv.height(0);
      this.viewDiv.css('visibility', 'hidden');
    }
    this.resize();
    this.controller.scene.changed = true;
  }

  toggleTextState() {
    this.isViewTextShown = !this.isViewTextShown;
    this.setTextState();
  }
  
  gotoPrevView() {
    this.controller.set_target_prev_view();
    this.updateView();
  }
  
  gotoNextView() {
    this.controller.set_target_next_view();
    this.updateView();
  }

  createProteinDiv() {
    var height = 
        this.div.outerHeight() - 
        this.hAnnotationView;
    this.proteinDiv =
      $('<div>')
        .attr('id', 'jolecule-protein-display')
        .addClass('jolecule-embed-body')
        .css('overflow', 'hidden')
        .css('width', this.div.outerWidth())
        .css('height', height);
    this.div.append(this.proteinDiv);
  }

  createStatusDiv() {

    this.statusText = $('<span>');

    var textButton = toggle_button(
        'toggle_text', 'T', 'jolecule-button',
        () => this.isViewTextShown,
        (b) => { this.toggleTextState(); });

    var prevButton = link_button(
      'prev_view', '<', 'jolecule-button', () => { this.gotoPrevView() });

    var nextButton = link_button(
        'prev_view', '>', 'jolecule-button', () => { this.gotoNextView() });

    var loopButton = toggle_button(
        'loop', '&orarr;', 'jolecule-button',
        () => this.isLoop,
        (b) => { this.isLoop = b });

    var saveButton = '';
    if (this.params.isEditable) {
      saveButton = link_button(
          'save_view', '+', 'jolecule-button', () => { this.saveCurrView() });
    };

    this.ligButton = toggle_button(
      '', 'lig', 'jolecule-button',
      () => this.controller.get_show_option('ligands'),
      (b) => { this.controller.set_show_option('ligands', b); }
    );

    this.watButton = toggle_button(
      '', 'h2o', 'jolecule-button',
      () => this.controller.get_show_option('water'),
      (b) => { this.controller.set_show_option('water', b); }
    );

    this.hydButton = toggle_button(
      '', 'h', 'jolecule-button',
      () => this.controller.get_show_option('hydrogen'),
      (b) => { this.controller.set_show_option('hydrogen', b); }
    );
    this.hydButton = '';

    var backboneButton = link_button(
      '', 'bb', 'jolecule-button',
      () => { this.cycleBackbone(); });

    var allSidechainButton = link_button('', 'all', 'jolecule-button',
      () => { this.controller.set_show_option('sidechain', true); });

    var clearSidechainButton = link_button(
      '', 'x', 'jolecule-button',
      () => {
        this.controller.set_show_option('sidechain', false);
        this.controller.clear_selected();
      });

    var nearSidechainButton = link_button(
      '', 'near', 'jolecule-button',
      () => { this.controller.toggle_neighbors(); });

    this.statusDiv = $('<div style="flex-wrap: wrap; justify-content: flex-end">')
      .addClass('jolecule-embed-view-bar')
      .append(
        $('<div style="flex: 1; white-space: nowrap;">')
          .append(loopButton)
          .append(textButton)
          .append(prevButton)
          .append(this.statusText)
          .append(nextButton)
          .append(saveButton)
      )
      .append(
        $('<div style="flex: 1; white-space: nowrap; text-align: right; align-self: flex-end">')
          .append(backboneButton)
          .append(" ")
          .append(this.ligButton)
          .append(this.hydButton)
          .append(this.watButton)
          .append(" ")
          .append(' sc ')
          .append(allSidechainButton)
          .append(clearSidechainButton)
          .append(nearSidechainButton));

    this.div.append(this.statusDiv);
  }

  updateView() {
    var view = this.getCurrView();
    if (view == null) {
      return;
    }
    var nView = this.scene.saved_views.length;
    var iView = view.order + 1
    this.statusText.text(' ' + iView + '/' + nView + ' ');
    var viewPiece = new ViewPiece({
      view: view,
      isEditable: this.params.isEditable,
      delete_view: () => { this.deleteCurrView() },
      save_change: (text) => { this.changeText(text); },
      pick: _.noop,
      embed_view: function() {
        window.location.href = '/embed/pdb/pdb?pdb_id=' + view.pdb_id + '&view=' + view.id;
      },
    });
    this.realViewDiv = viewPiece.div;
    this.realViewDiv
      .css('overflow-y', 'auto')
      .css('height', '100%');
    this.viewDiv
      .empty()
      .append(this.realViewDiv);
    this.ligButton.redraw();
    this.watButton.redraw();
    // this.hyd.redraw();
  }

  createViewDiv() {
    this.viewDiv = $('<div>')
      .addClass('jolecule-embed-view');
    this.div.append(this.viewDiv);
  }

  resize() {
    this.proteinDiv.width(this.div.outerWidth());
    var newHeight = this.div.outerHeight()
        - this.viewDiv.outerHeight()
        - this.statusDiv.outerHeight();
    if (exists(this.proteinDisplay)) {
      if (exists(this.proteinDisplay.renderer)) {
        this.proteinDisplay.renderer.domElement.style.height = newHeight;
        this.proteinDisplay.resize();
      }
      this.scene.changed = true;
    }
    this.proteinDiv.css('height', newHeight);
  }

}


export { EmbedJolecule, defaultArgs }