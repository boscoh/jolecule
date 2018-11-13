import $ from 'jquery'
import scrollTo from 'jquery.scrollto' // eslint-disable-line
import _ from 'lodash'
import { EmbedJolecule } from './embed-widget'
import { linkButton, exists } from './util'

class ViewPanel {
  /**
   * @param {Object} params {
   *    saveChange(txt),
   *    pick,
   *    view,
   *    deleteView,
   *    isEditable,
   *    swapUp
   * }
   */
  constructor(params) {
    this.params = params
    this.div = $('<div>').addClass('jolecule-view')
    this.makeEditDiv()
    this.makeShowDiv()
  }

  saveChange() {
    console.log('ViewPiece.saveChange')
    let changedText = this.editTextArea.val()
    this.editDiv.hide()
    this.showDiv.show()
    this.params.saveChange(changedText)
    window.keyboardLock = false
  }

  startEdit() {
    this.params.pick()
    this.editTextArea.text(this.params.view.text)
    this.editDiv.show()
    this.showDiv.hide()
    let textarea = this.editTextArea.find('textarea')
    setTimeout(function() {
      textarea.focus()
    }, 100)
    window.keyboardLock = true
  }

  discardChange() {
    this.editDiv.hide()
    this.showDiv.show()
    window.keyboardLock = false
  }

  makeEditDiv() {
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
        linkButton('save', 'jolecule-small-button', event => {
          this.saveChange()
        })
      )
      .append(' &nbsp; ')
      .append(
        linkButton('discard', 'jolecule-small-button', event => {
          this.discardChange()
        })
      )
      .hide()

    this.div.append(this.editDiv)
  }

  makeShowDiv() {
    let view = this.params.view

    let editButton = linkButton('edit', 'jolecule-small-button', () => {
      this.startEdit()
    })

    this.showTextDiv = $('<div>')
      .addClass('jolecule-button')
      .css('height', 'auto')
      .css('padding', '0')
      .css('background-color', '#BBB')
      .css('text-align', 'left')
      .on('click touch', e => {
        // allow links in button to be activated
        if (e.target.tagName === 'A') {
          window.location.href = e.target.href
        } else {
          e.preventDefault()
          this.params.pick()
        }
      })

    this.showDiv = $('<div>')
      .css('width', '100%')
      .append(this.showTextDiv)

    let isEditable =
      this.params.isEditable && !view.lock && view.id !== 'view:000000'

    if (isEditable) {
      this.showTextDiv.css('margin-bottom', '7px')

      this.showDiv.append(editButton)

      if (exists(this.params.swapUp)) {
        this.showDiv.append(' ').append(
          linkButton('up', 'jolecule-small-button', () => {
            this.params.swapUp()
          })
        )
      }

      if (exists(this.params.swapUp)) {
        this.showDiv.append(' ').append(
          linkButton('down', 'jolecule-small-button', () => {
            this.params.swapDown()
          })
        )
      }

      if (exists(this.params.deleteView)) {
        this.showDiv.append(
          $('<div>')
            .css('float', 'right')
            .append(
              linkButton('delete', 'jolecule-small-button', () => {
                console.log('ViewPiece.deleteButton')
                this.params.deleteView()
              })
            )
        )
      }
    }

    this.div.append(this.showDiv)
  }
}

/**
 * ViewPanelList keeps track of the ViewPanel's
 */
class ViewPanelList {
  constructor(divTag, soupWidget, isEditable) {
    this.divTag = divTag
    this.soupWidget = soupWidget
    this.soupView = soupWidget.soupView
    this.controller = soupWidget.controller
    this.isEditable = isEditable
    this.viewPiece = {}
    this.subheaderDiv = $('<div>')
      .addClass('jolecule-sub-header')
      .append('SAVED VIEWS &nbsp;')
    this.div = $(this.divTag)
      .append(this.subheaderDiv)
      .append($('<div id="jolecule-views">'))
    if (this.isEditable) {
      this.subheaderDiv.append(
        linkButton('Save', 'jolecule-button', () => {
          this.saveCurrentView()
        })
      )
    }
  }

  saveViewsToDataServer(success) {
    console.log('ViewPanelList.saveViewsToDataServer')
    this.soupWidget.dataServer.saveViews(
      this.controller.getViewDicts(),
      success
    )
  }

