import {register_global_animation_loop} from "./animation";
import {EmbedJolecule} from "./embedjolecule.js";
import $ from "jquery";
import local_server from "./local_server.js";

// import {FullPageJolecule} from "./fullpagejolecule";

// window.initJoleculePage = function(
//     proteinDisplaySelector,
//     sequenceDisplaySelector,
//     viewDisplaySelector,
//     pdbCode) {
//
//     register_global_animation_loop(
//         new FullPageJolecule(
//             proteinDisplaySelector,
//             sequenceDisplaySelector,
//             viewDisplaySelector,
//             local_server(pdbCode),
//             pdbCode)
//     );
// }


function makePdbDataServer(pdb_id) {
  return {
    pdb_id: pdb_id,
    get_protein_data: function(process_protein_data) {
      $.get(
        'https://files.rcsb.org/download/' + pdb_id + '.pdb1',
        (data) => process_protein_data({
            'pdb_id': pdb_id,
            'pdb_text': data,
        }));
    },
    get_views: function(load_view_dicts) {load_view_dicts({})},
    save_views: function(views, success) {},
    delete_protein_view: function(view_id, success) {},
  }
}


window.initEmbedJolecule = function(
  protein_display_tag, pdb_id) {

    register_global_animation_loop(
      new EmbedJolecule({
          div_tag: protein_display_tag,
          // data_server: makePdbDataServer(pdb_id),
          data_server: local_server,
          loading_html: 'Loading PDB from RCSB web-site...',
          loading_failure_html: 'Failed to load PDB.',
          view_id: '',
          view_height: 170,
          is_view_text_shown: false,
          is_editable: true,
          is_loop: false,
          onload: onload,
      })
    );
}

;
