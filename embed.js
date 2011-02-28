
//////////////////////////////////////////////////////////
// 
// jolecule - the javascript based protein/dna viewer
//
// relies on server jolecule.appspot.com, which, in turn
// relies on the RCSB website http://www.pdb.org.
//
///////////////////////////////////////////////////////////


var ms = 25;

function load_embed_protein$pdb_id(
    pdb_id, view_id, canvas_tag) {
  var embed = {}

  embed.pdb_id = '$pdb_id';
  if (pdb_id != embed.pdb_id) {
    return;
  }

  $protein_string;
  embed.protein = new Protein();
  embed.protein.load(
      pdb_id, lines, bond_pairs, max_length, filename);
  embed.scene = new Scene(embed.protein);
  embed.controller = new Controller(embed.scene)

  view_dicts = $view_string;
  embed.controller.load_views_from_flat_views(
      view_dicts);
    
  if (view_id in embed.scene.saved_views_by_id) {
    embed.controller.set_target_view_by_id(view_id);
  }

  embed.canvas = new Canvas($(canvas_tag)[0]);

  embed.protein_display = new ProteinDisplay(
       embed.scene, embed.canvas, embed.controller);
       
  if (typeof proteins == 'undefined') {
    proteins = [];
  }
  proteins.push(embed);
}

  
function init() {
  var load_fns = []
  var embed_dicts = [];
  for (var name in window) {
    if (name.indexOf('load_embed_protein') > -1) {
      load_fns.push(window[name]);
    }
    if (name.indexOf('embed') > -1) {
      embed_dicts.push(window[name]);
    }
  }
  for (var j=0; j<embed_dicts.length; j+=1) {
    var canvas_tag = embed_dicts[j].canvas;
    var pdb_id = embed_dicts[j].pdb_id;
    var view_id = embed_dicts[j].view_id;
    for (var i=0; i<load_fns.length; i+=1) {
      load_fns[i](pdb_id, view_id, canvas_tag);
      delete window[name];
    }
  }
  
  var last_time = (new Date).getTime();
  var ms = 25;

  var loop = function() {
    if (!proteins) {
      return;
    }
    var curr_time = (new Date).getTime();
    var time_diff = curr_time - last_time;
    var n_step = time_diff/ms;
    if (n_step < 1) {
      n_step = 1;
    }
    for (var i=0; i<n_step; i++) {
      for (var j=0; j<proteins.length; j++) {
        proteins[j].scene.animate();
      }
    }
    for (var j=0; j<proteins.length; j++) {
      var protein = proteins[j];
      if (protein.scene.changed) {
        if (protein.scene.is_new_view_chosen) {
          protein.scene.is_new_view_chosen = false;
        }
        protein.protein_display.draw();
        protein.scene.changed = false;
      }
    }
    last_time = curr_time;
  }

  setInterval(loop, 25);

}

embed_dict = {};
embed_dict.pdb_id = '1mbo';
embed_dict.canvas = '#imageView';
embed_dict.view_id = 'view:h1tsp7';


if (window.addEventListener) {
  window.addEventListener('load', init, false); 
}
