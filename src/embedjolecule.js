import $ from 'jquery'
import _ from 'lodash'
import { Soup, Controller, Scene } from './soup'
import { Display } from './display'
import {
  exists,
  linkButton,
  toggleButton,
  randomId,
} from './util.js'

function runWithProcessQueue (isProcessingFlag, fn) {
  function guardFn () {
    if (isProcessingFlag.flag) {
      setTimeout(guardFn, 50)
    } else {
      isProcessingFlag.flag = true
      fn(isProcessingFlag)
    }
  }
  guardFn()
}

class ViewPiece {
  /**
   * params{ goto, saveChage(txt), pick, view, deleteView, isEditable, swapUp
   * 
   }
   */
  constructor (params) {
    this.params = params
    this.div = $('<div>').addClass('jolecule-view')

    if (exists(params.goto)) {
      this.div
        .append(
          linkButton(
            '',
            this.params.goto,
            'jolecule-button',
            this.params.pick)
        )
        .append(
          '<div style="width: 10px">'
        )
    }
    this.params = params
    this.makeEditDiv()

    this.makeShowDiv()
  }

  saveChange () {
    console.log('ViewPiece.saveChange')
    var changedTet = this.editTextArea.val()
    this.editDiv.hide()
    this.showDiv.show()
    this.showTextDiv.html(changedTet)
    this.params.saveChange(changedTet)
    window.keyboard_lock = false
  }

  startEdit () {
    this.params.pick()
    this.editTextArea.text(this.params.view.text)
    this.editDiv.show()
    this.showDiv.hide()
    var textarea = this.editTextArea.find('textarea')
    setTimeout(function () { textarea.focus() }, 100)
    window.keyboard_lock = true
  }

  discardChange () {
    this.editDiv.hide()
    this.showDiv.show()
    window.keyboard_lock = false
  }

  makeEditDiv () {

    this.editTextArea = $('<textarea>')
      .addClass('jolecule-view-text')
      .css('width', '100%')
      .css('height', '5em')
      .click(_.noop)

    this.editDiv = $('<div>')
      .css('width', '100%')
      .click(_.noop)
      .append(this.editTextArea)
      .append('<br><br>')
      .append(
        linkButton(
          '', 'save', 'jolecule-small-button',
          (event) => { this.saveChange() }))
      .append(' &nbsp; ')
      .append(
        linkButton(
          '', 'discard', 'jolecule-small-button',
          (event) => { this.discardChange() }))
      .hide()

    this.div.append(this.editDiv)
  }

  makeShowDiv () {
    var view = this.params.view

    var editButton = linkButton(
      '', 'edit', 'jolecule-small-button',
      () => { this.startEdit() })

    var embedButton = linkButton(
      '', 'embed', 'jolecule-small-button',
      () => { this.params.embed_view() })

    this.showTextDiv = $('<div>')
      .addClass('jolecule-view-text')
      .html(this.params.view.text)

    this.showDiv = $('<div>')
      .css('width', '100%')
      .append(this.showTextDiv)

    if (view.id != 'view:000000') {
      this.showDiv
        .append(
          $('<div>')
            .addClass('jolecule-author')
            .html(view.creator)
        )
    }

    let isEditable = this.params.isEditable
      && (!view.lock)
      && (view.id != 'view:000000')

    if (isEditable) {

      // this.showDiv
      //   .append(embedButton)
      //   .append(' ');

      this.showDiv
        .append(editButton)

      if (exists(this.params.swapUp) && this.params.swapUp)
        this.showDiv
          .append(' ')
          .append(
            linkButton(
              '', 'up', 'jolecule-small-button',
              () => { this.params.swapUp() }))

      if (exists(this.params.swapUp) && this.params.swapDown)
        this.showDiv
          .append(' ')
          .append(
            linkButton(
              '', 'down', 'jolecule-small-button',
              () => { this.params.swapDown() }))

      if (exists(this.params.delete_view)) {
        this.showDiv
          .append(
            $('<div>')
              .css('float', 'right')
              .append(
                linkButton(
                  '', 'delete', 'jolecule-small-button',
                  () => {
                    console.log('ViewPiece.deleteButton')
                    this.params.delete_view()
                  })))
      }
    }

    this.div.append(this.showDiv)
  }

}

