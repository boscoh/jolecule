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
import widgets from './widgets'
import * as THREE from 'three'

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

    this.showTextDiv = $('<div>')
      .addClass('jolecule-view-text')
      .html(this.params.view.text)

    this.showDiv = $('<div>')
      .css('width', '100%')
      .append(this.showTextDiv)

    if (view.id !== 'view:000000') {
      this.showDiv
        .append(
          $('<div>')
            .addClass('jolecule-author')
            .html(view.creator)
        )
    }

    let isEditable = this.params.isEditable &&
      (!view.lock) &&
      (view.id !== 'view:000000')

    if (isEditable) {
      // this.showDiv
      //   .append(embedButton)
      //   .append(' ');

      this.showDiv
        .append(editButton)

      if (exists(this.params.swapUp) && this.params.swapUp) {
        this.showDiv
          .append(' ')
          .append(
            linkButton(
              '', 'up', 'jolecule-small-button',
              () => { this.params.swapUp() }))
      }

      if (exists(this.params.swapUp) && this.params.swapDown) {
        this.showDiv
          .append(' ')
          .append(
            linkButton(
              '', 'down', 'jolecule-small-button',
              () => { this.params.swapDown() }))
      }

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

class OptionButtonWidget {
  constructor (display, selector, option) {
    this.controller = display.controller
    this.display = display
    this.option = option
    this.div = $(selector)
    this.div
      .attr('href', '')
      .html('sidechains')
      .addClass('jolecule-button')
    this.div.on('click touch',
      (e) => {
        e.preventDefault()
        this.callback()
      }
    )
    this.display.addObserver(this)
  }

  callback () {
    let newOptionVal = !this.controller.getShowOption(this.option)
    console.log('ButtonWidget.callback', newOptionVal)
    this.controller.setShowOption(this.option, newOptionVal)
    if (newOptionVal === false) {
      this.controller.clearSelectedResidues()
    }
    this.draw()
  }

  draw () {
    if (this.controller.getShowOption(this.option)) {
      this.div.addClass('jolecule-button-toggle-on')
    } else {
      this.div.removeClass('jolecule-button-toggle-on')
    }
  }
}

/**
 * EmbedJolecule - the widget that shows proteins and
 * annotations
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

    this.createProteinDiv()

    this.display = new Display(
      this.soupView,
      '#jolecule-soup-display',
      this.controller,
      params.isGrid,
      params.backgroundColor)

    this.createStatusDiv()

    this.sequenceWidget = new widgets.SequenceWidget(this.display)
    this.zSlabWidget = new widgets.ZSlabWidget(this.display, '#zslab')
    this.gridControlWidget = new widgets.GridControlWidget(this.display)
    this.residueSelectorWidget = new widgets.ResidueSelectorWidget(this.display, '#res-selector')
    this.sidechainWidget = new OptionButtonWidget(this.display, '#sidechain', 'sidechain')

    this.createViewDiv()

    this.isViewTextShown = this.params.isViewTextShown
    this.setTextState()

    $(window).resize(() => this.resize())

    this.resize()

    this.isProcessing = {flag: false}
  };

  async asyncLoadViews (dataServer) {
    return new Promise(resolve => {
      dataServer.get_views(viewDicts => {
        this.controller.loadViewsFromViewDicts(viewDicts)

        this.updateView()

        if (this.params.viewId in this.soupView.savedViewsByViewId) {
          this.controller.setTargetViewByViewId(this.params.viewId)
          this.updateView()
        }

        resolve()
      })
    })
  }

  async asyncLoadSoup (dataServer) {
    return new Promise(resolve => {
      dataServer.get_protein_data(async (proteinData) => {
        let pdbText = proteinData.pdb_text
        let pdbId = proteinData.pdb_id

        if (proteinData.pdb_text.length === 0) {
          await this.display.asyncSetMesssage('Error: no soup data')
          resolve()
          return
        }

        await this.display.asyncSetMesssage(`Parsing '${pdbId}'`)
        this.soup.parsePdbData(pdbText, pdbId)
        this.soup.assignResidueSsAndCentralAtoms()
        this.soup.calcMaxLength()

        let nAtom = this.soup.getAtomCount()
        let nRes = this.soup.getResidueCount()
        await this.display.asyncSetMesssage(
          `Calculating bonds for ${nAtom} atoms, ${nRes} residues...`)
        this.soup.calcBondsStrategic()

        let nBond = this.soup.getBondCount()
        await this.display.asyncSetMesssage(`Calculated ${nBond} bonds.`)
        await this.display.asyncSetMesssage(`Assigning secondary structure...`)
        this.soup.findBackboneHbonds()
        this.soup.findSecondaryStructure()

        if (this.soup.parsingError) {
          let err = this.soup.parsingError
          await this.display.asyncSetMesssage(`Error parsing soup: ${err}`)
        } else {
          this.display.buildScene()
        }

        resolve()
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
    if (i === 0) {
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
        this.soupView.changed = false
      }
    }
  }

  cycleBackbone () {
    if (!this.soupView.currentView.show.ribbon) {
      this.controller.setBackboneOption('ribbon')
    } else {
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
    var height = this.div.outerHeight() - this.hAnnotationView
    this.proteinDiv =
      $('<div>')
        .attr('id', 'jolecule-soup-display')
        .addClass('jolecule-embed-body')
        .css('overflow', 'hidden')
        .css('width', this.div.outerWidth())
        .css('height', height)
    this.div.append(this.proteinDiv)
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

    this.ligandButton = toggleButton(
      '', 'ligands', 'jolecule-button',
      () => this.controller.getShowOption('ligands'),
      (b) => { this.controller.setShowOption('ligands', b) }
    )

    var nearSidechainButton = linkButton(
      '', 'neighbors', 'jolecule-button',
      () => { this.controller.toggleResidueNeighbors() })

    this.viewBarDiv =
      $('<div style="width: 100%; display: flex; flex-direction: row">')
        .append(
          $('<div style="flex: 1; display: flex; flex-direction: row; align-items: center;">')
            .append($('<div id="res-selector" class="jolecule-button"></div>'))
            .append($('<div id="sidechain"></div>'))
            .append(nearSidechainButton)
            .append(this.ligandButton)
        )
        .append(
          $('<div style="flex: 1; display: flex; flex-direction: row; justify-content: flex-end;">')
            .append(`<div id="zslab" class="jolecule-button" style="margin-left: 2px; position: relative; width: 200px; height: 40px;"></div>`)
        )

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
      }
    })
    this.realViewDiv = viewPiece.div
    this.realViewDiv
      .css('overflow-y', 'auto')
      .css('height', '100%')
    this.viewDiv
      .empty()
      .append(this.realViewDiv)
    this.ligandButton.redraw()
  }

  createViewDiv () {
    this.viewDiv = $('<div>')
      .addClass('jolecule-embed-view')
    this.div.append(this.viewDiv)
  }

  resize () {
    this.proteinDiv.width(this.div.outerWidth())
    var newHeight = this.div.outerHeight() -
      this.viewDiv.outerHeight() -
      this.statusDiv.outerHeight()
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