  update() {
    for (let id in this.viewPiece) {
      if (!(id in this.soupView.savedViewsByViewId)) {
        this.viewPiece[id].div.remove()
        delete this.viewPiece[id]
      }
    }

    let nView = this.soupView.savedViews.length

    let iLastView = this.soupView.iLastViewSelected
    if (iLastView >= this.soupView.savedViews.length) {
      iLastView = 0
      this.soupView.iLastViewSelected = iLastView
    }
    let lastId = null
    if (iLastView < this.soupView.savedViews.length) {
      lastId = this.soupView.savedViews[iLastView].id
    }

    for (let i = 0; i < nView; i++) {
      let view = this.soupView.savedViews[i]
      let id = view.id

      if (!(view.id in this.viewPiece)) {
        this.insertNewViewDiv(view.id)
      }

      if (lastId === id) {
        this.viewPiece[id].div.removeClass('jolecule-unselected-box')
        this.viewPiece[id].div.addClass('jolecule-selected-box')
      } else {
        this.viewPiece[id].div.removeClass('jolecule-selected-box')
        this.viewPiece[id].div.addClass('jolecule-unselected-box')
      }

      let viewPiece = this.viewPiece[id]
      let s = view.order + 1 + '/' + nView + ': ' + view.text
      if (view.creator) {
        s += ` <span class="jolecule-author">${view.creator}</span>`
      }
      if (s !== viewPiece.showTextDiv.html()) {
        viewPiece.showTextDiv.html(s)
      }
    }

    if (lastId) {
      if (history.pushState) {
        let query = `?view_id=${lastId}`
        if (lastId === 'view:000000') {
          query = ''
        }
        let newPath =
          window.location.protocol +
          '//' +
          window.location.host +
          window.location.pathname +
          query
        window.history.pushState({ path: newPath }, '', newPath)
      }
    }
  }

  setTargetByViewId(id) {
    this.controller.setTargetViewByViewId(id)
    this.update()
  }

  gotoPrevView() {
    this.controller.setTargetToPrevView()
    this.update()
  }

  gotoNextView() {
    this.controller.setTargetToNextView()
    this.update()
  }

  removeView(id) {
    console.log('ViewPanelList.removeView')
    this.viewPiece[id].div.css('background-color', 'lightgray')
    this.soupWidget.dataServer.deleteView(id, () => {
      this.controller.deleteView(id)
      this.update()
    })
  }

  swapViews(i, j) {
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

  swapUp(viewId) {
    let i = this.soupView.getIViewFromViewId(viewId)
    if (i < 2) {
      return
    }
    this.swapViews(i - 1, i)
  }

  swapDown(viewId) {
    let i = this.soupView.getIViewFromViewId(viewId)
    if (i > this.soupView.savedViews.length - 2) {
      return
    }
    this.swapViews(i, i + 1)
  }

  makeViewDiv(id) {
    let view = this.soupView.savedViewsByViewId[id]
    this.viewPiece[id] = new ViewPanel({
      view: view,
      isEditable: this.isEditable,
      deleteView: () => {
        this.removeView(id)
      },
      saveChange: changedText => {
        const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
        while (SCRIPT_REGEX.test(changedText)) {
          changedText = changedText.replace(SCRIPT_REGEX, '')
        }
        view.text = changedText
        this.viewPiece[id].div.css('background-color', 'lightgray')
        this.saveViewsToDataServer(() => {
          this.viewPiece[id].div.css('background-color', '')
          this.soupView.isChanged = true
          this.update()
        })
      },
      pick: () => {
        this.setTargetByViewId(id)
      },
      swapUp: () => {
        this.swapUp(id)
      },
      swapDown: () => {
        this.swapDown(id)
      }
    })
    return this.viewPiece[id].div
  }

  makeAllViews() {
    for (let i = 0; i < this.soupView.savedViews.length; i += 1) {
      let id = this.soupView.savedViews[i].id
      let div = this.makeViewDiv(id)
      $('#jolecule-views').append(div)
    }
  }

  insertNewViewDiv(newId) {
    let div = this.makeViewDiv(newId)
    if (
      this.soupView.iLastViewSelected === 0 ||
      this.soupView.iLastViewSelected === this.soupView.savedViews.length - 1
    ) {
      $('#jolecule-views').append(div)
    } else {
      let j = this.soupView.iLastViewSelected - 1
      let jId = this.soupView.savedViews[j].id
      let jDiv = this.viewPiece[jId].div
      div.insertAfter(jDiv)
    }
  }

  saveCurrentView() {
    console.log('ViewPanelList.saveCurrentView')
    let newId = this.controller.saveCurrentView()
    this.insertNewViewDiv(newId)
    this.update()
    let div = this.viewPiece[newId].div
    div.css('background-color', 'lightgray')
    this.saveViewsToDataServer(() => {
      console.log('ViewPieceList.saveCurrentView success')
      div.css('background-color', '')
      $('#jolecule-views')
        .stop()
        .scrollTo(div, 1000, { offset: { top: -80 } })
    })
  }
}

/**
 * Get URL query parameter https://stackoverflow.com/a/5158301
 * @param name
 * @returns {RegExpExecArray | string}
 */
function getParameterByName(name) {
  let match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search)
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '))
}

