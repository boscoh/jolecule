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


/**
 *
 * EmbedJolecule - the widget that shows proteins and
 * annotations
 *
 **/

let defaultArgs = {
  divTag: '',
  dataServers: [],
  viewId: '',
  viewHeight: 170,
  isViewTextShown: false,
  isEditable: true,
  isLoop: false,
  onload: onload,
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

    this.messageDiv = $('<div>')
      .attr('id', 'loading-message')
      .css({
        'z-index': 5000,
        'background-color': 'rgba(60, 60, 60, 0.75)',
        'font-family': 'Helvetica, Arial, sans-serif',
        'font-size': '12px',
        'letter-spacing': '0.1em',
        'padding': '5px',
        'color': '#666'})
      .html("Jolecule: loading data for proteins...");
    stick_in_top_left(this.div, this.messageDiv, 100, 90);

    this.isViewTextShown = this.params.isViewTextShown;
    this.setTextState();

    $(window).resize(() => this.resize());

    this.resize();

    this.isProcessingData = false;
    // _.each(this.params.dataServers, (dataServer) => {
    //     this.addDataServer(dataServer);
    // });

    if (this.params.onload) {
      this.params.onload();
    }
  };

  setProcessingMesssage(html) {
    this.messageDiv.html(html).show();
  };

  cleanupProcessingMessage() {
    this.resize();
    this.messageDiv.hide();
    this.isProcessingData = false;
  };

  addDataServer(dataServer, callback) {

    let guardFn = () => {
      if (this.isProcessingData) {
        setTimeout(guardFn, 50);
      } else {
        this.isProcessingData = true;

        dataServer.get_protein_data((proteinData) => {
          console.log("EmbedJolecule.load_protein_data", proteinData.pdb_id);
          this.setProcessingMesssage("Rendering '" + proteinData.pdb_id + "'");

          // timeout needed to allow message to be rendered
          setTimeout(() => {
            if (proteinData['pdb_text'].length == 0) {
              this.setProcessingMesssage("Error: no protein data");
              this.isProcessingData = false;
              return;
            }

            this.protein.load(proteinData);

            if (this.protein.parsing_error) {
              this.setProcessingMesssage("Error parsing protein: " + this.protein.parsing_error);
              this.isProcessingData = false;
              return;
            }

            this.proteinDisplay.nDataServer += 1;
            if (this.proteinDisplay.nDataServer == 1) {
              this.proteinDisplay.buildAfterDataLoad();
              dataServer.get_views((view_dicts) => {
                this.loadViewsFromDataServer(view_dicts);
                // if (this.params.onload) {
                //   this.params.onload(this);
                // }
                this.cleanupProcessingMessage();
                if (callback) {
                  callback();
                }
              });
            } else {
              this.proteinDisplay.buildAfterAddProteinData();
              this.cleanupProcessingMessage();
              if (callback) {
                callback();
              }
            }
          }, 0);
        });
      }
    };

    guardFn();
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
    this.data_server.save_views(
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
    this.data_server.delete_protein_view(
      id,
      () => {
        this.updateView();
        this.viewDiv.css('background-color', '');
      });
  }

  is_changed() {
    if (!exists(this.proteinDisplay)) {
      return false;
    }
    return this.proteinDisplay.is_changed();
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
      '', 'backbone', 'jolecule-button',
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
        $('<div style="margin-left: 0.75em; white-space: nowrap;">')
          .append(backboneButton)
      )
      .append(
        $('<div style="margin-left: 0.75em; white-space: nowrap;">')
          .append(this.ligButton)
          .append(this.hydButton)
          .append(this.watButton)
      ) 
      .append(
        $('<div style="margin-left: 0.75em; white-space: nowrap; align-self: flex-end">')
          .append(' sidechain:')
          .append(allSidechainButton)
          .append(clearSidechainButton)
          .append(nearSidechainButton)
          .append(' ')
      ) ;

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