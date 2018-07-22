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
let lastWindowId
let windows = {}
let isDebug = false
let initPdb

function createWindow (pdb) {
  console.log('createWindow', pdb)

  // Create the browser window.
  windows[pdb] = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      devTools: true
    }
  })

  windows[pdb].loadURL(
    url.format({
      pathname: path.join(__dirname, 'pdb-index.html'),
      protocol: 'file:',
      slashes: true
    })
  )

  // Open the DevTools.
  if (isDebug) {
    windows[pdb].webContents.openDevTools()
  }

  // Emitted when the window is closed.
  windows[pdb].on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    console.log('close', pdb)
    // windows[pdbId].close()
    windows[pdb] = null
  })

  if (windows[lastWindowId]) {
    console.log('createWindow close', lastWindowId)
    windows[lastWindowId].close()
    delete windows[lastWindowId]
  }

  lastWindowId = pdb
}

function getViewsJson (pdb) {
  let base = pdb.replace('.pdb', '')
  return base + '.views.json'
}

function showOpen () {
  let files = dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{name: 'PDB', extensions: ['pdb']}]
  })
  console.log('showOpen', files)
  let pdb = files[0]
  createWindow(pdb)
}

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
        accelerator: 'CmdOrCtrl+O',
        click: function () {
          showOpen()
        }
      }
    ]
  }
]

function parsetTitleFromPdbText (text) {
  let result = ''
  let lines = text.split(/\r?\n/)
  for (let line of lines) {
    if (line.substring(0, 5) === 'TITLE') {
      result += line.substring(10)
    }
  }
  return result
}

function isDirectory (f) {
  try {
    return fs.statSync(f).isDirectory()
  } catch (e) {
  }
  return false
}

function addHandlers () {
  ipcMain.on('get-init', event => {
    console.log('ipcMain:get-init', initDir, initPdb)
    event.sender.send('get-init', initDir, initPdb)
  })

  ipcMain.on('get-files', (event, dirname) => {
    console.log('ipcMain:get-files', dirname)
    let files = fs.readdirSync(dirname)
    let payload = {
      dirname,
      files: [],
      directories: [],
      time: ''
    }
    payload.directories.push('..')
    for (let filename of files) {
      if (isDirectory(path.join(dirname, filename))) {
        payload.directories.push(filename)
      } else if (_.endsWith(filename, '.pdb')) {
        try {
          const pdbText = fs.readFileSync(path.join(dirname, filename), 'utf8')
          payload.files.push({
            title: parsetTitleFromPdbText(pdbText),
            filename: path.join(dirname, filename),
            name: filename
          })
        } catch (error) {}
      }
    }
    event.sender.send('get-files', payload)
  })

  ipcMain.on('get-protein-text', (event, id, pdb) => {
    const pdbText = fs.readFileSync(pdb, 'utf8')
    console.log('ipcMain:get-protein-text', pdb, pdbText.length)
    event.sender.send('get-protein-text', id, pdbText)
  })

  ipcMain.on('get-view-dicts', (event, id, pdb) => {
    let viewJson = getViewsJson(pdb)
    let views = {}
    let text = ''
    if (fs.existsSync(viewJson)) {
      text = fs.readFileSync(viewJson, 'utf8')
      views = JSON.parse(text)
    }
    console.log('ipcMain:get-view-dicts', viewJson, text.length)
    event.sender.send('get-view-dicts', id, views)
  })

  ipcMain.on('save-view-dicts', (event, id, pdb, views) => {
    console.log('ipcMain:save-view-dicts')
    let viewJson = getViewsJson(pdb)
    fs.writeFileSync(viewJson, JSON.stringify(views, null, 2))
    event.sender.send('save-view-dicts', id, 'success')
  })

  ipcMain.on('delete-protein-view', (event, id, pdb, viewId) => {
    console.log('ipcMain:delete-protein-view', viewId)
    let viewJson = getViewsJson(pdb)
    if (fs.existsSync(viewJson)) {
      let text = fs.readFileSync(viewJson, 'utf8')
      let views = JSON.parse(text)
      _.remove(views, v => v.view_id === viewId)
      fs.writeFileSync(viewJson, JSON.stringify(views, null, 2))
    }
    event.sender.send('delete-protein-view', id, 'success')
  })
}

function init () {
  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
  addHandlers()
  createWindow(initPdb)
}


let knownOpts = {debug: [Boolean, false]}
let shortHands = {d: ['--debug']}
let parsed = nopt(knownOpts, shortHands, process.argv, 2)
let remain = parsed.argv.remain

// console.log('electron', process.argv[0])

isDebug = !!parsed.debug

let initDir

if (remain.length > 0) {
  testPdb = remain[0]

  initPdb = testPdb
  initDir = path.dirname(initPdb)

  if (isDirectory(testPdb)) {
    initDir = testPdb
    initPdb = ''
  } else if (!fs.existsSync(testPdb)) {
    let testInitPdb = testPdb + '.pdb'
    if (fs.existsSync(testInitPdb)) {
      initPdb = testInitPdb
      initDir = path.dirname(initPdb)
    }
  }
  if (initPdb && !fs.existsSync(initPdb)) {
    console.log('file not found', initPdb)
    process.exit(1);
  }
  if (!isDirectory(initDir)) {
    console.log('directory not found', initDir)
    process.exit(1);
  }
} else {
  initPdb = path.join(__dirname, '../examples/1mbo.pdb')
  initDir = path.dirname(initPdb)
}

console.log('init', initDir, initPdb)

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
