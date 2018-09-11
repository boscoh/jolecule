

define(function() {

var result = {
  getProteinData: function(loadProteinData) {
    loadProteinData({
      pdbId: "1a0a.He",
      pdbText: getPdbLines(),
    });
  },
  getViews: function(loadViewDicts) {
    loadViewDicts(getViewDicts());
  },
  saveViews: function(views, success) { success() },
  deleteView: function(viewId, success) { success() }, };
  
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

