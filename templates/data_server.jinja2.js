
window.{{data_server_name}} = {
  get_protein_data: function(load_protein_data) {
    var atom_lines = {{atom_lines}};
    var pdb_text = atom_lines.join('\n');
    load_protein_data({
      'pdb_id': '{{pdb_id}}',
      'pdb_text': pdb_text,
    });
  },
  get_views: function(load_view_dicts) {
    var view_dicts = {{view_dicts}};
    load_view_dicts(view_dicts);
  },
  save_views: function(views) {},
  delete_protein_view: function(view_id) {},
}