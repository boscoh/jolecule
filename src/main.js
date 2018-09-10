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
    pdb_id: pdbId,
    get_protein_data: function (processProteinData) {
      let url
      if (pdbId.length === 4) {
        url = `https://files.rcsb.org/download/${pdbId}.pdb`
      } else {
        url = `/pdb/${pdbId}.txt`
      }
      console.log('makeDataServer.get_protein_data', url)
      $.get(url, pdbText => {
        processProteinData({ pdb_id: pdbId, pdb_text: pdbText })
      })
    },
    get_views: function (processViews) {
      if (!isView) {
        processViews([])
        return
      }
      let url = `/pdb/${pdbId}.views.json`
      if (userId) {
        url += `?user_id=${userId}`
      }
      console.log('makeDataServer.get_views', url)
      $.getJSON(url, processViews)
    },
    save_views: function (views, success) {
      if (isReadOnly) {
        success()
        return
      }
      console.log('makeDataServer.save_views', '/save/views', views)
      $.post('/save/views', JSON.stringify(views), success)
    },
    delete_protein_view: function (viewId, success) {
      if (isReadOnly) {
        success()
        return
      }
      console.log('makeDataServer.delete_protein_view', '/delete/view')
      $.post('/delete/view', JSON.stringify({ pdbId, viewId }), success)
    }
  }
}

export { initEmbedJolecule, initFullPageJolecule, makeDataServer }
