import $ from 'jquery'
import _ from 'lodash'
import { Soup, Controller, SoupView } from './soup'
import { Display } from './display'
import { exists, linkButton, delay } from './util.js'
import widgets from './widgets'
import v3 from './v3'
import { randomId } from './util'

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
  isExtraEditable: false,
  isLoop: false,
  isGrid: false,
  bCutoff: 0.5,
  isPlayable: false,
  maxUpdateStep: 30,
  msPerStep: 17,
  maxWaitStep: 30
}

class EmbedJolecule {
  constructor (params) {
    this.params = _.cloneDeep(defaultArgs)
    _.assign(this.params, params)
    console.log('EmbedJolecule.constructor', this.params)
    this.isProcessing = {flag: false}

    this.divTag = this.params.divTag
    this.div = $(this.params.divTag)
    this.div[0].oncontextmenu = _.noop

    this.soup = new Soup()
    this.soupView = new SoupView(this.soup)
    this.soupView.isLoop = this.params.isLoop
    this.soupView.maxUpdateStep = this.params.maxUpdateStep
    this.soupView.msPerStep = this.params.msPerStep
    this.soupView.maxWaitStep = this.params.maxWaitStep

    this.controller = new Controller(this.soupView)

    this.createDivs()

    let resizeFn = () => this.resize()
    $(window).resize(resizeFn)
    window.onorientationchange = resizeFn
    resizeFn()
  };

  async asyncAddDataServer (dataServer) {
    while (this.isProcessing.flag) {
      await delay(100)
    }

    console.log('EmbedJolecule.asyncAddDataServer')

    this.isProcessing.flag = true

    await this.display.asyncSetMesssage('Loading structure...')

    let asyncSetMessageFn = m => {
      this.display.asyncSetMesssage(m)
    }

    await new Promise(resolve => {
      dataServer.get_protein_data(async (proteinData) => {
        await this.controller.asyncLoadProteinData(
          proteinData, asyncSetMessageFn)
        resolve()
      })
    })

    if (this.params.bCutoff !== null) {
      this.soup.grid.bCutoff = this.params.bCutoff
    }

    this.display.buildScene()

    this.resize()

    this.controller.zoomOut()

    await this.display.asyncSetMesssage('Loading views...')

    if (this.soupView.nDataServer === 1) {
      // save only first loaded dataServer for saving and deleting
      this.display.dataServer = dataServer

      await new Promise(resolve => {
        dataServer.get_views(viewDicts => {
          this.controller.loadViewsFromViewDicts(viewDicts)
          resolve()
        })
      })

      let isDefaultViewId = this.params.viewId in this.soupView.savedViewsByViewId
      if (isDefaultViewId) {
        this.controller.setTargetViewByViewId(this.params.viewId)
      }
      this.soupView.updateObservers = true
    }

    this.display.cleanupMessage()

    this.isProcessing.flag = false
  }

  clear () {
    while (this.display.soup.structureIds.length > 0) {
      this.display.deleteStructure(0)
    }
  }

  createDivs () {
    this.headerDiv = $('<div>')
      .attr('id', 'sequence-widget')

    this.bodyDiv = $('<div>')
      .attr('id', 'jolecule-soup-display')
      .addClass('jolecule-embed-body')
      .css('overflow', 'hidden')
      .css('width', this.div.outerWidth())

    this.div
      .append(this.headerDiv)
      .append(this.bodyDiv)

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

    this.footerDiv = $('<div class="jolecule-embed-footer" style="display: flex; flex-wrap: wrap; flex-direction: row">')
    this.div.append(this.footerDiv)

    if (this.params.isPlayable) {
      this.playableDiv = $('<div id="playable" style="width: 100%; display: flex; flex-direction: row">')
      this.footerDiv.append(this.playableDiv)
      this.playableDiv.append(linkButton(
        '', '<', 'jolecule-button',
        () => { this.controller.setTargetToPrevView() }))

      this.playableDiv.append($('<div id="loop">'))
      this.loopToggleWidget = new widgets.TogglePlayButtonWidget(
        this.display, '#loop')

      this.playableDiv.append(linkButton(
        '', '>', 'jolecule-button',
        () => { this.controller.setTargetToNextView() }))

      this.playableDiv.append(
        $('<div id="view-text" class="jolecule-button" style="background-color: #BBB; flex: 1 1; box-sizing: content-box; white-space: nowrap; overflow: hidden; text-align: left">'))
      this.viewTextWidget = new widgets.ViewTextWidget(
        this.display, '#view-text')
    }

    if (this.params.isEditable) {
      this.footerDiv
        .append(
          $('<div id="res-selector" class="jolecule-button" style="padding-top: 6px; height: 24px; box-sizing: content-box;"></div>'))
      this.residueSelectorWidget = new widgets.ResidueSelectorWidget(
        this.display, '#res-selector')

      this.footerDiv
        .append(
          $('<div id="zslab" class="jolecule-button" style="flex: 1 0 120px; display: flex; flex-direction: row; justify-content: center;">'))

      this.clippingPlaneWidget = new widgets.ClippingPlaneWidget(
        this.display, '#zslab')
    }

    if (this.params.isEditable) {
      this.footerDiv
        .append(linkButton(
          '', 'Clear', 'jolecule-button', () => { this.controller.clear() }))
        .append(linkButton(
          '', 'Sidechains', 'jolecule-button', () => { this.controller.toggleSelectedSidechains() }))
        .append(linkButton(
          '', 'Neighbors', 'jolecule-button', () => { this.controller.toggleResidueNeighbors() }))

      this.footerDiv.append($('<div id="ligand">'))
      this.ligandWidget = new widgets.ToggleButtonWidget(
        this.display, '#ligand', 'ligands')
    }

    if (this.params.isEditable) {
      this.footerDiv.append($('<div id="sphere">'))
      this.spherWidget = new widgets.ToggleButtonWidget(
        this.display, '#sphere', 'sphere')

      this.footerDiv.append($('<div id="backbone">'))
      this.backboneWidget = new widgets.ToggleButtonWidget(
        this.display, '#backbone', 'backbone')

      this.footerDiv.append($('<div id="transparent">'))
      this.transparentWidget = new widgets.ToggleButtonWidget(
        this.display, '#transparent', 'transparent')
    }

  }

  resize () {
    this.bodyDiv.width(this.div.outerWidth())

    let height = this.div.outerHeight()
    if ('sequenceWidget' in this) {
      height -= this.sequenceWidget.height()
      this.bodyDiv.css('top', this.sequenceWidget.height())
    }
    if ('footerDiv' in this) {
      height -= this.footerDiv.outerHeight()
    }
    this.bodyDiv.css('height', height)

    this.display.resize()
  }
}

export { EmbedJolecule, defaultArgs }
