import {register_global_animation_loop} from "./animation";
import {EmbedJolecule, defaultArgs } from "./embedjolecule.js";
import {FullPageJolecule} from "./fullpagejolecule.js";
import _ from "lodash";
import $ from "jquery";

/**
 *
 * @param args = {
 *          divTag: '',
 *          dataServers: [],
 *          view_id: '',
 *          viewHeight: 170,
 *          isViewTextShown: false,
 *          isEditable: true,
 *          isLoop: false,
 *          onload: onload,
 *          isGrid: false
 *        }
 * @returns {EmbedJolecule}
 */

function initEmbedJolecule(userArgs) {
  console.log('initEmbedJolecule');
  let args = _.merge(defaultArgs, userArgs);
  let widget = new EmbedJolecule(args);
  register_global_animation_loop(widget);
  return widget;
}

/**
 * @param protein_display_tag
 * @param sequence_display_tag
 * @param views_display_tag
 * @param data_server
 * @param pdb_id
 * @returns {FullPageJolecule}
 */
function initFullPageJolecule(...args) {
  var widget = new FullPageJolecule(...args);
  register_global_animation_loop(widget);
  return widget;
}

function remoteDataServer(pdb_id) {
  return {
    pdb_id: pdb_id,
    get_protein_data: function(process_protein_data) {
      let url;
      if (pdb_id.length == 4) {
        url = `https://files.rcsb.org/download/${pdb_id}.pdb1`;
      } else {
        url = `/pdb/${pdb_id}.txt`;
      }
      $.get(url, (pdb_text) => {
        process_protein_data({pdb_id, pdb_text});
      });
    },
    get_views: function(process_views) {
      $.getJSON(`/pdb/${pdb_id}.views.json`, process_views);
    },
    save_views: function(views, success) {
      $.post('/save/views', JSON.stringify(views), success);
    },
    delete_protein_view: function(view_id, success) {
      $.post('/delete/view', {pdb_id, view_id}, success);
    }
  }
}

export {
  initEmbedJolecule,
  initFullPageJolecule,
  remoteDataServer
};