/**
 * FullPageWidget - full page wrapper around an embedded EmbedJolecule
 * widget. Handles keypresses and urls and adds a view list side-panel
 * FullPageWidget satisfies the interface for animation.js
 */
class FullPageWidget {
  /**
   * @param proteinDisplayTag
   * @param viewsDisplayTag
   * @param params
   */
  constructor(proteinDisplayTag, viewsDisplayTag, params) {
    this.viewsDisplayTag = viewsDisplayTag
    this.params = {
      divTag: proteinDisplayTag,
      backgroundColor: 0xcccccc,
      viewId: '',
      viewHeight: 170,
      isViewTextShown: false,
      isSequenceBar: true,
      isEditable: true,
      isGrid: true,
      bCutoff: 0.5,
      isPlayable: false
    }
    if (exists(params)) {
      this.params = _.assign(this.params, params)
    }
    if (!this.params.viewId) {
      let viewId = getParameterByName('view_id')
      if (viewId) {
        this.params.viewId = viewId
        console.log(`FullPageJolecule.constructor viewId=${this.params.viewId}`)
      }
    }
    this.embedJolecule = new EmbedJolecule(this.params)
    this.embedJolecule.soupWidget.addObserver(this)
    document.oncontextmenu = _.noop
    document.onkeydown = e => {
      this.onkeydown(e)
    }
  }

  clear() {
    this.embedJolecule.clear()
  }

  async asyncAddDataServer(dataServer) {
    console.log('FullPageWidget.asyncAddDataServer')
    await this.embedJolecule.asyncAddDataServer(dataServer)
    if (!this.viewPanelList) {
      this.soupView = this.embedJolecule.soupView
      this.controller = this.embedJolecule.controller
      this.soupWidget = this.embedJolecule.soupWidget
      this.viewPanelList = new ViewPanelList(
        this.viewsDisplayTag,
        this.soupWidget,
        this.params.isEditable
      )

      this.viewPanelList.makeAllViews()
    }
    this.viewPanelList.update()
    this.embedJolecule.resize()
  }

  update() {
    if (!_.isUndefined(this.viewPanelList)) {
      this.viewPanelList.update()
    }
  }

  onkeydown(event) {
    if (!window.keyboardLock) {
      let c = String.fromCharCode(event.keyCode).toUpperCase()
      if (c === 'V') {
        this.viewPanelList.saveCurrentView()
        return
      } else if (c === 'K' || event.keyCode === 37) {
        this.controller.setTargetToPrevResidue()
      } else if (c === 'J' || event.keyCode === 39) {
        this.controller.setTargetToNextResidue()
      } else if (event.keyCode === 38) {
        this.viewPanelList.gotoPrevView()
      } else if (c === ' ' || event.keyCode === 40) {
        this.viewPanelList.gotoNextView()
      } else if (c === 'S') {
        this.controller.toggleShowOption('sphere')
      } else if (c === 'B') {
        this.controller.toggleShowOption('backbone')
      } else if (c === 'R') {
        this.controller.toggleShowOption('ribbon')
      } else if (c === 'L') {
        this.controller.toggleShowOption('ligands')
      } else if (c === 'W') {
        this.controller.toggleShowOption('water')
      } else if (c === 'T') {
        this.controller.toggleShowOption('transparent')
      } else if (c === 'E') {
        let iView = this.soupWidget.soupView.iLastViewSelected
        if (iView > 0) {
          let viewId = this.soupWidget.soupView.savedViews[iView].id
          this.viewPanelList.viewPiece[viewId].startEdit()
        }
      } else if (c === 'N') {
        this.controller.toggleResidueNeighbors()
      } else if (c === 'A') {
        if (event.metaKey) {
          this.controller.showAllSidechains()
          event.preventDefault()
        } else {
          this.soupWidget.atomLabelDialog()
        }
      } else if (event.keyCode === 27) {
        this.controller.clearSelectedResidues()
      } else if (event.keyCode === 13) {
        this.controller.zoomToSelection()
      } else {
        let i = parseInt(c) - 1
        if ((i || i === 0) && i < this.soupView.savedViews.length) {
          let id = this.soupView.savedViews[i].id
          this.viewPanelList.setTargetByViewId(id)
        }
      }
    }
  }
}

export { FullPageWidget }
