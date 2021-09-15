// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const _ = require('lodash')

function createWindow (clientDir) {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  mainWindow.loadFile(path.join(clientDir, 'index.html'))
}

function fileExists(filePath)
{
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

const handlers = require('../handlers')

let fname = path.join(path.dirname(__filename), `../config.json`)
const config = JSON.parse(fs.readFileSync(fname))

const args = _.slice(process.argv, 2)
if (args.length >= 2) {
  const startDir = process.argv[2]
  const pdb = process.argv[3]
  const start = path.join(startDir, pdb)
  console.log(`Electron start dir: ${start}`)
  if (fileExists(start)) {
    config.initDir = path.dirname(start)
    config.initFile = path.basename(start)
  }
}

for (let [k, v] of Object.entries(config)) {
  handlers.setConfig(k, v)
}

const clientDir = path.join(path.dirname(fname), `${config.clientDir}`)

app.whenReady().then(() => {
  createWindow(clientDir)

  app.on('activate', function () {
    // macOS: re-create a window when the dock icon is clicked and no other windows are opened.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('rpc', async (event, payload) => {
  const method = payload?.method
  const params = payload?.params
  const id = payload?.id
  if (!(method in handlers)) {
    const message = `Method ${method} not found in handlers`
    console.log(`rpc-run [error]: ${message}`)
    return { error: { message, code: -32601 }, jsonrpc: '2.0', id }
  } else {
    console.log(`rpc-run ${method}`, params)
    try {
      const fn = handlers[method]
      return { result: await fn(...params), jsonrpc: '2.0', id }
    } catch (e) {
      console.log(`rpc-run ${method} [exception]: ${e}`)
      return {
        error: { message: `${e}`, code: -32603 },
        jsonrpc: '2.0',
        id
      }
    }
  }
})
