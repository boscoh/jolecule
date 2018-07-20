const { ipcRenderer } = require("electron");
const path = require("path");
const jolecule = require("../dist/jolecule");
const $ = require("jquery");
const shortid = require("shortid");

function makeDataServer(pdb) {
  let id = shortid.generate();
  return {
    id,
    get_protein_data: function(loadProteinData) {
      console.log("dataServer.get-protein-text", id, pdb);
      ipcRenderer.send("get-protein-text", id, pdb);
      ipcRenderer.once("get-protein-text", (event, returnId, pdbText) => {
        if (id !== returnId) {
          return;
        }
        let pdbId = path.basename(pdb).replace(".pdb", "");
        console.log("dataServer.get-protein-text", returnId, pdb, pdbText.length);
        loadProteinData({ pdb_id: pdbId, pdb_text: pdbText });
      });
    },
    get_views: function(loadViewDicts) {
      ipcRenderer.send("get-view-dicts", id, pdb);
      console.log("dataServer.get_views", id, pdb);
      ipcRenderer.once("get-view-dicts", (event, returnId, viewDicts) => {
        if (id !== returnId) {
          return;
        }
        console.log("dataServer.get_views", viewDicts);
        loadViewDicts(viewDicts);
      });
    },
    save_views: function(views, success) {
      ipcRenderer.send("save-view-dicts", id, pdb, views);
      console.log("dataServer.save_views", id, pdb);
      ipcRenderer.once("save-view-dicts", (event, returnId) => {
        if (id !== returnId) {
          return;
        }
        console.log("dataServer.save-view-dicts", returnId, pdb);
        success();
      });
    },
    delete_protein_view: function(viewId, success) {
      ipcRenderer.send("delete-protein-view", id, pdb, viewId);
      ipcRenderer.once("delete-protein-view", (event, returnId) => {
        if (id !== returnId) {
          return;
        }
        console.log("dataServer.delete_protein_view", returnId, pdb);
        success();
      });
    }
  };
}

let joleculeInstance = jolecule.initFullPageJolecule(
  "#jolecule-protein-container",
  "#jolecule-views-container",
  {
    isEditable: true,
    isGrid: true,
    isPlayable: true,
    backgroundColor: 0x000000
  }
);

function getPdbId (pdb) {
  return path.basename(pdb).replace('.pdb', '')
}

function loadPdb(pdb) {
  document.title = 'jolecule - ' + getPdbId(pdb)
  joleculeInstance.clear();
  joleculeInstance.asyncAddDataServer(makeDataServer(pdb));
}

ipcRenderer.send("get-file");
ipcRenderer.on("get-file", (event, pdb) => {
  loadPdb(pdb);
});

function buildFileDiv(entry) {
  let entryDiv = $('<div class="file-entry">')
    .append($("<span>").text(entry.name + " - " + entry.title))
    .click(e => {
      loadPdb(entry.filename);
      // ipcRenderer.send('open-file', entry.filename);
    });
  return entryDiv;
}

ipcRenderer.send("get-files");
ipcRenderer.on("get-files", (event, payload) => {
  let div = $("#files");
  div.empty();
  for (let entry of payload.files) {
    div.append(buildFileDiv(entry));
  }
});
