import {register_global_animation_loop} from "./animation";
import {EmbedJolecule, defaultArgs } from "./embedjolecule.js";
import {FullPageJolecule} from "./fullpagejolecule.js";
import _ from "lodash";
import $ from "jquery";

/**
 *
 * @param args = {
 *   divTag: '',
 *   dataServers: [],
 *   view_id: '',
 *   viewHeight: 170,
 *   isViewTextShown: false,
 *   isEditable: true,
 *   isLoop: false,
 *   onload: onload,
 *   isGrid: false
 * }
 * @returns {EmbedJolecule}
 */

function initEmbedJolecule(userArgs) {
  let args = _.merge(defaultArgs, userArgs);
  let widget = new EmbedJolecule(args);
  register_global_animation_loop(widget);
  return widget;
}

/**
 * @param protein_display_tag
 * @param sequenceDisplayTag
 * @param views_display_tag
 * @returns {FullPageJolecule}
 */
function initFullPageJolecule(...args) {
  var widget = new FullPageJolecule(...args);
  register_global_animation_loop(widget);
  return widget;
}

function remoteDataServer(pdbId) {
  return {
    pdb_id: pdbId,
    get_protein_data: function(processProteinData) {
      let url;
      if (pdbId.length == 4) {
        url = `https://files.rcsb.org/download/${pdbId}.pdb1`;
      } else {
        url = `/pdb/${pdbId}.txt`;
      }
      $.get(url, (pdbText) => {
        processProteinData({pdbId, pdbText});
      });
    },
    get_views: function(processViews) {
      $.getJSON(`/pdb/${pdbId}.views.json`, processViews);
    },
    save_views: function(views, success) {
      $.post('/save/views', JSON.stringify(views), success);
    },
    delete_protein_view: function(viewId, success) {
      $.post('/delete/view', {pdbId, viewId}, success);
    }
  }
}

export {
  initEmbedJolecule,
  initFullPageJolecule,
  remoteDataServer
};