/**
 *
 * EmbedJolecule - the widget that shows proteins and
 * annotations
 *
 */

let defaultArgs = {
  divTag: '',
  viewId: '',
  viewHeight: 170,
  isViewTextShown: false,
  isEditable: true,
  isLoop: false,
  isGrid: false,
  backgroundColor: 0xCCCCCC
}

class EmbedJolecule {

  constructor (params) {
    this.params = params
    this.isLoop = this.params.isLoop

    this.divTag = this.params.divTag
    this.div = $(this.params.divTag)
    // disable right mouse click
    this.div[0].oncontextmenu = _.noop

    this.initViewId = this.params.viewId
    this.hAnnotationView = this.params.viewHeight

    this.soup = new Soup()
    this.scene = new Scene(this.soup)
    this.controller = new Controller(this.scene)

    this.residueSelector = null

    this.createProteinDiv()
    this.display = new Display(
      this.scene,
      '#jolecule-soup-display',
      this.controller,
      params.isGrid,
      params.backgroundColor)

    this.createStatusDiv()
    this.createViewDiv()

    this.isViewTextShown = this.params.isViewTextShown
    this.setTextState()

    $(window).resize(() => this.resize())

    this.resize()

    this.isProcessing = {flag: false}
  };

  loadProteinData (isProcessingFlag, dataServer, proteinData, callback) {
    if (proteinData.pdb_text.length == 0) {
      this.display.setProcessingMesssage('Error: no soup data')
      isProcessingFlag.flag = false
      return
    }

    this.soup.load(proteinData)

    this.populateResidueSelector()

    if (this.soup.parsingError) {
      this.display.setProcessingMesssage('Error parsing soup: ' + this.soup.parsingError)
      isProcessingFlag.flag = false
      return
    }

    this.display.nDataServer += 1
    if (this.display.nDataServer == 1) {
      this.display.buildAfterInitialLoad()

      // need to keep track of a single dataServer
      // to save views, will take the first one
      this.dataServer = dataServer
      this.dataServer.get_views((view_dicts) => {
        this.loadViewsFromDataServer(view_dicts)
        isProcessingFlag.flag = false
        this.display.cleanupProcessingMessage()
        if (callback) {
          callback()
        }
      })
    } else {
      this.display.buildAfterAdditionalLoad()
      this.display.cleanupProcessingMessage()
      isProcessingFlag.flag = false
      if (callback) {
        callback()
      }
    }
  }

  addDataServer (dataServer, callback) {
    runWithProcessQueue(
      this.isProcessing,
      (isProcessingFlag) => {
        dataServer.get_protein_data(
          (proteinData) => {
            this.display.displayMessageBeforeCompute(
              'Parsing \'' + proteinData.pdb_id + '\'',
              () => {
                this.loadProteinData(
                  isProcessingFlag, dataServer, proteinData, callback)
              })
          })
      })
  }

  loadViewsFromDataServer (viewDicts) {

    this.controller.load_views_from_flat_views(viewDicts)

    let viewId = this.scene.current_view.id
    if (this.initViewId) {
      if (this.initViewId in this.scene.saved_views_by_id) {
        viewId = this.initViewId
      }
    }
    this.updateView()

    if (this.params.viewId in this.scene.saved_views_by_id) {
      this.controller.set_target_view_by_id(this.params.viewId)
      this.updateView()
    }
  }

  saveViewsToDataServer (success) {
    this.dataServer.save_views(
      this.controller.get_view_dicts(), success)
    this.scene.changed = true
  }

  saveCurrView () {
    var newId = randomId()
    this.controller.save_current_view(newId)
    this.updateView()
    this.viewDiv.css('background-color', 'lightgray')
    this.saveViewsToDataServer(() => { this.viewDiv.css('background-color', '') })
  }

  getCurrView () {
    var i = this.scene.i_last_view
    if (i in this.scene.saved_views) {
      var id = this.scene.saved_views[i].id
      return this.scene.saved_views_by_id[id]
    } else {
      return this.scene.saved_views[0]
    }
  }

  changeText (newText) {
    var view = this.getCurrView()
    view.text = newText
    this.viewDiv.css('background-color', 'lightgray')
    this.saveViewsToDataServer(
      () => { this.viewDiv.css('background-color', '') })
    this.scene.changed = true
  }

