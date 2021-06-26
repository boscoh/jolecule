define(function () {
  var result = {
    getProteinData: function (callback) {
      var payload = {
        pdbId: '1a0a.Ne',
        pdbText: getPdbLines()
      }
      console.log('dataserver.getProteinData', payload)
      callback(payload)
    },
    getViews: function (callback) {
      var payload = getViewDicts()
      console.log('dataserver.getView', payload)
      callback(payload)
    },
    saveViews: function (views, callback) {
      console.log('dataserver.saveViews dummy')
      callback()
    },
    deleteView: function (viewId, callback) {
      console.log('dataserver.deleteView dummy')
      callback()
    }
  }

  function getPdbLines () {
    return pdbLines.join('\n')
  }

  function getViewDicts () {
    return views
  }

  var views = {}

  var pdbLines = [
    'HETATM    0 Ne   XXX     0      -3.718  -6.590  64.719  1.00   NaN          Ne',
    ''
  ]

  return result
})
