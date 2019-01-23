import $ from 'jquery'
import _ from 'lodash'
import { SoupViewController, SoupView } from './soup-view'
import { Soup } from './soup'
import { SoupWidget } from './soup-widget'
import { linkButton, delay } from './util.js'
import widgets from './widgets'

import '../dist/jolecule.css' // eslint-disable-line no-alert

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
  isResidueSelector: true,
  isLegend: false,
  isEditable: true,
  isExtraEditable: false,
  animateState: 'none', // 'loop', 'rotate', 'rock'
  isGrid: false,
  bCutoff: 0.5,
  isPlayable: false,
  maxUpdateStep: 50,
  msPerStep: 17,
  maxWaitStep: 30,
  isToolbarOnTop: false,
  isMenu: true
}

class EmbedJolecule {
  constructor(params) {
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
    this.controller = new SoupViewController(this.soupView)

    this.soupView.animateState = this.params.animateState
    this.soupView.maxUpdateStep = this.params.maxUpdateStep
    this.soupView.msPerStep = this.params.msPerStep
    this.soupView.maxWaitStep = this.params.maxWaitStep

    if (this.params.bCutoff !== null) {
      this.soup.grid.bCutoff = this.params.bCutoff
    }

    this.widget = {}

    this.createDivs()

    let resizeFn = () => this.resize()
    $(window).resize(resizeFn)
    window.onorientationchange = resizeFn
    resizeFn()
  }

  async asyncAddDataServer(dataServer) {
    while (this.isProcessing.flag) {
      await delay(100)
    }

    console.log('EmbedJolecule.asyncAddDataServer', dataServer)

    this.isProcessing.flag = true

    await this.soupWidget.asyncSetMesssage('Loading structure...')

    let asyncSetMesssage = m => this.soupWidget.asyncSetMesssage(m)

    await new Promise(resolve => {
      dataServer.getProteinData(async proteinData => {
        await this.controller.asyncLoadProteinData(
          proteinData,
          asyncSetMesssage
        )
        resolve()
      })
    })

    this.soupWidget.buildScene()

    this.resize()

    this.controller.zoomOut()

    if (_.isNil(this.soupView.dataServer)) {
      await this.soupWidget.asyncSetMesssage('Preparing views...')

      // save only first loaded dataServer for saving and deleting
      this.soupWidget.dataServer = dataServer

      await new Promise(resolve => {
        dataServer.getViews((viewDicts, viewId) => {
          this.controller.loadViewsFromViewDicts(viewDicts)
          if (viewId) {
            this.params.viewId = viewId
          }
          let isDefaultViewId =
            this.params.viewId in this.soupView.savedViewsByViewId
          if (isDefaultViewId) {
            this.controller.setTargetViewByViewId(this.params.viewId)
          }
          resolve()
        })
      })

      this.soupView.isUpdateObservers = true
    }

    this.soupWidget.cleanupMessage()

    this.isProcessing.flag = false

    console.log('EmbedJolecule.asyncAddDataServer finished')
  }

  clear() {
    while (this.soupWidget.soup.structureIds.length > 0) {
      this.soupWidget.deleteStructure(0)
    }
    // this.soupWidget.soup.selectedTraces.length = 0
  }