  deleteCurrView () {
    var i = this.scene.i_last_view
    if (i == 0) {
      // skip default view:000000
      return
    }
    var id = this.scene.saved_views[i].id
    this.controller.delete_view(id)
    this.viewDiv.css('background-color', 'lightgray')
    this.dataServer.delete_protein_view(
      id,
      () => {
        this.updateView()
        this.viewDiv.css('background-color', '')
      })
  }

  isChanged () {
    if (!exists(this.display)) {
      return false
    }
    return this.display.isChanged()
  }

  animate () {
    if (exists(this.display)) {
      this.display.animate()
      if (this.isLoop) {
        if (this.scene.n_update_step <= 0) {
          // loop started
          this.scene.n_update_step -= 1
          if (this.scene.n_update_step < -100) {
            this.controller.set_target_next_view()
            this.scene.changed = true
          }
        }
      }
    }
  };

  draw () {
    if (exists(this.display)) {
      if (this.scene.changed) {
        this.updateView()
        this.display.draw()
        this.populateResidueSelector()
        this.scene.changed = false
      }
    }
  }

  cycleBackbone () {
    if (this.scene.current_view.show.all_atom) {
      this.controller.set_backbone_option('ribbon')
    } else if (this.scene.current_view.show.ribbon) {
      this.controller.set_backbone_option('trace')
    } else if (this.scene.current_view.show.trace) {
      this.controller.set_backbone_option('all_atom')
    }
  }

  setTextState () {
    if (this.isViewTextShown) {
      this.viewDiv.height(this.hAnnotationView)
      this.viewDiv.css('visibility', 'visible')
    } else {
      this.viewDiv.height(0)
      this.viewDiv.css('visibility', 'hidden')
    }
    this.resize()
    this.controller.scene.changed = true
  }

  toggleTextState () {
    this.isViewTextShown = !this.isViewTextShown
    this.setTextState()
  }

  gotoPrevView () {
    this.controller.set_target_prev_view()
    this.updateView()
  }

  gotoNextView () {
    this.controller.set_target_next_view()
    this.updateView()
  }

  createProteinDiv () {
    var height =
      this.div.outerHeight() -
      this.hAnnotationView
    this.proteinDiv =
      $('<div>')
        .attr('id', 'jolecule-soup-display')
        .addClass('jolecule-embed-body')
        .css('overflow', 'hidden')
        .css('width', this.div.outerWidth())
        .css('height', height)
    this.div.append(this.proteinDiv)
  }

  populateResidueSelector () {
    // clear selector
    this.residueSelector
      .find('option')
      .remove()

    // rebuild selector
    for (let i = 0; i < this.soup.getResidueCount(); i++) {
      let residue = this.soup.getResidue(i)
      let text = residue.id + '-' + residue.type
      this.residueSelector.append(
        $('<option>').attr('value', residue.id).text(text))
    }

    this.residueSelector.val(this.scene.current_view.res_id)
  }

