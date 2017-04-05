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
  do_nothing,
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
  view_id: '',
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
    this.div[0].oncontextmenu = do_nothing;

    this.initViewId = this.params.view_id;
    this.hAnnotationView = this.params.viewHeight;

    this.protein = new Protein();
    this.scene = new Scene(this.protein);
    this.controller = new Controller(this.scene);

    this.createProteinDiv();
    this.protein_display = new ProteinDisplay(
      this.scene, '#jolecule-protein-display', this.controller, params.isGrid);
    this.protein_display.min_radius = 10;

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
    _.each(this.params.dataServers, (dataServer) => {
        this.addDataServer(dataServer);
    });
  };

  addDataServer(dataServer, i) {
    let message = (html) => {
      this.messageDiv.html(html).show();
    };

    let cleanup = () => {
      this.resize();
      this.messageDiv.hide();
      this.isProcessingData = false;
    };

    let guardFn = () => {
      if (this.isProcessingData) {
        setTimeout(guardFn, 50);
      } else {
        this.isProcessingData = true;

        dataServer.get_protein_data((proteinData) => {
          console.log("EmbedJolecule.load_protein_data", proteinData.pdb_id);
          message("Rendering '" + proteinData.pdb_id + "'");

          // timeout needed to allow message to be rendered
          setTimeout(() => {
            if (proteinData['pdb_text'].length == 0) {
              message("Error: no protein data");
              this.isProcessingData = false;
              return;
            }

            this.protein.load(proteinData);

            if (this.protein.parsing_error) {
              message("Error parsing protein: " + this.protein.parsing_error);
              this.isProcessingData = false;
              return;
            }

            this.protein_display.nDataServer += 1;
            if (this.protein_display.nDataServer == 1) {
              this.protein_display.buildAfterDataLoad();
              dataServer.get_views((view_dicts) => {
                this.loadViewsFromDataServer(view_dicts);
                if (this.params.onload) {
                  this.params.onload(this);
                }
                cleanup();
              });
            } else {
              this.protein_display.buildAfterAddProteinData();
              cleanup();
            }
          }, 0);
        });
      }
    };

    guardFn();
  }

  loadViewsFromDataServer(view_dicts) {

    this.controller.load_views_from_flat_views(view_dicts);

    let viewId = this.scene.current_view.id;
    if (this.initViewId) {
      if (this.initViewId in this.scene.saved_views_by_id) {
        viewId = this.initViewId;
      }
    }
    this.updateView();

    if (this.params.view_id in this.scene.saved_views_by_id) {
      this.controller.set_target_view_by_id(this.params.view_id);
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
    this.view_div.css('background-color', 'lightgray');
    this.saveViewsToDataServer(() => { this.view_div.css('background-color', ''); });
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
    this.view_div.css('background-color', 'lightgray');
    this.saveViewsToDataServer(
      () => { this.view_div.css('background-color', ''); });
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
    this.view_div.css('background-color', 'lightgray');
    this.data_server.delete_protein_view(
      id,
      () => {
        this.updateView();
        this.view_div.css('background-color', '');
      });
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
    if (exists(this.protein_display)) {
      if (this.scene.changed) {
        this.updateView();
        this.protein_display.draw();
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
      this.view_div.height(this.hAnnotationView);
      this.view_div.css('visibility', 'visible');
    } else {
      this.view_div.height(0);
      this.view_div.css('visibility', 'hidden');
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
    this.protein_div = 
      $('<div>')
        .attr('id', 'jolecule-protein-display')
        .addClass('jolecule-embed-body')
        .css('overflow', 'hidden')
        .css('width', this.div.outerWidth())
        .css('height', height);
    this.div.append(this.protein_div);
  }

  createStatusDiv() {
    var _this = this;

    this.status_text = $('<span>');

    var text_button = toggle_button(
        'toggle_text', 'T', 'jolecule-button',
        function() { return _this.isViewTextShown },
        function(b) { _this.toggleTextState(); });

    var prev_button = link_button(
      'prev_view', '<', 'jolecule-button',
      function() { _this.gotoPrevView() });

    var next_button = link_button(
        'prev_view', '>', 'jolecule-button', 
        function() { _this.gotoNextView() });

    var loop_button = toggle_button(
        'loop', '&orarr;', 'jolecule-button',
        function() { return _this.isLoop; },
        function(b) { _this.isLoop = b });

    var save_button = '';
    if (_this.params.isEditable) {
      save_button = link_button(
          'save_view', '+', 'jolecule-button',
           function() { _this.saveCurrView() });
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
      function() { _this.cycleBackbone(); });

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

  updateView() {
    var _this = this;
    var view = this.getCurrView();
    if (view == null) {
      return;
    }
    var nView = this.scene.saved_views.length;
    var iView = view.order + 1
    this.status_text.text(' ' + iView + '/' + nView + ' ');
    var view_piece = new ViewPiece({
      view: view,
      isEditable: _this.params.isEditable,
      delete_view: function() { _this.deleteCurrView() },
      save_change: function(text) { _this.changeText(text); },
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

  createViewDiv() {
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


export { EmbedJolecule, defaultArgs }