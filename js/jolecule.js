import {register_global_animation_loop} from "./animation";
import {FullPageJolecule} from "./fullpagejolecule";

window.initJoleculePage = function(
    proteinDisplaySelector,
    sequenceDisplaySelector,
    viewDisplaySelector,
    pdbCode) {

    register_global_animation_loop(
        new FullPageJolecule(
            proteinDisplaySelector,
            sequenceDisplaySelector,
            viewDisplaySelector,
            local_server(pdbCode),
            pdbCode)
    );
}