import {register_global_animation_loop} from "./animation";
import {EmbedJolecule} from "./embedjolecule.js";
import {FullPageJolecule} from "./fullpagejolecule.js";
import _ from "lodash";
import $ from "jquery";

function initEmbedJolecule(userArgs) {
  let defaultArgs = {
    div_tag: '',
    data_servers: [],
    loading_html: 'Loading PDB from RCSB web-site...',
    loading_failure_html: 'Failed to load PDB.',
    view_id: '',
    view_height: 170,
    is_view_text_shown: false,
    is_editable: true,
    is_loop: false,
    onload: onload,
    isGrid: false
  };
  console.log('initEmbedJolecule');
  let args = _.merge(defaultArgs, userArgs);
  let j = new EmbedJolecule(args);
  register_global_animation_loop(j);
  return j;
}

/**
 * @PARAM: protein_display_tag
 * @PARAM: sequence_display_tag
 * @PARAM: views_display_tag
 * @PARAM: data_server
 * @PARAM: pdb_id
 */
function initFullPageJolecule(...args) {
  var j = new FullPageJolecule(...args);
  register_global_animation_loop(j);
  return j;
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