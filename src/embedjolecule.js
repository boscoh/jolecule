import $ from 'jquery'
import _ from 'lodash'
import { Soup, Controller, SoupView } from './soup'
import { Display } from './display'
import {
  exists,
  linkButton,
  toggleButton,
  randomId,
  delay
} from './util.js'

class ViewPiece {
  /**
   * @param {Object} params {
   *    goto,
   *    saveChage(txt),
   *    pick,
   *    view,
   *    deleteView,
   *    isEditable,
   *    swapUp
   * }
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

      if (exists(this.params.deleteView)) {
        this.showDiv
          .append(
            $('<div>')
              .css('float', 'right')
              .append(
                linkButton(
                  '', 'delete', 'jolecule-small-button',
                  () => {
                    console.log('ViewPiece.deleteButton')
                    this.params.deleteView()
                  })))
      }
    }

    this.div.append(this.showDiv)
  }

}

/**

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
    this.soupView = new SoupView(this.soup)
    this.controller = new Controller(this.soupView)

    this.residueSelector = null

    this.createProteinDiv()
    this.display = new Display(
      this.soupView,
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

  async asyncLoadViews (dataServer) {
    return new Promise(success => {
      dataServer.get_views(viewDicts => {

        this.controller.loadViewsFromViewDicts(viewDicts)

        let viewId = this.soupView.currentView.id
        if (this.initViewId) {
          if (this.initViewId in this.soupView.savedViewsByViewId) {
            viewId = this.initViewId
          }
        }
        this.updateView()

        if (this.params.viewId in this.soupView.savedViewsByViewId) {
          this.controller.setTargetViewByViewId(this.params.viewId)
          this.updateView()
        }

        success()
      })
    })
  }

  async asyncLoadSoup (dataServer) {
    return new Promise(success => {
      dataServer.get_protein_data(async (proteinData) => {

        if (proteinData.pdb_text.length == 0) {
          await this.display.asyncSetMesssage('Error: no soup data')
          success()
          return
        }

        await this.display.asyncSetMesssage('Parsing \'' + proteinData.pdb_id + '\'')
        this.soup.parsePdbData(proteinData.pdb_text, proteinData.pdb_id)
        this.soup.assignResidueSsAndCentralAtoms()

        await this.display.asyncSetMesssage(
          `Loaded ${this.soup.getAtomCount()} atoms, ${this.soup.getResidueCount()} residues.` +
          ` Calculating bonds...`)
        this.soup.calcBondsStrategic()

        await this.display.asyncSetMesssage(
          `Calculated ${this.soup.getBondCount()} bonds. Calculating bacbkone H-bond...`)
        this.soup.findBackboneHbonds()

        await this.display.asyncSetMesssage(`Assigning secondary structure...`)
        this.soup.findSecondaryStructure()

        await this.display.asyncSetMesssage(`Making residue labels...`)
        this.populateResidueSelector()
        this.soup.calcMaxLength()

        if (this.soup.parsingError) {
          await this.display.asyncSetMesssage('Error parsing soup: ' + this.soup.parsingError)
          success()
          return
        }
        this.display.buildScene()
        success()
      })
    })
  }

  async asyncAddDataServer (dataServer) {
    while (this.isProcessing.flag) {
      await delay(100)
    }
    this.isProcessing.flag = true

    await this.asyncLoadSoup(dataServer)

    this.display.nDataServer += 1

    if (this.display.nDataServer === 1) {
      await this.display.asyncSetMesssage('Loading views...')
      await this.asyncLoadViews(dataServer)
    }

    this.display.cleanupMessage()

    this.isProcessing.flag = false
  }

  saveViewsToDataServer (success) {
    this.dataServer.save_views(
      this.controller.getViewDicts(), success)
    this.soupView.changed = true
  }

  saveCurrView () {
    var newId = randomId()
    this.controller.saveCurrentView(newId)
    this.updateView()
    this.viewDiv.css('background-color', 'lightgray')
    this.saveViewsToDataServer(() => { this.viewDiv.css('background-color', '') })
  }

  getCurrView () {
    var i = this.soupView.iLastViewSelected
    if (i in this.soupView.savedViews) {
      var id = this.soupView.savedViews[i].id
      return this.soupView.savedViewsByViewId[id]
    } else {
      return this.soupView.savedViews[0]
    }
  }

  changeText (newText) {
    var view = this.getCurrView()
    view.text = newText
    this.viewDiv.css('background-color', 'lightgray')
    this.saveViewsToDataServer(
      () => { this.viewDiv.css('background-color', '') })
    this.soupView.changed = true
  }

  deleteCurrView () {
    var i = this.soupView.iLastViewSelected
    if (i == 0) {
      // skip default view:000000
      return
    }
    var id = this.soupView.savedViews[i].id
    this.controller.deleteView(id)
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
        if (this.soupView.nUpdateStep <= 0) {
          // loop started
          this.soupView.nUpdateStep -= 1
          if (this.soupView.nUpdateStep < -100) {
            this.controller.setTargetToNextView()
            this.soupView.changed = true
          }
        }
      }
    }
  };

  draw () {
    if (exists(this.display)) {
      if (this.soupView.changed) {
        this.updateView()
        this.display.draw()
        this.populateResidueSelector()
        this.soupView.changed = false
      }
    }
  }

  cycleBackbone () {
    if (this.soupView.currentView.show.backboneAtom) {
      this.controller.setBackboneOption('ribbon')
    } else if (this.soupView.currentView.show.ribbon) {
      this.controller.setBackboneOption('trace')
    } else if (this.soupView.currentView.show.trace) {
      this.controller.setBackboneOption('backboneAtom')
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
    this.controller.soupView.changed = true
  }

  toggleTextState () {
    this.isViewTextShown = !this.isViewTextShown
    this.setTextState()
  }

  gotoPrevView () {
    this.controller.setTargetToPrevView()
    this.updateView()
  }

  gotoNextView () {
    this.controller.setTargetToNextView()
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
    let residue = this.soup.getResidueProxy()
    for (let i = 0; i < this.soup.getResidueCount(); i++) {
      residue.iRes = i
      let text = residue.resId + '-' + residue.resType
      this.residueSelector.append(
        $('<option>').attr('value', i).text(text))
    }

    let iAtom = this.soupView.currentView.iAtom
    let iRes = this.soup.getAtomProxy(iAtom).iRes
    this.residueSelector.val(iRes)
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
        'saveView', '+', 'jolecule-button', () => { this.saveCurrView() })
    }

    this.ligButton = toggleButton(
      '', 'lig', 'jolecule-button',
      () => this.controller.getShowOption('ligands'),
      (b) => { this.controller.setShowOption('ligands', b) }
    )

    this.watButton = toggleButton(
      '', 'water', 'jolecule-button',
      () => this.controller.getShowOption('water'),
      (b) => { this.controller.setShowOption('water', b) }
    )

    this.hydButton = toggleButton(
      '', 'h', 'jolecule-button',
      () => this.controller.getShowOption('hydrogen'),
      (b) => { this.controller.setShowOption('hydrogen', b) }
    )
    this.hydButton = ''

    var backboneButton = linkButton(
      '', 'backbone', 'jolecule-button',
      () => { this.cycleBackbone() })

    var allSidechainButton = linkButton('', 'all', 'jolecule-button',
      () => { this.controller.setShowOption('sidechain', true) })

    var clearSidechainButton = linkButton(
      '', 'x', 'jolecule-button',
      () => {
        this.controller.setShowOption('sidechain', false)
        this.controller.clearSelectedResidues()
      })

    var nearSidechainButton = linkButton(
      '', 'near', 'jolecule-button',
      () => { this.controller.toggleResidueNeighbors() })

    this.residueSelector = $('<select>')
      .addClass('jolecule-residue-selector')
      .css({
        'outline': 'none',
        '-moz-appearance': 'none',
      })

    this.residueSelector.change(() => {
      var iRes = parseInt(this.residueSelector.find(':selected').val())
      this.display.setTargetViewFromAtom(
        this.soupView.soup.getResidueProxy(iRes).iAtom)
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
    var nView = this.soupView.savedViews.length
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
      }
      this.soupView.changed = true
    }
    this.proteinDiv.css('height', newHeight)
    this.display.resize()
  }

}

export { EmbedJolecule, defaultArgs, ViewPiece }