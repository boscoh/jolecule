import $ from 'jquery'
import _ from 'lodash'
import { Soup, Controller, SoupView } from './soup'
import { Display } from './display'
import { exists, linkButton, delay } from './util.js'
import widgets from './widgets'
import v3 from './v3'

/**
 * EmbedJolecule - the widget that shows proteins and
 * annotations
 */

let defaultArgs = {
  divTag: '',
  backgroundColor: 0x000000,
  viewId: '',
  viewHeight: 170,
  isViewTextShown: false,
  isSequenceBar: true,
  isEditable: true,
  isLoop: false,
  isGrid: false,
  bCutoff: 0.5,
  isPlayable: false,
  maxUpdateStep: 30,
  msPerStep: 17
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
    this.soupView.isLoop = params.isLoop
    this.soupView.maxUpdateStep = params.maxUpdateStep
    this.soupView.msPerStep = params.msPerStep

    this.controller = new Controller(this.soupView)

    this.nDataServer = 0

    this.createDivs()

    let resizeFn = () => this.resize()
    $(window).resize(resizeFn)
    window.onorientationchange = resizeFn
    resizeFn()
  };

  async asyncLoadProteinData (proteinData) {
    let pdbText = proteinData.pdb_text
    let pdbId = proteinData.pdb_id

    if (proteinData.pdb_text.length === 0) {
      await this.display.asyncSetMesssage('Error: no soup data')
      return
    }

    await this.display.asyncSetMesssage(`Parsing '${pdbId}'`)
    this.soup.parsePdbData(pdbText, pdbId)

    if (this.soup.parsingError) {
      let err = this.soup.parsingError
      await this.display.asyncSetMesssage(`Error parsing soup: ${err}`)
      return
    }

    this.soup.assignResidueProperties()
    this.soup.calcMaxLength()

    let nAtom = this.soup.getAtomCount()
    let nRes = this.soup.getResidueCount()
    await this.display.asyncSetMesssage(
      `Calculating bonds for ${nAtom} atoms, ${nRes} residues...`)

    this.soup.calcBondsStrategic()

    let nBond = this.soup.getBondCount()
    await this.display.asyncSetMesssage(`Calculated ${nBond} bonds.`)
    await this.display.asyncSetMesssage(`Assigning secondary structure...`)

    this.soup.findSecondaryStructure()

    this.soupView.changed = true

    if (this.params.bCutoff !== null) {
      this.soup.grid.bCutoff = this.params.bCutoff
    }

    this.display.buildScene()
    this.resize()
  }

  loadViewDicts (viewDicts) {
    this.controller.loadViewsFromViewDicts(viewDicts)
    if (this.params.viewId in this.soupView.savedViewsByViewId) {
      this.controller.setTargetViewByViewId(this.params.viewId)
    }
  }

  async asyncAddDataServer (dataServer) {
    while (this.isProcessing.flag) {
      await delay(100)
    }

    this.isProcessing.flag = true

    await this.display.asyncSetMesssage('Loading structure...')
    await new Promise(resolve => {
      dataServer.get_protein_data(async (proteinD) => {
        await this.asyncLoadProteinData(proteinD)
        resolve()
      })
    })

    this.nDataServer += 1

    if (this.nDataServer === 1) {
      await this.display.asyncSetMesssage('Loading views...')
      dataServer.get_views(viewDicts => { this.loadViewDicts(viewDicts) })
    }

    this.controller.zoomOut()

    this.display.observers.rebuilt.dispatch()
    this.display.cleanupMessage()

    this.isProcessing.flag = false
  }

  createDivs () {
    this.sequenceDiv = $('<div>')
      .attr('id', 'sequence-widget')

    this.proteinDiv = $('<div>')
      .attr('id', 'jolecule-soup-display')
      .addClass('jolecule-embed-body')
      .css('overflow', 'hidden')
      .css('width', this.div.outerWidth())

    this.div
      .append(this.sequenceDiv)
      .append(this.proteinDiv)

    this.display = new Display(
      this.soupView,
      '#jolecule-soup-display',
      this.controller,
      this.params.isGrid,
      this.params.backgroundColor)

    if (this.params.isSequenceBar) {
      this.sequenceWidget = new widgets.SequenceWidget(
        '#sequence-widget', this.display)
    }

    if (this.params.isGrid) {
      this.gridControlWidget = new widgets.GridControlWidget(this.display)
    }

    this.statusDiv = $('<div style="display: flex; flex-direction: column">')
      .addClass('jolecule-embed-view-bar')
      .append($('<div>')
        .css('width', '100%')
        .css('display', 'flex')
        .css('flex-direction', 'row')
        .append(
          $('<div style="flex: 0; display: flex; flex-direction: row; align-items: center;">')
            .append($('<div id="loop">'))
            .append($('<div id="res-selector" class="jolecule-button" style="padding-top: 6px; height: 24px; box-sizing: content-box;"></div>'))
        )
        .append(
          $('<div style="flex: 1; display: flex; flex-direction: row; justify-content: center;">')
            .append(`<div id="zslab" class="jolecule-residue-selector" style="position: relative; box-sizing: content-box; width: 100%; height: 20px;"></div>`)
        )
        .append(linkButton(
          '', 'Clear', 'jolecule-button', () => { this.controller.clear() })
        )
        .append(
          $('<div style="flex: 0; display: flex; flex-direction: row; justify-content: flex-end;">')
            .append(linkButton(
              '', 'Sidechains', 'jolecule-button',
              () => { this.controller.toggleSelectedSidechains() })
            )
            .append(linkButton(
              '', 'Neighbors', 'jolecule-button',
              () => { this.controller.toggleResidueNeighbors() })
            )
            .append($('<div id="ligand"></div>'))
        ))

    this.div.append(this.statusDiv)

    if (this.params.isPlayable) {
      this.loopToggleWidget = new widgets.TogglePlayButtonWidget(this.display, '#loop')
    }
    this.zSlabWidget = new widgets.ZSlabWidget(this.display, '#zslab')
    this.residueSelectorWidget = new widgets.ResidueSelectorWidget(this.display, '#res-selector')
    this.ligandWidget = new widgets.ToggleButtonWidget(this.display, '#ligand', 'ligands')
  }

  resize () {
    this.proteinDiv.width(this.div.outerWidth())
    let height = this.div.outerHeight()
    if ('sequenceWidget' in this) {
      height -= this.sequenceWidget.height()
      this.proteinDiv.css('top', this.sequenceWidget.height())
    }
    if ('statusDiv' in this) {
      height -= this.statusDiv.outerHeight()
    }
    this.proteinDiv.css('height', height)
    this.display.resize()
  }
}

export { EmbedJolecule, defaultArgs }
