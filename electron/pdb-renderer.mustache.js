const {ipcRenderer} = require('electron');
const jolecule = require('../dist/jolecule');
const $ = require('jquery');

let dataServer = {
  get_protein_data: function(loadProteinData) {
    console.log('dataServer.get_protein_data');
    loadProteinData({
      pdb_id: "{{pdbId}}",
      pdb_text: getPdbLines(),
    });
  },
  get_views: function(loadViewDicts) {
    ipcRenderer.send('get-view-dicts', '{{pdbId}}');
    ipcRenderer.on('get-view-dicts', (event, viewDicts) => {
      console.log('dataServer.get_views', viewDicts);
      loadViewDicts(viewDicts);
    })
  },
  save_views: function(views, success) {
    ipcRenderer.send('save-view-dicts', '{{pdbId}}', views);
    ipcRenderer.on('save-view-dicts', (event) => {
      console.log('dataServer.save_views success');
      success()
    })
  },
  delete_protein_view: function(viewId, success) {
    ipcRenderer.send('delete-protein-view', '{{pdbId}}', viewId);
    ipcRenderer.on('delete-protein-view', (event) => {
      console.log('dataServer.delete_protein_view success');
      success()
    })
  },
};

function buildFileDiv(entry) {
  let entryDiv = $('<div class="file-entry">')
    .append($('<span>')
    .text(entry.name + ' - ' + entry.title))
    .click(e => {
      ipcRenderer.send('open-file', entry.filename);
    })
  return entryDiv
}

function getPdbLines() {
  let pdbLines = [
    {{#pdbLines}}
  "{{{.}}}",
    {{/pdbLines}}
  ];
  let lines = pdbLines.join('\n');
  return lines;
}

document.title = "{{{title}}}";

let joleculeInstance = jolecule.initFullPageJolecule(
  '#jolecule-protein-container',
  '#jolecule-views-container',
  {
    isEditable: true,
    isGrid: true,
    isPlayable: true,
    backgroundColor: 0x000000
  });

joleculeInstance.asyncAddDataServer(dataServer);

ipcRenderer.send('get-files');
ipcRenderer.on('get-files', (event, payload) => {
  let div = $('#files')
  for (let entry of payload.files) {
    console.log('buildFileList.get-files', entry);
    div.append(buildFileDiv(entry))
  }
})

