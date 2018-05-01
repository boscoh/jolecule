import $ from 'jquery'
import scrollTo from 'jquery.scrollto' // eslint-disable-line
import _ from 'lodash'
import { EmbedJolecule, ViewPiece } from './embedjolecule'
import { getWindowUrl, linkButton, randomId, exists } from './util'

/**
 * ViewPieceList keeps track of the views
 */

class ViewPieceList {
  constructor (divTag, controller, proteinDisplay, dataServer, isEditable) {
    this.divTag = divTag
    this.display = proteinDisplay
    this.soupView = controller.soupView
    this.controller = controller
    this.isEditable = isEditable
    this.data_server = dataServer
    this.viewPiece = {}
    this.topDiv = $(this.divTag)
      .append(
        $('<div>')
          .addClass('jolecule-sub-header')
          .append('VIEWS OF PROTEIN')
          .append('<br>')
          .append('<br>')
          .append(
            linkButton(
              '', '+[v]iew', 'jolecule-button',
              () => {
                this.makeNewView()
              }))
          .append(
            linkButton(
              '', 'prev[&uarr;]', 'jolecule-button',
              () => {
                this.gotoPrevView()
              }))
          .append(
            linkButton(
              '', 'next[&darr;]', 'jolecule-button',
              () => {
                this.gotoNextView()
              }))
          .append(
            linkButton(
              '', '+l[a]bel', 'jolecule-button',
              () => {
                this.display.atomLabelDialog()
              }
            ))
          .append('<br>')
      )
      .append(
        $('<div>')
          .attr('id', 'jolecule-views')
      )
  }

  saveViewsToDataServer (success) {
    console.log('ViewPieceList.saveViewsToDataServer')
    this.data_server.save_views(
      this.controller.getViewDicts(), success)
  }

  updateViews () {
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
        viewPiece.showTextDiv.html(view.text)
      }

      let a = viewPiece.div.find('a').eq(0)
      a.text(view.order + 1)
    }
  }

  redrawSelectedViewId (id) {
    this.updateViews()
    $('#jolecule-views')
      .stop()
      .scrollTo(
        this.viewPiece[id].div, 1000, {offset: {top: -80}})
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
    this.data_server.delete_protein_view(id, () => {
      this.controller.deleteView(id)
      this.viewPiece[id].div.remove()
      delete this.viewPiece[id]
      this.updateViews()
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
      this.updateViews()
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
    this.viewPiece[id] = new ViewPiece({
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
      embed_view: () => {
        window.location.href = '/embed/pdb?pdb_id=' + view.pdb_id + '&view=' + view.id
      }
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
    let newId = randomId()
    this.controller.saveCurrentView(newId)
    this.insertNewViewDiv(newId)
    this.updateViews()
    this.viewPiece[newId].div.css('background-color', 'lightgray')
    this.saveViewsToDataServer(() => {
      console.log('ViewPieceList.makeNewView success')
      this.viewPiece[newId].div.css('background-color', '')
      $('#jolecule-views').stop()
      $('#jolecule-views').scrollTo(
        this.viewPiece[newId].div, 1000, {offset: {top: -80}})
    })
  }
}

/**
 * FullPageJolecule - full page wrapper around an embedd EmbedJolecule
 * widget. Handles keypresses and urls and adds a better views annotation
 * list tool
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
      viewId: '',
      viewHeight: 170,
      isViewTextShown: false,
      isEditable: true,
      isLoop: false,
      isGrid: true,
      backgroundColor: 0xCCCCCC
    }

    console.log('FullPageJolecule.constructor params', params)

    if (exists(params)) {
      this.params = _.assign(this.params, params)
    }

    this.embedJolecule = new EmbedJolecule(this.params)

    document.oncontextmenu = _.noop
    document.onkeydown = (e) => this.onkeydown(e)
    let resizeFn = () => { this.resize() }
    $(window).resize(resizeFn)
    window.onorientationchange = resizeFn

    this.noData = true
  }

  async asyncAddDataServer (dataServer) {
    await this.embedJolecule.asyncAddDataServer(dataServer)
    this.initViewsDisplay(dataServer)
    console.log('FullPageJolecule.asyncAddDataServer finished adding views')
  }

  initViewsDisplay (dataServer) {
    if (this.noData) {
      this.noData = false

      this.soupView = this.embedJolecule.soupView
      this.controller = this.embedJolecule.controller
      this.display = this.embedJolecule.display

      this.viewsDisplay = new ViewPieceList(
        this.viewsDisplayTag,
        this.controller,
        this.display,
        dataServer,
        this.params.isEditable)

      this.viewsDisplay.makeAllViews()
      let hashTag = getWindowUrl().split('#')[1]
      if (hashTag in this.soupView.savedViewsByViewId) {
        this.viewsDisplay.setTargetByViewId(hashTag)
      } else {
        this.viewsDisplay.setTargetByViewId('view:000000')
      }
      this.viewsDisplay.updateViews()
    }

    this.resize()
  }

  isChanged () {
    if (typeof this.soupView !== 'undefined') {
      return this.soupView.changed
    }
    return false
  };

  draw () {
    if (this.soupView.changed) {
      this.viewsDisplay.updateViews()
      this.embedJolecule.draw()
      this.soupView.changed = false
    }
  }

  animate () {
    if (typeof this.embedJolecule !== 'undefined') {
      this.embedJolecule.animate()
    }
  }

  resize (event) {
    if (typeof this.soupView !== 'undefined') {
      this.soupView.changed = true
    }
    if (typeof this.embedJolecule !== 'undefined') {
      this.embedJolecule.resize()
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
        this.viewsDisplay.makeNewView()
        return
      } else if ((c === 'K') || (event.keyCode === 37)) {
        this.gotoPrevResidue()
      } else if ((c === 'J') || (event.keyCode === 39)) {
        this.gotoNextResidue()
      } else if (event.keyCode === 38) {
        this.viewsDisplay.gotoPrevView()
      } else if (c === ' ' || event.keyCode === 40) {
        this.viewsDisplay.gotoNextView()
      } else if (c === 'B') {
        if (this.soupView.currentView.show.backboneAtom) {
          this.controller.setBackboneOption('ribbon')
        } else if (this.soupView.currentView.show.ribbon) {
          this.controller.setBackboneOption('trace')
        } else if (this.soupView.currentView.show.trace) {
          this.controller.setBackboneOption('backboneAtom')
        }
      } else if (c === 'L') {
        this.controller.toggleShowOption('ligands')
      } else if (c === 'S') {
        this.controller.toggleShowOption('sidechain')
      } else if (c === 'W') {
        this.controller.toggleShowOption('water')
      } else if (c === 'C') {
        this.display.controller.clearSelectedResidues()
      } else if (c === 'E') {
        let iView = this.display.soupView.iLastViewSelected
        if (iView > 0) {
          let viewId = this.display.soupView.savedViews[iView].id
          this.viewsDisplay.div[viewId].edit_fn()
        }
      } else if (c === 'N') {
        this.display.controller.toggleResidueNeighbors()
      } else if (c === 'A') {
        this.display.atomLabelDialog()
      } else {
        let i = parseInt(c) - 1
        if ((i || i === 0) && (i < this.soupView.savedViews.length)) {
          let id = this.soupView.savedViews[i].id
          this.viewsDisplay.setTargetByViewId(id)
        }
      }
      this.display.soupView.changed = true
    }
  }
}

export { FullPageJolecule }
