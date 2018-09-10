const { ipcRenderer } = require('electron')
const path = require('path')
const jolecule = require('../dist/jolecule')
const $ = require('jquery')
const shortid = require('shortid')

function makeDataServer (pdb) {
  let messageId = shortid.generate()
  return {
    id: messageId,
    getProteinData: function (loadProteinData) {
      console.log('ipcRenderer:get-protein-text', messageId, pdb)
      ipcRenderer.send('get-protein-text', messageId, pdb)
      ipcRenderer.once('get-protein-text', (event, returnId, pdbText) => {
        if (messageId !== returnId) {
          return
        }
        let pdbId = path.basename(pdb).replace('.pdb', '')
        console.log(
          'ipcRenderer:get-protein-text',
          returnId,
          pdb,
          pdbText.length
        )
        loadProteinData({ pdbId, pdbText })
      })
    },
    getViews: function (loadViewDicts) {
      ipcRenderer.send('get-view-dicts', messageId, pdb)
      console.log('ipcRenderer:get-view-dicts', messageId, pdb)
      ipcRenderer.once('get-view-dicts', (event, returnId, viewDicts) => {
        if (messageId !== returnId) {
          return
        }
        console.log('ipcRenderer:get-view-dicts', viewDicts)
        loadViewDicts(viewDicts)
      })
    },
    saveViews: function (views, success) {
      ipcRenderer.send('save-view-dicts', messageId, pdb, views)
      console.log('ipcRenderer:save-view-dicts', messageId, pdb)
      ipcRenderer.once('save-view-dicts', (event, returnId) => {
        if (messageId !== returnId) {
          return
        }
        console.log('ipcRenderer:save-view-dicts', returnId, pdb)
        success()
      })
    },
    deleteView: function (viewId, success) {
      ipcRenderer.send('delete-protein-view', messageId, pdb, viewId)
      ipcRenderer.once('delete-protein-view', (event, returnId) => {
        if (messageId !== returnId) {
          return
        }
        console.log('ipcRenderer:delete-protein-view', returnId, pdb)
        success()
      })
    }
  }
}

function getPdbId (pdb) {
  return path.basename(pdb).replace('.pdb', '')
}

function loadPdb (pdb) {
  document.title = 'jolecule - ' + getPdbId(pdb)
  joleculeInstance.clear()
  joleculeInstance.asyncAddDataServer(makeDataServer(pdb))
}

function buildFileDiv (entry) {
  let s = entry.name
  if (entry.title) {
    s += ' - ' + entry.title
  }
  let entryDiv = $('<div class="file-entry">')
    .append($('<span>').text(s))
    .click(e => {
      loadPdb(entry.filename)
    })
  return entryDiv
}

function buildDirDiv (entry, directory) {
  let entryDiv = $('<div class="file-entry">')
    .append($('<span>').text('> ' + entry))
    .click(e => {
      let fullDir = path.join(directory, entry)
      ipcRenderer.send('get-files', fullDir)
    })
  return entryDiv
}

function registerHandlers () {
  ipcRenderer.on('get-init', (event, dirname, pdbs) => {
    console.log('ipcRenderer:get-init', dirname, pdbs)
    joleculeInstance.clear()
    for (let pdb of pdbs) {
      loadPdb(pdb)
    }
    ipcRenderer.send('get-files', dirname)
  })

  ipcRenderer.on('get-files', (event, payload) => {
    console.log('ipcRenderer:get-files', payload)
    let div = $('#files')
    div.empty()
    for (let entry of payload.directories) {
      div.append(buildDirDiv(entry, payload.dirname))
    }
    for (let entry of payload.files) {
      div.append(buildFileDiv(entry))
    }
  })
}

registerHandlers()

let joleculeInstance = jolecule.initFullPageJolecule(
  '#jolecule-protein-container',
  '#jolecule-views-container',
  {
    isEditable: true,
    isExtraEditable: true,
    isGrid: true,
    isPlayable: true,
    backgroundColor: 0x000000
  }
)

ipcRenderer.send('get-init')
