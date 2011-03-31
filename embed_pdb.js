
//////////////////////////////////////////////////////////
// 
// jolecule - the javascript based protein/dna viewer
//
// relies on server jolecule.appspot.com, which, in turn
// relies on the RCSB website http://www.pdb.org.
//
///////////////////////////////////////////////////////////


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


