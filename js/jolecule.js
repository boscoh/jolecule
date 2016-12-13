import {register_global_animation_loop} from "./animation";
import {EmbedJolecule} from "./embedjolecule.js";
import _ from "lodash";

function initEmbedJolecule(args) {
    let targetArgs = {
        div_tag: '',
        data_server: '',
        loading_html: 'Loading PDB from RCSB web-site...',
        loading_failure_html: 'Failed to load PDB.',
        view_id: '',
        view_height: 170,
        is_view_text_shown: false,
        is_editable: true,
        is_loop: false,
        onload: onload,
    };

    let emebedJolecule = new EmbedJolecule(_.merge(targetArgs, args));

    register_global_animation_loop(emebedJolecule);
}

window.initEmbedJolecule = initEmbedJolecule;

export { initEmbedJolecule };