const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const Menu = electron.Menu
const dialog = electron.dialog
const ipcMain = electron.ipcMain

const path = require('path')
const url = require('url')
const fs = require('fs')
const nopt = require('nopt')

const mustache = require('mustache')
const _ = require('lodash')

// Global reference of the window to avoid garbage collection
let mainWindow
let loaded = {}
let windows = {}

const localEmbedServerMustache = `
const {ipcRenderer} = require('electron');
const jolecule = require('../dist/jolecule');

var dataServer = {
  get_protein_data: function(loadProteinData) {
    console.log('dataServer.get_protein_data');
    loadProteinData({
      pdb_id: "{{pdbId}}",
      pdb_text: getPdbLines(),
    });
  },
  get_views: function(loadViewDicts) {
    console.log('dataServer.get_views');
    ipcRenderer.send('get-view-dicts');
    ipcRenderer.on('get-view-dicts', (event, viewDicts) => {
      loadViewDicts(viewDicts);
    })
  },
  save_views: function(views, success) {
    console.log('dataServer.save_views');
    ipcRenderer.send('save-view-dicts', views);
    ipcRenderer.on('save-view-dicts', (event) => {
      console.log('successfully saved');
      success()
    })
  },
  delete_protein_view: function(viewId, success) {
    console.log('dataServer.delete_protein_view');
    ipcRenderer.send('delete-protein-view', viewId);
    ipcRenderer.on('delete-protein-view', (event) => {
      console.log('successfully deleted');
      success()
    })
  },
};
  
function getPdbLines() {
  var pdbLines = [
    {{#pdbLines}} 
      "{{{.}}}", 
    {{/pdbLines}}
  ];
  var lines = pdbLines.join('\\n');
  return lines;
}

document.title = "{{{title}}}";   

let j = jolecule.initEmbedJolecule({
  divTag: '#jolecule', 
  isGrid: false, 
  backgroundColor: 0x000000,
  isPlayable: true,
  maxUpdateStep: 30,
  msPerStep: 17
});
j.asyncAddDataServer(dataServer);

`

const localServerMustache = `
const {ipcRenderer} = require('electron');
const jolecule = require('../dist/jolecule');

var dataServer = {
  get_protein_data: function(loadProteinData) {
    console.log('dataServer.get_protein_data');
    loadProteinData({
      pdb_id: "{{pdbId}}",
      pdb_text: getPdbLines(),
    });
  },
  get_views: function(loadViewDicts) {
    ipcRenderer.send('get-view-dicts');
    ipcRenderer.on('get-view-dicts', (event, viewDicts) => {
      console.log('dataServer.get_views', viewDicts);
      loadViewDicts(viewDicts);
    })
  },
  save_views: function(views, success) {
    ipcRenderer.send('save-view-dicts', views);
    ipcRenderer.on('save-view-dicts', (event) => {
      console.log('dataServer.save_views success');
      success()      
    })
  },
  delete_protein_view: function(viewId, success) {
    ipcRenderer.send('delete-protein-view', viewId);
    ipcRenderer.on('delete-protein-view', (event) => {
      console.log('dataServer.delete_protein_view success');
      success()
    })
  },
};
  
function getPdbLines() {
  var pdbLines = [
    {{#pdbLines}} 
      "{{{.}}}", 
    {{/pdbLines}}
  ];
  var lines = pdbLines.join('\\n');
  return lines;
}

document.title = "{{{title}}}";   

let j = jolecule.initFullPageJolecule(
  '#jolecule-protein-container',
  '#jolecule-sequence-container',
  '#jolecule-views-container',
  { 
    isEditable: true,
    isGrid: true,
    isPlayable: true,
    backgroundColor: 0xCCCCCC
  });
j.asyncAddDataServer(dataServer);

`

function createWindow (pdb, title) {
  const rendererJs = 'renderer.js'
  let pdbId = path.basename(pdb).replace('.pdb', '')

  const pdbText = fs.readFileSync(pdb, 'utf8')
  let pdbLines = pdbText.split(/\r?\n/)
  pdbLines = _.map(pdbLines, (l) => l.replace(/"/g, '\\"'))

  // const localServerMustache = fs.readFileSync('renderer.mustache.js', 'utf8');
  let dataJsText = mustache.render(
    localServerMustache, {pdbId, pdbLines, title})
  fs.writeFileSync(rendererJs, dataJsText)

  // Create the browser window.
  windows[pdbId] = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      devTools: true
    }
  })

  // and load the index.html of the app.
  windows[pdbId].loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  windows[pdbId].webContents.openDevTools()

  // Emitted when the window is closed.
  windows[pdbId].on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    console.log('close', pdbId)
    windows[pdbId] = null
  })
}

function openPdbWindow (pdb) {
  console.log('openPdbWindow pdb:', pdb)
  let base = pdb.replace('.pdb', '')
  let pdbId = path.basename(pdb).replace('.pdb', '')
  let title = `jolecule - ${pdbId}`
  createWindow(pdb, title)
  loaded.viewsJson = base + '.views.json'
  console.log('openPdbWindow views:', loaded.viewsJson)

}

function showOpen () {
  var files = dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{name: 'PDB', extensions: ['pdb']}]
  })
  console.log('showOpen', files)

  let pdb = files[0]
  if (mainWindow) {
    mainWindow.close()
  }
  openPdbWindow(pdb)
}

function init () {
  const menuTemplate = [
    {
      label: 'Jolecule',
      submenu: [
        {
          label: 'About Jolecule',
          click: () => {
            console.log('About Clicked')
          }
        },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open PDB...',
          click: function () { showOpen() }
        },
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  let knownOpts = {'out': [String, null]}
  let shortHands = {'o': ['--out']}
  let parsed = nopt(knownOpts, shortHands, process.argv, 2)
  let remain = parsed.argv.remain

  let pdb = path.join(__dirname, '../examples/1mbo.pdb')
  if (remain.length > 0) {
    pdb = remain[0]
  }

  ipcMain.on('get-view-dicts', (event, arg) => {
    console.log('ipcMain:get-view-dicts')
    let views = {}
    if (fs.existsSync(loaded.viewsJson)) {
      let text = fs.readFileSync(loaded.viewsJson, 'utf8')
      views = JSON.parse(text)
    }
    event.sender.send('get-view-dicts', views)
  })

  ipcMain.on('save-view-dicts', (event, views) => {
    console.log('ipcMain:save-view-dicts')
    fs.writeFileSync(loaded.viewsJson, JSON.stringify(views, null, 2))
    event.sender.send('save-view-dicts', 'success')
  })

  ipcMain.on('delete-protein-view', (event, viewId) => {
    console.log('ipcMain:delete-protein-view', viewId)
    if (fs.existsSync(loaded.viewsJson)) {
      let text = fs.readFileSync(loaded.viewsJson, 'utf8')
      let views = JSON.parse(text)
      _.remove(views, v => v.view_id === viewId)
      fs.writeFileSync(loaded.viewsJson, JSON.stringify(views, null, 2))
      event.sender.send('delete-protein-view', 'success')
    }
  })

  console.log('init', process.argv[0])
  openPdbWindow(pdb)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', init)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit()
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
