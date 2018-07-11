

define(function() {

var result = {
  get_protein_data: function(loadProteinData) {
    loadProteinData({
      pdb_id: "1a0a.He",
      pdb_text: getPdbLines(),
    });
  },
  get_views: function(loadViewDicts) {
    loadViewDicts(getViewDicts());
  },
  save_views: function(views, success) { success() },
  delete_protein_view: function(viewId, success) { success() }, };
  
function getPdbLines() {
    return pdbLines.join('\n');
}  

function getViewDicts() {
    return views;
}  

var views = {};

var pdbLines = [
    "HETATM    0 He   XXX     0      -3.718  -6.590  64.719  1.00   NaN          He", 
    "", 
];

return result;
    
});

