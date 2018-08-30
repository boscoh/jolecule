import $ from 'jquery'
import _ from 'lodash'
import { Soup, Controller, SoupView } from './soup'
import { SoupWidget } from './soupWidget'
import { linkButton, delay } from './util.js'
import widgets from './widgets'

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
  isRotate: false,
  isRock: false,
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
    this.isProcessing = { flag: false }

    this.divTag = this.params.divTag
    this.div = $(this.params.divTag)
    this.divId = this.div.attr('id')
    this.div[0].oncontextmenu = _.noop

    this.soup = new Soup()
    this.soupView = new SoupView(this.soup)
    this.soupView.isLoop = this.params.isLoop
    this.soupView.isRotate = this.params.isRotate
    this.soupView.maxUpdateStep = this.params.maxUpdateStep
    this.soupView.msPerStep = this.params.msPerStep
    this.soupView.maxWaitStep = this.params.maxWaitStep

    this.controller = new Controller(this.soupView)

    this.widget = {}

    this.createDivs()

    let resizeFn = () => this.resize()
    $(window).resize(resizeFn)
    window.onorientationchange = resizeFn
    resizeFn()
  }

  async asyncAddDataServer (dataServer) {
    while (this.isProcessing.flag) {
      await delay(100)
    }

    console.log('EmbedJolecule.asyncAddDataServer')

    this.isProcessing.flag = true

    await this.soupWidget.asyncSetMesssage('Loading structure...')

    let asyncSetMesssage = m => this.soupWidget.asyncSetMesssage(m)

    await new Promise(resolve => {
      dataServer.get_protein_data(async proteinData => {
        await this.controller.asyncLoadProteinData(
          proteinData,
          asyncSetMesssage
        )
        resolve()
      })
    })

    if (this.params.bCutoff !== null) {
      this.soup.grid.bCutoff = this.params.bCutoff
    }

    this.soupWidget.buildScene()

    this.resize()

    this.controller.zoomOut()

    await this.soupWidget.asyncSetMesssage('Loading views...')

    if (this.soupView.nDataServer === 1) {
      // save only first loaded dataServer for saving and deleting
      this.soupWidget.dataServer = dataServer

      await new Promise(resolve => {
        dataServer.get_views(viewDicts => {
          this.controller.loadViewsFromViewDicts(viewDicts)
          resolve()
        })
      })

      let isDefaultViewId =
        this.params.viewId in this.soupView.savedViewsByViewId
      if (isDefaultViewId) {
        this.controller.setTargetViewByViewId(this.params.viewId)
      }
      this.soupView.updateObservers = true
    }

    this.soupWidget.cleanupMessage()

    this.isProcessing.flag = false
  }

  clear () {
    while (this.soupWidget.soup.structureIds.length > 0) {
      this.soupWidget.deleteStructure(0)
    }
  }

  createDivs () {
    this.headerDiv = $('<div>').attr('id', `${this.divId}-sequence-widget`)

    this.bodyDiv = $('<div>')
      .attr('id', `${this.divId}-jolecule-soup-display`)
      .addClass('jolecule-embed-body')
      .css({
        overflow: 'hidden',
        width: this.div.outerWidth()
      })

    this.div.append(this.headerDiv).append(this.bodyDiv)

    this.soupWidget = new SoupWidget(
      this.soupView,
      `#${this.divId}-jolecule-soup-display`,
      this.controller,
      this.params.isGrid,
      this.params.backgroundColor
    )

    if (this.params.isSequenceBar) {
      this.sequenceWidget = new widgets.SequenceWidget(
        `#${this.divId}-sequence-widget`,
        this.soupWidget
      )
    }

    if (this.params.isGrid) {
      this.widget.grid = new widgets.GridControlWidget(this.soupWidget)
    }

    let isFooter = this.params.isPlayable
      || this.params.isEditable
      || this.params.isExtraEditable

    if (!isFooter) {
      return
    }

    this.footerDiv = $('<div>')
      .addClass('jolecule-embed-footer')
      .css({
        display: 'flex',
        'flex-wrap': 'wrap',
        'flex-direction': 'row'
      })
    this.div.append(this.footerDiv)

    if (this.params.isPlayable) {
      this.playableDiv = $('<div>')
        .attr('id', `${this.divId}-playable`)
        .css({
          width: '100%',
          display: 'flex',
          'flex-direction': 'row'
        })
      this.footerDiv.append(this.playableDiv)

      this.playableDiv.append($(`<div id="${this.divId}-rotate">`))
      this.widget.rotate = new widgets.ToggleRotateWidget(
        this.soupWidget,
        `#${this.divId}-rotate`
      )

      this.playableDiv.append($(`<div id="${this.divId}-rock">`))
      this.widget.rotate = new widgets.ToggleRockWidget(
        this.soupWidget,
        `#${this.divId}-rock`
      )

      this.playableDiv.append(
        linkButton('<', 'jolecule-button', () => {
          this.controller.setTargetToPrevView()
        })
      )

      this.playableDiv.append($(`<div id="${this.divId}-loop">`))
      this.widget.loop = new widgets.TogglePlayWidget(
        this.soupWidget,
        `#${this.divId}-loop`
      )

      this.playableDiv.append(
        linkButton('>', 'jolecule-button', () => {
          this.controller.setTargetToNextView()
        })
      )

      this.playableDiv.append(
        $('<div>')
          .attr('id', `${this.divId}-view-text`)
          .addClass('jolecule-button')
          .css({
            'background-color': '#BBB',
            flex: '1 1',
            'box-sizing': 'content-box',
            'white-space': 'nowrap',
            overflow: 'hidden',
            'text-align': 'left'
          })
      )
      this.widget.view = new widgets.ViewTextWidget(
        this.soupWidget,
        `#${this.divId}-view-text`
      )
    }

    if (this.params.isEditable) {
      this.footerDiv.append(
        $('<div>')
          .attr('id', `${this.divId}-res-selector`)
          .addClass('jolecule-button')
          .css({
            'padding-top': '6px',
            height: '24px',
            'box-sizing': 'content-box'
          })
      )
      this.widget.residueSelect = new widgets.ResidueSelectorWidget(
        this.soupWidget,
        `#${this.divId}-res-selector`
      )

      this.footerDiv.append(
        $('<div>')
          .attr('id', `${this.divId}-clipping-plane`)
          .addClass('jolecule-button')
          .css({
            flex: '1 0 120px',
            display: 'flex',
            'flex-diretion': 'row',
            'justify-content': 'center'
          })
      )
      this.widget.clippingPlane = new widgets.ClippingPlaneWidget(
        this.soupWidget,
        `#${this.divId}-clipping-plane`
      )
    }

    if (this.params.isEditable) {
      this.footerDiv.append(
        linkButton('Zoom', 'jolecule-button', () => {
          this.controller.zoomToSelection()
        })
      )

      this.footerDiv
        .append(
          linkButton('Clear', 'jolecule-button', () => {
            this.controller.clear()
          })
        )
        .append(
          linkButton('Sidechains', 'jolecule-button', () => {
            this.controller.toggleSelectedSidechains()
          })
        )
        .append(
          linkButton('Neighbors', 'jolecule-button', () => {
            this.controller.toggleResidueNeighbors()
          })
        )

      this.footerDiv.append($(`<div id="${this.divId}-ligand">`))
      this.widget.ligand = new widgets.ToggleOptionWidget(
        this.soupWidget,
        `#${this.divId}-ligand`,
        'ligands'
      )
    }

    if (this.params.isExtraEditable) {
      this.footerDiv.append($(`<div id="${this.divId}-sphere">`))
      this.widget.sphere = new widgets.ToggleOptionWidget(
        this.soupWidget,
        `#${this.divId}-sphere`,
        'sphere'
      )

      this.footerDiv.append($(`<div id="${this.divId}-backbone">`))
      this.widget.backbone = new widgets.ToggleOptionWidget(
        this.soupWidget,
        `#${this.divId}-backbone`,
        'backbone'
      )

      this.footerDiv.append($(`<div id="${this.divId}-transparent">`))
      this.widget.transparent = new widgets.ToggleOptionWidget(
        this.soupWidget,
        `#${this.divId}-transparent`,
        'transparent'
      )
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

    this.soupWidget.resize()
  }
}

export { EmbedJolecule, defaultArgs }
