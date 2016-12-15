
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const dialog = electron.dialog;
const ipcMain = electron.ipcMain;

const path = require('path');
const url = require('url');
const fs = require('fs');
const nopt = require('nopt');

const mustache = require('mustache');
const _ = require('lodash');

// Global reference of the window to avoid garbage collection
let mainWindow;
let viewsJson;

const localServerMustache = `
const {ipcRenderer} = require('electron');
const jolecule = require('../jolecule');

var dataServer = {
  get_protein_data: function(loadProteinData) {
    loadProteinData({
      pdb_id: "{{pdbId}}",
      pdb_text: getPdbLines(),
    });
  },
  get_views: function(loadViewDicts) {
    console.log('get_views');
    ipcRenderer.send('get-view-dicts');
    ipcRenderer.on('get-view-dicts', (event, viewDicts) => {
      loadViewDicts(viewDicts);
    })
  },
  save_views: function(views, success) {
    console.log('save_views');
    ipcRenderer.send('save-view-dicts', views);
    ipcRenderer.on('save-view-dicts', (event) => {
      console.log('successfully saved');
    })
  },
  delete_protein_view: function(viewId, success) {
    console.log('delete_protein_view');
    ipcRenderer.send('delete-protein-view', viewId);
    ipcRenderer.on('delete-protein-view', (event) => {
      console.log('successfully deleted');
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

jolecule.initEmbedJolecule({
    div_tag: '#jolecule-views-container',
    data_server: dataServer
});

`;

const indexHtmlMustache = `
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <link rel="stylesheet" type="text/css" href="../jolecule.css"/>
    <title>{{title}}</title>
    <style>
        body {
            overflow: hidden;
        }
        #jolecule-container,
        #jolecule-body,
        #jolecule-views-container {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div id="jolecule-container">
        <div id="jolecule-body">
            <div id="jolecule-views-container"></div>
        </div>
    </div>
    <script type="text/javascript" src="./{{rendererJs}}"></script>
</body>
`;

function makeHtml(pdb, title) {
    const rendererJs = 'renderer.js';
    let pdbId = path.basename(pdb).replace('.pdb', '');

    const pdbText = fs.readFileSync(pdb, 'utf8');
    let pdbLines = pdbText.split(/\r?\n/);
    pdbLines = _.map(pdbLines, (l) => l.replace('"', '\"'));

    // const localServerMustache = fs.readFileSync('renderer.mustache.js', 'utf8');
    let dataJsText = mustache.render(
        localServerMustache, {pdbId, pdbLines});
    fs.writeFileSync(rendererJs, dataJsText);

    html = 'index.html';
    let htmlText = mustache.render(
        indexHtmlMustache, {title, rendererJs});
    fs.writeFileSync(html, htmlText);
} 

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600});

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

function openPdbWindow(pdb) {
    let base = pdb.replace('.pdb', '');

    makeHtml(pdb, `jolecule - ${base}`);

    createWindow();

    viewsJson = base + '.views.json';
    console.log(viewsJson);
    ipcMain.on('get-view-dicts', (event, arg) => {
        console.log('get-view-dicts');
        let views = {};
        if (fs.existsSync(viewsJson)) {
            let text = fs.readFileSync(viewsJson, 'utf8');;
            views = JSON.parse(text);
        }
        event.sender.send('get-view-dicts', views);
    });

    ipcMain.on('save-view-dicts', (event, views) => {
        console.log('save-view-dicts')  // prints "ping"
        fs.writeFileSync(viewsJson, JSON.stringify(views, null, 2));
        event.sender.send('save-view-dicts', "success");
    });

    ipcMain.on('delete-protein-view', (event, viewId) => {
        console.log('delete-protein-view')  // prints "ping"
        if (fs.existsSync(viewsJson)) {
            let text = fs.readFileSync(viewsJson, 'utf8');;
            views = JSON.parse(text);
            console.log('before', JSON.stringify(views, null, 2));
            _.unset(views, viewId);
            console.log('after', JSON.stringify(views, null, 2));
            fs.writeFileSync(viewsJson, JSON.stringify(views, null, 2));
            event.sender.send('delete-protein-view', "success");
            return;
        }
        fs.writeFileSync(viewsJson, JSON.stringify(arg, null, 2));
        event.sender.send('delete-protein-view', "success");
    });

}

function showOpen() {
    var files = dialog.showOpenDialog({
        properties: [ 'openFile'],
        filters: [{ name: 'PDB', extensions: ['pdb'] }]
    });
    console.log(files);

    let pdb = files[0];
    if (mainWindow) {
        mainWindow.close();
    }
    openPdbWindow(pdb);
};


function init() {
  const menuTemplate = [
    {
      label: 'Jolecule',
      submenu: [
        {
          label: 'About Jolecule',
          click: () => {
            console.log('About Clicked');
          }
        }, 
        {
          label: 'Quit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open PDB...',
          click: function() { showOpen(); }
        }, 
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  openPdbWindow('../examples/1mbo.pdb', '1mbo');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', init)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
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