  createDivs() {
    this.headerDiv = $('<div>').addClass('jolecule-embed-header')
    this.div.append(this.headerDiv)
    this.bodyDiv = $('<div>')
      .attr('id', `${this.divId}-jolecule-soup-display`)
      .addClass('jolecule-embed-body')
    this.div.append(this.bodyDiv)
    this.footerDiv = $('<div>')
      .addClass('jolecule-embed-footer')
      .css({
        display: 'flex',
        'flex-wrap': 'wrap',
        'flex-direction': 'row'
      })
    this.div.append(this.footerDiv)

    let isToolbar =
      this.params.isPlayable ||
      this.params.isEditable ||
      this.params.isExtraEditable
    if (isToolbar) {
      this.toolbarDiv = $('<div>')
        .css({
          flex: '1',
          display: 'flex',
          'flex-wrap': 'wrap',
          'flex-direction': 'row'
        })
        .addClass('jolecule-embed-toolbar')
      if (this.params.isToolbarOnTop) {
        this.headerDiv.append(this.toolbarDiv)
      } else {
        this.footerDiv.append(this.toolbarDiv)
      }
    }

    this.sequenceBarDiv = $('<div>')
      .attr('id', `${this.divId}-sequence-widget`)
      .css({
        width: '100%'
      })
    if (this.params.isToolbarOnTop) {
      this.footerDiv.append(this.sequenceBarDiv)
    } else {
      this.headerDiv.append(this.sequenceBarDiv)
    }

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

    this.widget.colorLegend = new widgets.ColorLegendWidget(this.soupWidget)
    this.widget.colorLegend.isShow = this.params.isLegend

    this.widget.selection = new widgets.SelectionWidget(this.soupWidget)

    if (!isToolbar) {
      return
    }

    if (this.params.isPlayable) {
      this.playableDiv = $('<div>')
        .attr('id', `${this.divId}-playable`)
        .css({
          width: '100%',
          display: 'flex',
          'flex-direction': 'row'
        })
      this.toolbarDiv.append(this.playableDiv)

      this.playableDiv.append($(`<div id="${this.divId}-rotate">`))
      this.widget.rotate = new widgets.ToggleAnimateWidget(
        this.soupWidget,
        `#${this.divId}-rotate`,
        'rotate',
        '&orarr;'
      )

      this.playableDiv.append($(`<div id="${this.divId}-rock">`))
      this.widget.rotate = new widgets.ToggleAnimateWidget(
        this.soupWidget,
        `#${this.divId}-rock`,
        'rock',
        '&hArr;'
      )

      this.playableDiv.append(
        linkButton('<', 'jolecule-button', () => {
          this.controller.setTargetToPrevView()
        })
      )

      this.playableDiv.append($(`<div id="${this.divId}-loop">`))
      this.widget.loop = new widgets.ToggleAnimateWidget(
        this.soupWidget,
        `#${this.divId}-loop`,
        'loop',
        'Play'
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

    if (this.params.isExtraEditable) {
      if (this.params.isMenu) {
        this.toolbarDiv.append(
          $('<div>')
            .attr('id', `${this.divId}-menu`)
            .addClass('jolecule-button')
        )

        this.menuWidget = new widgets.MenuWidget(
          this.soupWidget,
          `#${this.divId}-menu`,
          !this.params.isToolbarOnTop
        )
      }
    }

    if (this.params.isEditable) {
      if (this.params.isResidueSelector) {
        this.toolbarDiv.append(
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
      }

      this.toolbarDiv.append(
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
      this.toolbarDiv.append(
        linkButton('Zoom', 'jolecule-button', () => {
          this.controller.zoomToSelection()
        })
      )

      this.toolbarDiv
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

      this.toolbarDiv.append($(`<div id="${this.divId}-ligand">`))
      this.widget.ligand = new widgets.ToggleOptionWidget(
        this.soupWidget,
        `#${this.divId}-ligand`,
        'ligands'
      )
    }

    if (this.params.isExtraEditable) {
      if (!this.params.isMenu) {
        this.toolbarDiv.append($(`<div id="${this.divId}-sphere">`))
        this.widget.sphere = new widgets.ToggleOptionWidget(
          this.soupWidget,
          `#${this.divId}-sphere`,
          'sphere'
        )

        this.toolbarDiv.append($(`<div id="${this.divId}-backbone">`))
        this.widget.backbone = new widgets.ToggleOptionWidget(
          this.soupWidget,
          `#${this.divId}-backbone`,
          'backbone'
        )

        this.toolbarDiv.append($(`<div id="${this.divId}-transparent">`))
        this.widget.transparent = new widgets.ToggleOptionWidget(
          this.soupWidget,
          `#${this.divId}-transparent`,
          'transparent'
        )
      }
    }

    if (this.headerDiv.contents().length > 0) {
      this.headerDiv.css({
        'border-bottom': '2px solid #AAA'
      })
    }

    if (this.footerDiv.contents().length > 0) {
      this.footerDiv.css({
        'border-top': '2px solid #AAA'
      })
    }
  }

  resize() {
    this.bodyDiv.width(this.div.width())
    let height = this.div.outerHeight()
    height -= this.headerDiv.outerHeight()
    height -= this.footerDiv.outerHeight()
    this.bodyDiv.css('height', height)
    this.soupWidget.resize()
  }
}

export { EmbedJolecule, defaultArgs }
