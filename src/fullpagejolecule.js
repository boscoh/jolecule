import $ from 'jquery'
import scrollTo from 'jquery.scrollto' // eslint-disable-line
import _ from 'lodash'
import { EmbedJolecule } from './embedjolecule'
import { getWindowUrl, linkButton, randomId, exists } from './util'

class ViewPanel {
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
    this.makeEditDiv()
    this.makeShowDiv()
  }

  saveChange () {
    console.log('ViewPiece.saveChange')
    let changedText = this.editTextArea.val()
    this.editDiv.hide()
    this.showDiv.show()
    this.showTextDiv.html(changedText)
    this.params.saveChange(changedText)
    window.keyboard_lock = false
  }

  startEdit () {
    this.params.pick()
    this.editTextArea.text(this.params.view.text)
    this.editDiv.show()
    this.showDiv.hide()
    let textarea = this.editTextArea.find('textarea')
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
    let view = this.params.view

    let editButton = linkButton(
      '', 'edit', 'jolecule-small-button',
      () => { this.startEdit() })

    this.showTextDiv = $('<div>')
      .addClass('jolecule-button')
      .css('height', 'auto')
      .css('background-color', '#BBB')
      .css('text-align', 'left')
      .on('click touch',
        (e) => {
          e.preventDefault()
          this.params.pick()
        }
      )

    this.showDiv = $('<div>')
      .css('width', '100%')
      .append(this.showTextDiv)

    let isEditable = this.params.isEditable &&
      (!view.lock) &&
      (view.id !== 'view:000000')

    if (isEditable) {
      this.showTextDiv.css('margin-bottom', '7px')

      this.showDiv.append(editButton)

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

/**
 * ViewPanelList keeps track of the ViewPanel's
 */
class ViewPanelList {
  constructor (divTag, soupDisplay, dataServer, isEditable) {
    this.divTag = divTag
    this.display = soupDisplay
    this.soupView = soupDisplay.soupView
    this.controller = soupDisplay.controller
    this.isEditable = isEditable
    this.dataServer = dataServer
    this.viewPiece = {}
    this.topDiv = $(this.divTag)
      .append(
        $('<div>')
          .addClass('jolecule-sub-header')
          .append('SAVED VIEWS')
      )
      .append(
        $('<div>')
          .attr('id', 'jolecule-views')
      )
  }

  saveViewsToDataServer (success) {
    console.log('ViewPieceList.saveViewsToDataServer')
    this.dataServer.save_views(
      this.controller.getViewDicts(), success)
  }

  update () {
    for (let id in this.viewPiece) {
      if (!(id in this.soupView.savedViewsByViewId)) {
        this.viewPiece[id].div.remove()
        delete this.viewPiece[id]
      }
    }
    for (let i = 0; i < this.soupView.savedViews.length; i++) {
      let view = this.soupView.savedViews[i]
      let id = view.id

      if (!(view.id in this.viewPiece)) {
        this.insertNewViewDiv(view.id)
      }

      let iLastView = this.soupView.iLastViewSelected
      let lastId = this.soupView.savedViews[iLastView].id

      if (lastId === id) {
        this.viewPiece[id].div.removeClass('jolecule-unselected-box')
        this.viewPiece[id].div.addClass('jolecule-selected-box')
      } else {
        this.viewPiece[id].div.removeClass('jolecule-selected-box')
        this.viewPiece[id].div.addClass('jolecule-unselected-box')
      }

      let viewPiece = this.viewPiece[id]
      if (view.text !== viewPiece.showTextDiv.html()) {
        viewPiece.showTextDiv.html(viewPiece.params.goto + ": " + view.text)
      }

      let a = viewPiece.div.find('a').eq(0)
      a.text(view.order + 1)
    }
  }

  redrawSelectedViewId (id) {
    this.update()
    $('#jolecule-views')
      .stop()
      .scrollTo(
        this.viewPiece[id].div,
        1000,
        {offset: {top: -80}}
      )
  }

  setTargetByViewId (id) {
    this.controller.setTargetViewByViewId(id)
    this.redrawSelectedViewId(id)
    window.location.hash = id
  }

  gotoPrevView () {
    let id = this.controller.setTargetToPrevView()
    this.redrawSelectedViewId(id)
    window.location.hash = id
  }

  gotoNextView () {
    let id = this.controller.setTargetToNextView()
    this.redrawSelectedViewId(id)
    window.location.hash = id
  }

  removeView (id) {
    console.log('ViewPieceList.removeView')
    this.viewPiece[id].div.css('background-color', 'lightgray')
    this.dataServer.delete_protein_view(id, () => {
      this.controller.deleteView(id)
      this.viewPiece[id].div.remove()
      delete this.viewPiece[id]
      this.update()
    })
  }

  swapViews (i, j) {
    let iId = this.soupView.savedViews[i].id
    let jId = this.soupView.savedViews[j].id
    let iDiv = this.viewPiece[iId].div
    let jDiv = this.viewPiece[jId].div

    this.controller.swapViews(i, j)

    iDiv.css('background-color', 'lightgray')
    jDiv.css('background-color', 'lightgray')

    this.saveViewsToDataServer(() => {
      jDiv.insertBefore(iDiv)
      this.update()
      iDiv.css('background-color', '')
      jDiv.css('background-color', '')
    })
  }

  swapUp (viewId) {
    let i = this.soupView.getIViewFromViewId(viewId)
    if (i < 2) {
      return
    }
    this.swapViews(i - 1, i)
  }

  swapDown (viewId) {
    let i = this.soupView.getIViewFromViewId(viewId)
    if (i > this.soupView.savedViews.length - 2) {
      return
    }
    this.swapViews(i, i + 1)
  }

  makeViewDiv (id) {
    let view = this.soupView.savedViewsByViewId[id]
    this.viewPiece[id] = new ViewPanel({
      view: view,
      isEditable: this.isEditable,
      delete_view: () => {
        this.removeView(id)
      },
      save_change: (changedText) => {
        view.text = changedText
        this.viewPiece[id].div.css('background-color', 'lightgray')
        this.saveViewsToDataServer(() => {
          this.viewPiece[id].div.css('background-color', '')
        })
        this.soupView.changed = true
      },
      pick: () => {
        this.setTargetByViewId(id)
      },
      goto: view.order + 1,
      swapUp: () => {
        this.swapUp(id)
      },
      swapDown: () => {
        this.swapDown(id)
      },
    })
    return this.viewPiece[id].div
  }

  makeAllViews () {
    for (let i = 0; i < this.soupView.savedViews.length; i += 1) {
      let id = this.soupView.savedViews[i].id
      let div = this.makeViewDiv(id)
      $('#jolecule-views').append(div)
    }
  }

  insertNewViewDiv (newId) {
    let div = this.makeViewDiv(newId)
    if (this.soupView.iLastViewSelected === this.soupView.savedViews.length - 1) {
      $('#jolecule-views').append(div)
    } else {
      let j = this.soupView.iLastViewSelected - 1
      let jId = this.soupView.savedViews[j].id
      let jDiv = this.viewPiece[jId].div
      div.insertAfter(jDiv)
    }
  }

  makeNewView () {
    console.log('ViewPieceList.makeNewView')
    this.controller.saveCurrentView()
    this.insertNewViewDiv(newId)
    this.update()
    this.viewPiece[newId].div.css('background-color', 'lightgray')
    this.saveViewsToDataServer(() => {
      console.log('ViewPieceList.makeNewView success')
      this.viewPiece[newId].div.css('background-color', '')
      $('#jolecule-views')
        .stop()
        .scrollTo(this.viewPiece[newId].div, 1000, {offset: {top: -80}})
    })
  }
}

/**
 * FullPageJolecule - full page wrapper around an embedded EmbedJolecule
 * widget. Handles keypresses and urls and adds a view list side-panel
 * FullPageJolecule satisfies the interface for animation.js
 */
class FullPageJolecule {
  constructor (
    proteinDisplayTag,
    sequenceDisplayTag,
    viewsDisplayTag,
    params) {
    this.viewsDisplayTag = viewsDisplayTag
    this.sequenceDisplayTag = sequenceDisplayTag
    this.params = {
      divTag: proteinDisplayTag,
      backgroundColor: 0xCCCCCC,
      viewId: '',
      viewHeight: 170,
      isViewTextShown: false,
      isSequenceBar: true,
      isEditable: true,
      isLoop: false,
      isGrid: true,
      bCutoff: 0.5,
      isPlayable: false,
      maxUpdateStep: 30,
      msPerStep: 17

    }
    console.log('FullPageJolecule.constructor params', params)
    if (exists(params)) {
      this.params = _.assign(this.params, params)
    }
    this.embedJolecule = new EmbedJolecule(this.params)
    this.embedJolecule.display.addObserver(this)
    document.oncontextmenu = _.noop
    document.onkeydown = (e) => { this.onkeydown(e) }
    this.noData = true
  }

  async asyncAddDataServer (dataServer) {
    await this.embedJolecule.asyncAddDataServer(dataServer)
    this.initViewsDisplay(dataServer)
    console.log('FullPageJolecule.asyncAddDataServer added dataserver')
  }

  initViewsDisplay (dataServer) {
    if (this.noData) {
      this.noData = false

      this.soupView = this.embedJolecule.soupView
      this.controller = this.embedJolecule.controller
      this.display = this.embedJolecule.display

      this.viewPanelList = new ViewPanelList(
        this.viewsDisplayTag,
        this.display,
        dataServer,
        this.params.isEditable)

      this.viewPanelList.makeAllViews()
      let hashTag = getWindowUrl().split('#')[1]
      if (hashTag in this.soupView.savedViewsByViewId) {
        this.viewPanelList.setTargetByViewId(hashTag)
      } else {
        this.viewPanelList.setTargetByViewId('view:000000')
      }
      this.viewPanelList.update()

      this.embedJolecule.resize()
    }
  }

  update () {
    if (!_.isUndefined(this.viewPanelList)) {
      this.viewPanelList.update()
    }
  }

  gotoPrevResidue () {
    this.controller.setTargetToPrevResidue()
  }

  gotoNextResidue () {
    this.controller.setTargetToNextResidue()
  }

  onkeydown (event) {
    if (!window.keyboard_lock) {
      let c = String.fromCharCode(event.keyCode).toUpperCase()
      if (c === 'V') {
        this.viewPanelList.makeNewView()
        return
      } else if ((c === 'K') || (event.keyCode === 37)) {
        this.gotoPrevResidue()
      } else if ((c === 'J') || (event.keyCode === 39)) {
        this.gotoNextResidue()
      } else if (event.keyCode === 38) {
        this.viewPanelList.gotoPrevView()
      } else if (c === ' ' || event.keyCode === 40) {
        this.viewPanelList.gotoNextView()
      } else if (c === 'B') {
        if (this.soupView.currentView.show.backboneAtom) {
          this.controller.setBackboneOption('ribbon')
        } else if (this.soupView.currentView.show.ribbon) {
          this.controller.setBackboneOption('backboneAtom')
        }
      } else if (c === 'L') {
        this.controller.toggleShowOption('ligands')
      } else if (c === 'W') {
        this.controller.toggleShowOption('water')
      } else if (c === 'E') {
        let iView = this.display.soupView.iLastViewSelected
        if (iView > 0) {
          let viewId = this.display.soupView.savedViews[iView].id
          this.viewPanelList.div[viewId].edit_fn()
        }
      } else if (c === 'N') {
        this.display.controller.toggleResidueNeighbors()
      } else if (c === 'A') {
        this.display.atomLabelDialog()
      } else {
        let i = parseInt(c) - 1
        if ((i || i === 0) && (i < this.soupView.savedViews.length)) {
          let id = this.soupView.savedViews[i].id
          this.viewPanelList.setTargetByViewId(id)
        }
      }
      this.display.soupView.changed = true
    }
  }
}

export { FullPageJolecule }
