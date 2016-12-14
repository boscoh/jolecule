

jolecule_server = function(pdb_id) {
  return {
    pdb_id: pdb_id,
    get_protein_data: function(process_protein_data) {
        if (pdb_id.length == 4) {
            var url = 'https://files.rcsb.org/download/' + pdb_id + '.pdb1'
        } else {
            var url = '/pdb/' + pdb_id + '.txt'
        }
        var success = function(data) {
            process_protein_data({
                'pdb_id': pdb_id,
                'pdb_text': data,
            });
        }
        $.get(url, success);
    },
    get_views: function(process_views) {
        $.getJSON('/pdb/' + pdb_id + '.views.json', process_views);
    },
    save_views: function(views, success) {
        $.post('/save/views', JSON.stringify(views), success);
    },
    delete_protein_view: function(view_id, success) {
        var data = { 'pdb_id': pdb_id, 'view_id': view_id };
        $.post('/delete/view', data, success);
    }
  }
}





