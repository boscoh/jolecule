import { EmbedJolecule, defaultArgs } from './embed-widget.js'
import { FullPageWidget } from './full-page-widget.js'
import _ from 'lodash'
import $ from 'jquery'

/**
 *
 * @param args = {
 *   divTag: '',
 *   viewId: '',
 *   viewHeight: 170,
 *   isViewTextShown: false,
 *   isEditable: true,
 *   animateState: 'none',
 *   onload: onload,
 *   isGrid: false
 * }
 * @returns {EmbedJolecule}
 */

function initEmbedJolecule (args) {
  return new EmbedJolecule(_.merge(defaultArgs, args))
}

/**
 * @param protein_display_tag
 * @param sequenceDisplayTag
 * @param views_display_tag
 * @returns {FullPageWidget}
 */
function initFullPageJolecule (...args) {
  return new FullPageWidget(...args)
}

function makeDataServer (
  pdbId,
  userId = null,
  isReadOnly = false,
  isView = true
) {
  return {
    pdbId: pdbId,
    getProteinData: function (processProteinData) {
      let url
      if (pdbId.length === 4) {
        url = `https://files.rcsb.org/download/${pdbId}.pdb`
      } else {
        url = `/pdb/${pdbId}.txt`
      }
      console.log('makeDataServer.getProteinData', url)
      $.get(url, pdbText => {
        processProteinData({ pdbId: pdbId, pdbText: pdbText })
      })
    },
    getViews: function (processViews) {
      if (!isView) {
        processViews([])
        return
      }
      let url = `/pdb/${pdbId}.views.json`
      if (userId) {
        url += `?user_id=${userId}`
      }
      console.log('makeDataServer.getViews', url)
      $.getJSON(url, processViews)
    },
    saveViews: function (views, success) {
      if (isReadOnly) {
        success()
        return
      }
      console.log('makeDataServer.saveViews', '/save/views', views)
      $.post('/save/views', JSON.stringify(views), success)
    },
    deleteView: function (viewId, success) {
      if (isReadOnly) {
        success()
        return
      }
      console.log('makeDataServer.deleteView', '/delete/view')
      $.post('/delete/view', JSON.stringify({ pdbId, viewId }), success)
    }
  }
}

export { initEmbedJolecule, initFullPageJolecule, makeDataServer }
