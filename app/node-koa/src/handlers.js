const _ = require('lodash')
const path = require('path')
const fs = require('fs-extra')

/**
 *
 * handlers.js - this module holds all the functions that are accessible
 * to the web-client in the JSON-RPC api. It binds the database to the
 * binary-tree search functions
 *
 * Any functions defined in the module exports can be accessed by the
 * corresponding `rpc` module in the client. These are accessed by their
 * names, where a name starting with public are publicly accessible
 * API. All other functions need the user to have already logged-in.
 *
 * The functions must return a promise that returns a JSON-literal.
 * For security, all returned functions must be wrapped in a dictionary.
 *
 * Functions that handle file-uploads from the client start with
 * upload, and the first parameter will be a filelist object that
 * determines the names and locations of the uploaded files on the
 * server.
 *
 * User handlers
 */

let config = {}


function setConfig (key, value) {
  config[key] = value
}

function getConfig () {
  return config
}


function parsetTitleFromPdbText(text) {
  let result = ''
  let lines = text.split(/\r?\n/)
  for (let line of lines) {
    if (line.substring(0, 5) === 'TITLE') {
      result += line.substring(10)
    }
  }
  return result
}

function isDirectory(f) {
  try {
    return fs.statSync(f).isDirectory()
  } catch (e) {}
  return false
}

async function publicGetInit() {
  let payload = { initDir: config.initDir, initFile: config.initFile }
  console.log('publicGetInit', payload)
  return payload
}

async function publicGetFiles(dirname) {
  let files = fs.readdirSync(dirname)
  let payload = {
    dirname,
    files: [],
    directories: [],
    time: '',
  }
  payload.directories.push('..')
  for (let filename of files) {
    if (isDirectory(path.join(dirname, filename))) {
      payload.directories.push(filename)
    } else if (_.endsWith(filename, '.pdb') || _.endsWith(filename, '.pdb1')) {
      try {
        const pdbText = fs.readFileSync(
          path.join(dirname, filename),
          'utf8'
        )
        payload.files.push({
          title: parsetTitleFromPdbText(pdbText),
          filename: path.join(dirname, filename),
          name: filename,
        })
      } catch (error) {}
    }
  }
  return payload
}

async function publicGetProteinText(pdb) {
  const pdbText = fs.readFileSync(pdb, 'utf8')
  return { pdbText }
}

function getViewsJson(pdb) {
  let viewsJson = pdb.replace('.pdb', '').replace('pdb1', '')
  viewsJson += ".views.json"
  return viewsJson
}

async function publicGetViewDicts(pdb) {
  let viewJson = getViewsJson(pdb)
  let views = {}
  let text = ''
  if (fs.existsSync(viewJson)) {
    text = fs.readFileSync(viewJson, 'utf8')
    views = JSON.parse(text)
  }
  return { views }
}

async function publicSaveViewDicts(pdb, views) {
  let viewJson = getViewsJson(pdb)
  fs.writeFileSync(viewJson, JSON.stringify(views, null, 2))
  return { success: true }
}

async function publicDeleteView(pdb, viewId) {
  let viewJson = getViewsJson(pdb)
  if (fs.existsSync(viewJson)) {
    let text = fs.readFileSync(viewJson, 'utf8')
    let views = JSON.parse(text)
    _.remove(views, v => v.view_id === viewId)
    fs.writeFileSync(viewJson, JSON.stringify(views, null, 2))
  }
  return { success: true }
}

module.exports = {
  setConfig,
  getConfig,
  publicGetInit,
  publicGetFiles,
  publicGetProteinText,
  publicGetViewDicts,
  publicSaveViewDicts,
  publicDeleteView
}