  createStatusDiv () {

    this.statusText = $('<span>')

    var textButton = toggleButton(
      'toggle_text', 'T', 'jolecule-button',
      () => this.isViewTextShown,
      (b) => { this.toggleTextState() })

    var prevButton = linkButton(
      'prev_view', '<', 'jolecule-button', () => { this.gotoPrevView() })

    var nextButton = linkButton(
      'prev_view', '>', 'jolecule-button', () => { this.gotoNextView() })

    var loopButton = toggleButton(
      'loop', '&orarr;', 'jolecule-button',
      () => this.isLoop,
      (b) => { this.isLoop = b })

    var saveButton = ''
    if (this.params.isEditable) {
      saveButton = linkButton(
        'save_view', '+', 'jolecule-button', () => { this.saveCurrView() })
    }


    this.ligButton = toggleButton(
      '', 'lig', 'jolecule-button',
      () => this.controller.get_show_option('ligands'),
      (b) => { this.controller.set_show_option('ligands', b) }
    )

    this.watButton = toggleButton(
      '', 'water', 'jolecule-button',
      () => this.controller.get_show_option('water'),
      (b) => { this.controller.set_show_option('water', b) }
    )

    this.hydButton = toggleButton(
      '', 'h', 'jolecule-button',
      () => this.controller.get_show_option('hydrogen'),
      (b) => { this.controller.set_show_option('hydrogen', b) }
    )
    this.hydButton = ''

    var backboneButton = linkButton(
      '', 'backbone', 'jolecule-button',
      () => { this.cycleBackbone() })

    var allSidechainButton = linkButton('', 'all', 'jolecule-button',
      () => { this.controller.set_show_option('sidechain', true) })

    var clearSidechainButton = linkButton(
      '', 'x', 'jolecule-button',
      () => {
        this.controller.set_show_option('sidechain', false)
        this.controller.clear_selected()
      })

    var nearSidechainButton = linkButton(
      '', 'near', 'jolecule-button',
      () => { this.controller.toggle_neighbors() })

    this.residueSelector = $('<select>')
      .addClass('jolecule-residue-selector')
      .css({
        'outline': 'none',
        '-moz-appearance': 'none',
      })

    this.residueSelector.change(() => {
      var resId = this.residueSelector.find(':selected').val()
      let iRes = this.scene.soup.iResByResId[resId]
      this.display.setTargetViewFromAtom(
        this.scene.soup.getResidue(iRes).iAtom)
    })

    this.viewBarDiv =
      $('<div style="width: 100%; display: flex; flex-direction: row">')
        .append(
          $('<div style="flex: 1; display: flex; flex-direction: row; align-items: center;">')
            .append(loopButton)
            .append(textButton)
            .append(prevButton)
            .append(this.statusText)
            .append(nextButton)
            .append(saveButton))
        .append(
          $('<div style="flex: 1; display: flex; flex-direction: row; justify-content: flex-end;">')
            .append(this.residueSelector))

    this.sidechainDiv =
      $('<div style="width: 100%; display: flex; flex-direction: row; margin-top: 5px">')
        .append(
          $('<div style="flex: 1; display: flex; flex-direction: row; align-items: center;">')
            .append(backboneButton)
            .append(' ')
            .append(this.ligButton)
            .append(this.hydButton)
            .append(this.watButton)
            .append(' '))
        .append(
          $('<div style="flex: 1; justify-content: flex-end; display: flex; flex-direction: row; align-items: center;">')
            .append(' sidechain: ')
            .append(allSidechainButton)
            .append(clearSidechainButton)
            .append(nearSidechainButton))

    this.statusDiv = $('<div style="display: flex; flex-direction: column">')
      .addClass('jolecule-embed-view-bar')
      .append(this.viewBarDiv)
      .append(this.sidechainDiv)

    this.div.append(this.statusDiv)
  }

  updateView () {
    var view = this.getCurrView()
    if (view == null) {
      return
    }
    var nView = this.scene.saved_views.length
    var iView = view.order + 1
    this.statusText.text(' ' + iView + '/' + nView + ' ')
    var viewPiece = new ViewPiece({
      view: view,
      isEditable: this.params.isEditable,
      delete_view: () => { this.deleteCurrView() },
      save_change: (text) => { this.changeText(text) },
      pick: _.noop,
      embed_view: function () {
        window.location.href = '/embed/pdb/pdb?pdb_id=' + view.pdb_id + '&view=' + view.id
      },
    })
    this.realViewDiv = viewPiece.div
    this.realViewDiv
      .css('overflow-y', 'auto')
      .css('height', '100%')
    this.viewDiv
      .empty()
      .append(this.realViewDiv)
    this.ligButton.redraw()
    this.watButton.redraw()
    if (this.hydButton) {
      this.hydButton.redraw()
    }
  }

  createViewDiv () {
    this.viewDiv = $('<div>')
      .addClass('jolecule-embed-view')
    this.div.append(this.viewDiv)
  }

  resize () {
    this.proteinDiv.width(this.div.outerWidth())
    var newHeight = this.div.outerHeight()
      - this.viewDiv.outerHeight()
      - this.statusDiv.outerHeight()
    if (exists(this.display)) {
      if (exists(this.display.renderer)) {
        this.display.renderer.domElement.style.height = newHeight
        this.display.resize()
      }
      this.scene.changed = true
    }
    this.proteinDiv.css('height', newHeight)
  }

}

export { EmbedJolecule, defaultArgs, ViewPiece }