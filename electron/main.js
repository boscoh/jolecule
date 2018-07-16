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
const readline = require('readline')

const mustache = require('mustache')
const _ = require('lodash')

// Global reference of the window to avoid garbage collection
let lastWindowId
let windows = {}
let viewJsonFiles = {}
let isDebug = false

function createWindow (pdb, title) {
  const rendererJs = 'pdb-renderer.js'
  let pdbId = path.basename(pdb).replace('.pdb', '')

  const pdbText = fs.readFileSync(pdb, 'utf8')
  let pdbLines = pdbText.split(/\r?\n/)
  pdbLines = _.map(pdbLines, (l) => l.replace(/"/g, '\\"'))

  const localServerMustache = fs.readFileSync('pdb-renderer.mustache.js', 'utf8');
  let dataJsText = mustache.render(
    localServerMustache, {pdbId, pdbLines, title})
  fs.writeFileSync(rendererJs, dataJsText)

  console.log('creatWindow', pdbId)

  // Create the browser window.
  windows[pdbId] = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      devTools: true
    }
  })

  // and load the pdb-index.html of the app.
  windows[pdbId].loadURL(url.format({
    pathname: path.join(__dirname, 'pdb-index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  if (isDebug) {
    windows[pdbId].webContents.openDevTools()
  }

  // Emitted when the window is closed.
  windows[pdbId].on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    console.log('close', pdbId)
    // windows[pdbId].close()
    windows[pdbId] = null
  })

  if (windows[lastWindowId]) {
    console.log('createWindow close', lastWindowId)
    windows[lastWindowId].close()
    delete windows[lastWindowId]
  }

  lastWindowId = pdbId
}

function openPdbWindow (pdb) {
  console.log('openPdbWindow pdb:', pdb)

  let base = pdb.replace('.pdb', '')
  let pdbId = path.basename(pdb).replace('.pdb', '')
  let title = `jolecule - ${pdbId}`

  createWindow(pdb, title)

  let viewsJsonFile = base + '.views.json'
  viewJsonFiles[pdbId] = viewsJsonFile
  console.log('openPdbWindow views:', viewsJsonFile)
}

function showOpen () {
  let files = dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{name: 'PDB', extensions: ['pdb']}]
  })
  console.log('showOpen', files)
  let pdb = files[0]
  openPdbWindow(pdb)
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
        click: function () { showOpen() }
      },
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

function init () {
  let knownOpts = {'debug': [Boolean, false]}
  let shortHands = {'d': ['--debug']}
  let parsed = nopt(knownOpts, shortHands, process.argv, 2)
  let remain = parsed.argv.remain

  isDebug = !!parsed.debug

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  let pdb = path.join(__dirname, '../examples/1mbo.pdb')
  if (remain.length > 0) {
    pdb = remain[0]
  }

  let dirname = path.dirname(pdb)
  let files = fs.readdirSync(dirname)
  let payload = {
    dirname,
    files: [],
    time: ''
  }
  for (let filename of files) {
    if (_.endsWith(filename, '.pdb')) {
      console.log(dirname, filename)
      try {
        const pdbText = fs.readFileSync(path.join(dirname, filename), 'utf8')
        payload.files.push({
          title: parsetTitleFromPdbText(pdbText),
          filename: path.join(dirname, filename),
          name: filename
        })
      } catch (error) {
      }
    }
  }
  console.log('init', payload)

  ipcMain.on('get-files', (event) => {
    console.log('ipcMain:get-files')
    event.sender.send('get-files', payload)
  })

  ipcMain.on('get-view-dicts', (event, pdbId) => {
    console.log('ipcMain:get-view-dicts', pdbId)
    let views = {}
    if (fs.existsSync(viewJsonFiles[pdbId])) {
      let text = fs.readFileSync(viewJsonFiles[pdbId], 'utf8')
      views = JSON.parse(text)
    }
    event.sender.send('get-view-dicts', views)
  })

  ipcMain.on('save-view-dicts', (event, pdbId, views) => {
    console.log('ipcMain:save-view-dicts')
    fs.writeFileSync(viewJsonFiles[pdbId], JSON.stringify(views, null, 2))
    event.sender.send('save-view-dicts', 'success')
  })

  ipcMain.on('delete-protein-view', (event, pdbId, viewId) => {
    console.log('ipcMain:delete-protein-view', viewId)
    if (fs.existsSync(viewJsonFiles[pdbId])) {
      let text = fs.readFileSync(viewJsonFiles[pdbId], 'utf8')
      let views = JSON.parse(text)
      _.remove(views, v => v.view_id === viewId)
      fs.writeFileSync(viewJsonFiles[pdbId], JSON.stringify(views, null, 2))
      event.sender.send('delete-protein-view', 'success')
    }
  })

  ipcMain.on('open-file', (event, filename) => {
    console.log('ipcMain:open-file', filename)
    openPdbWindow(filename)
  })

  console.log('electron', process.argv[0])

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
