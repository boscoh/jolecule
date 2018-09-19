

define(function() {

var result = {
  getProteinData: function(callback) {
    var payload = {
      pdbId: "1a0a.He",
      pdbText: getPdbLines(),
    }
    console.log('getProteinData', payload)
    callback(payload);
  },
  getViews: function(callback) {
    var payload = getViewDicts()
    console.log('getView', payload)
    callback(payload);
  },
  saveViews: function(views, callback) { 
    console.log('saveViews dummy')
    callback() 
  },
  deleteView: function(viewId, callback) { 
    console.log('deleteView dummy')
    callback() 
  }
};
  
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

