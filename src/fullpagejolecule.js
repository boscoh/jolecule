import $ from 'jquery'
import scrollTo from 'jquery.scrollto'
import _ from 'lodash'
import { EmbedJolecule, ViewPiece } from './embedjolecule'
import { getWindowUrl, linkButton, randomId, exists } from './util'

/**
 * ViewPieceList keeps track of the views
 */

class ViewPieceList {

  constructor (divTag, controller, proteinDisplay, data_server, isEditable) {
    this.divTag = divTag
    this.display = proteinDisplay
    this.scene = controller.scene
    this.controller = controller
    this.isEditable = isEditable
    this.data_server = data_server
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
    console.log('> ViewPieceList.saveViewsToDataServer')
    this.data_server.save_views(
      this.controller.get_view_dicts(), success)
  }

  updateViews () {
    for (let id in this.viewPiece) {
      if (!(id in this.scene.saved_views_by_id)) {
        this.viewPiece[id].div.remove()
        delete this.viewPiece[id]
      }
    }
    for (let i = 0; i < this.scene.saved_views.length; i++) {
      let view = this.scene.saved_views[i]
      let id = view.id

      if (!(view.id in this.viewPiece)) {
        this.insertNewViewDiv(view.id)
      }

      let i_last_view = this.scene.i_last_view
      let last_id = this.scene.saved_views[i_last_view].id

      if (last_id === id) {
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
    this.controller.set_target_view_by_id(id)
    this.redrawSelectedViewId(id)
    window.location.hash = id
  }

  gotoPrevView () {
    let id = this.controller.set_target_prev_view()
    this.redrawSelectedViewId(id)
    window.location.hash = id
  }

  gotoNextView () {
    let id = this.controller.set_target_next_view()
    this.redrawSelectedViewId(id)
    window.location.hash = id
  }

  removeView (id) {
    console.log('> ViewPieceList.removeView')
    this.viewPiece[id].div.css('background-color', 'lightgray')
    this.data_server.delete_protein_view(id, () => {
      this.controller.delete_view(id)
      this.viewPiece[id].div.remove()
      delete this.viewPiece[id]
      this.updateViews()
    })
  }

  swapViews (i, j) {
    let i_id = this.scene.saved_views[i].id
    let j_id = this.scene.saved_views[j].id
    let i_div = this.viewPiece[i_id].div
    let j_div = this.viewPiece[j_id].div

    this.controller.swapViews(i, j)

    i_div.css('background-color', 'lightgray')
    j_div.css('background-color', 'lightgray')

    this.saveViewsToDataServer(() => {
      j_div.insertBefore(i_div)
      this.updateViews()
      i_div.css('background-color', '')
      j_div.css('background-color', '')
    })
  }

  swapUp (view_id) {
    let i = this.scene.get_i_saved_view_from_id(view_id)
    if (i < 2) {
      return
    }
    this.swapViews(i - 1, i)
  }

  swapDown (view_id) {
    let i = this.scene.get_i_saved_view_from_id(view_id)
    if (i > this.scene.saved_views.length - 2) {
      return
    }
    this.swapViews(i, i + 1)
  }

  makeViewDiv (id) {
    let view = this.scene.saved_views_by_id[id]
    this.viewPiece[id] = new ViewPiece({
      view: view,
      isEditable: this.isEditable,
      delete_view: () => {
        this.removeView(id)
      },
      save_change: (changed_text) => {
        view.text = changed_text
        this.viewPiece[id].div.css('background-color', 'lightgray')
        this.saveViewsToDataServer(() => {
          this.viewPiece[id].div.css('background-color', '')
        })
        this.scene.changed = true
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
      },
    })
    return this.viewPiece[id].div
  }

  makeAllViews () {
    for (let i = 0; i < this.scene.saved_views.length; i += 1) {
      let id = this.scene.saved_views[i].id
      let div = this.makeViewDiv(id)
      $('#jolecule-views').append(div)
    }
  }

  insertNewViewDiv (new_id) {
    let div = this.makeViewDiv(new_id)

    if (this.scene.i_last_view === this.scene.saved_views.length - 1) {
      $('#jolecule-views').append(div)
    } else {
      let j = this.scene.i_last_view - 1
      let j_id = this.scene.saved_views[j].id
      let j_div = this.viewPiece[j_id].div
      div.insertAfter(j_div)
    }
  }

  makeNewView () {
    console.log('> ViewPieceList.makeNewView')
    let newId = randomId()
    this.controller.save_current_view(newId)
    this.insertNewViewDiv(newId)
    this.updateViews()
    this.viewPiece[newId].div.css('background-color', 'lightgray')
    this.saveViewsToDataServer(() => {
      console.log('> ViewPieceList.makeNewView success')
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

  constructor (proteinDisplayTag,
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

    console.log('> FullPageJolecule.constructor params', params)

    if (exists(params)) {
      this.params = _.assign(this.params, params)
    }

    this.embedJolecule = new EmbedJolecule(this.params)

    document.oncontextmenu = _.noop
    document.onkeydown = (e) => this.onkeydown(e)
    let resize_fn = () => {
      this.resize()
    }
    $(window).resize(resize_fn)
    window.onorientationchange = resize_fn

    this.noData = true
  }

  addDataServer (dataServer) {
    this.embedJolecule.addDataServer(dataServer, () => {
      if (this.noData) {
        this.noData = false

        this.scene = this.embedJolecule.scene
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
        if (hashTag in this.scene.saved_views_by_id) {
          this.viewsDisplay.setTargetByViewId(hashTag)
        } else {
          this.viewsDisplay.setTargetByViewId('view:000000')
        }
        this.viewsDisplay.updateViews()
      }

      this.resize()
    })
  }

  isChanged () {
    if (typeof this.scene !== 'undefined') {
      return this.scene.changed
    }
    return false
  };

  draw () {
    if (this.scene.changed) {
      this.viewsDisplay.updateViews()
      this.embedJolecule.draw()
      this.scene.changed = false
    }
  }

  animate () {
    if (typeof this.embedJolecule !== 'undefined') {
      this.embedJolecule.animate()
    }
  }

  resize (event) {
    if (typeof this.scene !== 'undefined') {
      this.scene.changed = true
    }
    if (typeof this.embedJolecule !== 'undefined') {
      this.embedJolecule.resize()
    }
  }

  gotoPrevResidue () {
    this.controller.set_target_prev_residue()
    window.location.hash = this.scene.target_view.res_id
  }

  gotoNextResidue () {
    this.controller.set_target_next_residue()
    window.location.hash = this.scene.target_view.res_id
  }

  onkeydown (event) {
    if (!window.keyboard_lock) {
      let c = String.fromCharCode(event.keyCode).toUpperCase()
      let s = '[' + c + ']'
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
        if (this.scene.current_view.show.all_atom) {
          this.controller.set_backbone_option('ribbon')
        } else if (this.scene.current_view.show.ribbon) {
          this.controller.set_backbone_option('trace')
        } else if (this.scene.current_view.show.trace) {
          this.controller.set_backbone_option('all_atom')
        }
      } else if (c === 'L') {
        this.controller.toggle_show_option('ligands')
      } else if (c === 'S') {
        this.controller.toggle_show_option('sidechain')
      } else if (c === 'W') {
        this.controller.toggle_show_option('water')
      } else if (c === 'C') {
        this.display.controller.clear_selected()
      } else if (c === 'E') {
        let i_view = this.display.scene.i_last_view
        if (i_view > 0) {
          let view_id = this.display.scene.saved_views[i_view].id
          this.viewsDisplay.div[view_id].edit_fn()
        }
      } else if (c === 'N') {
        this.display.controller.toggle_neighbors()
      } else if (c === 'A') {
        this.display.atomLabelDialog()
      } else {
        let i = parseInt(c) - 1
        if ((i || i === 0) && (i < this.scene.saved_views.length)) {
          let id = this.scene.saved_views[i].id
          this.viewsDisplay.setTargetByViewId(id)
        }
      }
      this.display.scene.changed = true
    }
  }

}

export { FullPageJolecule }



