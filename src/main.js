import { registerGlobalAnimationLoop } from './animation'
import { EmbedJolecule, defaultArgs } from './embedjolecule.js'
import { FullPageJolecule } from './fullpagejolecule.js'
import _ from 'lodash'
import $ from 'jquery'

/**
 *
 * @param userArgs = {
 *   divTag: '',
 *   viewId: '',
 *   viewHeight: 170,
 *   isViewTextShown: false,
 *   isEditable: true,
 *   isLoop: false,
 *   onload: onload,
 *   isGrid: false
 * }
 * @returns {EmbedJolecule}
 */

function initEmbedJolecule (userArgs) {
  let args = _.merge(defaultArgs, userArgs)
  let widget = new EmbedJolecule(args)
  registerGlobalAnimationLoop(widget)
  return widget
}

/**
 * @param protein_display_tag
 * @param sequenceDisplayTag
 * @param views_display_tag
 * @returns {FullPageJolecule}
 */
function initFullPageJolecule (...args) {
  var widget = new FullPageJolecule(...args)
  registerGlobalAnimationLoop(widget)
  return widget
}

function remoteDataServer (pdbId) {
  return {
    pdb_id: pdbId,
    get_protein_data: function (processProteinData) {
      let url
      if (pdbId.length === 4) {
        url = `https://files.rcsb.org/download/${pdbId}.pdb1`
      } else {
        url = `/pdb/${pdbId}.txt`
      }
      console.log('remoteDataServer.get_protein_data', url)
      $.get(url, (pdbText) => {
        processProteinData({pdb_id: pdbId, pdb_text: pdbText})
      })
    },
    get_views: function (processViews) {
      console.log('remoteDataServer.get_views', `/pdb/${pdbId}.views.json`)
      $.getJSON(`/pdb/${pdbId}.views.json`, processViews)
    },
    save_views: function (views, success) {
      console.log('remoteDataServer.save_views', '/save/views')
      $.post('/save/views', JSON.stringify(views), success)
    },
    delete_protein_view: function (viewId, success) {
      console.log('remoteDataServer.delete_protein_view', '/delete/view')
      $.post('/delete/view', JSON.stringify({pdbId, viewId}), success)
    }
  }
}

export {
  initEmbedJolecule,
  initFullPageJolecule,
  remoteDataServer
}
