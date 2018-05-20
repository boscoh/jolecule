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
    this.isProcessing = {flag: false}

    this.divTag = this.params.divTag
    this.div = $(this.params.divTag)
    this.div[0].oncontextmenu = _.noop

    this.soup = new Soup()
    this.soupView = new SoupView(this.soup)
    this.controller = new Controller(this.soupView)

    this.createProteinDiv()
    this.createStatusDiv()

    let resizeFn = () => this.resize()
    $(window).resize(resizeFn)
    window.onorientationchange = resizeFn
    resizeFn()
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

        if (this.soup.parsingError) {
          let err = this.soup.parsingError
          await this.display.asyncSetMesssage(`Error parsing soup: ${err}`)
          resolve()
          return
        }

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

        this.soupView.changed = true

        this.display.buildScene()
        this.resize()

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

  createProteinDiv () {
    let height = this.div.outerHeight()
    this.proteinDiv =
      $('<div>')
        .attr('id', 'jolecule-soup-display')
        .addClass('jolecule-embed-body')
        .css('overflow', 'hidden')
        .css('width', this.div.outerWidth())
        .css('height', height)
    this.div.append(this.proteinDiv)
    this.display = new Display(
      this.soupView,
      '#jolecule-soup-display',
      this.controller,
      this.params.isGrid,
      this.params.backgroundColor)
  }

  createStatusDiv () {
    this.viewBarDiv =
      $('<div style="width: 100%; display: flex; flex-direction: row">')
        .append(
          $('<div style="flex: 0; display: flex; flex-direction: row; align-items: center;">')
            .append($('<div id="res-selector" class="jolecule-button" style="padding-top: 6px; height: 24px; box-sizing: content-box;"></div>'))
        )
        .append(
          $('<div style="flex: 1; display: flex; flex-direction: row; justify-content: center;">')
            .append(`<div id="zslab" class="jolecule-button" style="position: relative; box-sizing: content-box; width: 100%; height: 20px;"></div>`)
        )
        .append(
          $('<div style="flex: 0; display: flex; flex-direction: row; justify-content: flex-end;">')
            .append($('<div id="sidechain"></div>'))
            .append(linkButton(
              '', 'Neighbors', 'jolecule-button',
              () => { this.controller.toggleResidueNeighbors() })
            )
            .append($('<div id="ligand"></div>'))
        )
    this.statusDiv = $('<div style="display: flex; flex-direction: column">')
      .addClass('jolecule-embed-view-bar')
      .append(this.viewBarDiv)
    this.div.append(this.statusDiv)
    this.sequenceWidget = new widgets.SequenceWidget(this.display)
    this.zSlabWidget = new widgets.ZSlabWidget(this.display, '#zslab')
    this.gridControlWidget = new widgets.GridControlWidget(this.display)
    this.residueSelectorWidget = new widgets.ResidueSelectorWidget(this.display, '#res-selector')
    this.sidechainWidget = new widgets.ToggleButtonWidget(this.display, '#sidechain', 'sidechain')
    this.ligandWidget = new widgets.ToggleButtonWidget(this.display, '#ligand', 'ligands')
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
