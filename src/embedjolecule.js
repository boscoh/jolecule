import $ from 'jquery'
import _ from 'lodash'
import { Soup, Controller, SoupView } from './soup'
import { Display } from './display'
import { exists, linkButton, delay } from './util.js'
import widgets from './widgets'

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
    this.sidechainWidget = new widgets.ToggleButtonWidget(this.display, '#sidechain', 'sidechain')
    this.ligandWidget = new widgets.ToggleButtonWidget(this.display, '#ligand', 'ligands')

    this.isViewTextShown = this.params.isViewTextShown

    $(window).resize(() => this.resize())
    this.resize()

    this.isProcessing = {flag: false}
  };

  async asyncLoadViews (dataServer) {
    return new Promise(resolve => {
      dataServer.get_views(viewDicts => {
        this.controller.loadViewsFromViewDicts(viewDicts)
        if (this.params.viewId in this.soupView.savedViewsByViewId) {
          this.controller.setTargetViewByViewId(this.params.viewId)
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
        this.display.draw()
        this.soupView.changed = false
      }
    }
  }

  createProteinDiv () {
    let height = this.div.outerHeight() - this.hAnnotationView
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
    this.viewBarDiv =
      $('<div style="width: 100%; display: flex; flex-direction: row">')
        .append(
          $('<div style="flex: 1; display: flex; flex-direction: row; align-items: center;">')
            .append($('<div id="res-selector" class="jolecule-button" style="box-sizing: content-box; height: 20px;"></div>'))
            .append($('<div id="sidechain"></div>'))
            .append(linkButton(
              '', 'neighbors', 'jolecule-button',
              () => { this.controller.toggleResidueNeighbors() })
            )
            .append($('<div id="ligand"></div>'))
            .append(`<div id="zslab" class="jolecule-button" style="position: relative; box-sizing: content-box; width: 120px; height: 20px;"></div>`)
        )

    this.statusDiv = $('<div style="display: flex; flex-direction: column">')
      .addClass('jolecule-embed-view-bar')
      .append(this.viewBarDiv)

    this.div.append(this.statusDiv)
  }

  resize () {
    this.proteinDiv.width(this.div.outerWidth())
    let newHeight = this.div.outerHeight() -
      this.statusDiv.outerHeight()
    this.proteinDiv.css('height', newHeight)
    this.display.resize()
  }
}

export { EmbedJolecule, defaultArgs }
