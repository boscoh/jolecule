const _ = require('lodash')
const path = require('path')
const fs = require('fs-extra')
const builder = require('../webapp-builder')

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

function removeQuotes (s) {
    let n = s.length
    if (s[0] === '"' && s[n - 1] === '"') {
        return s.slice(1, n - 1)
    }
    if (s[0] === "'" && s[n - 1] === "'") {
        return s.slice(1, n - 1)
    }
    return s
}

function parsetTitleFromCifText (text) {
    let lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
        let line = lines[i]
        if (line.startsWith('_struct.title')) {
            let rest = _.trim(line.replace('_struct.title', ''))
            if (rest) {
                return removeQuotes(_.trim(rest))
            }
        }
        if (i > 0) {
            let prevLine = lines[i - 1]
            if (_.startsWith(prevLine, '_struct.title')) {
                return removeQuotes(_.trim(line))
            }
        }
    }
    return ''
}

function isDirectory (f) {
    try {
        return fs.statSync(f).isDirectory()
    } catch (e) {
        return false
    }
}

async function publicGetInit () {
    return { initDir: config.initDir, initFile: config.initFile }
}

async function publicGetFiles (dirname) {
    let payload = {
        dirname,
        files: [],
        directories: ['..'],
    }
    const exts = ['.pdb', '.pdb1', '.cif']
    for (let name of fs.readdirSync(dirname)) {
        const filename = path.join(dirname, name)
        if (isDirectory(filename)) {
            payload.directories.push(name)
        } else {
            for (let ext of exts) {
                try {
                    if (!_.endsWith(name, ext)) {
                        continue
                    }
                    let title
                    let text = fs.readFileSync(filename, 'utf8')
                    if (_.endsWith(name, 'pdb') || _.endsWith(name, 'pdb1')) {
                        title = parsetTitleFromPdbText(text)
                    } else if (_.endsWith(name, 'cif')) {
                        title = parsetTitleFromCifText(text)
                    }
                    const format = _.includes(ext, 'pdb') ? 'pdb' : 'cif'
                    payload.files.push({ title, filename, name, format })
                } catch (error) {
                    console.log(`publicGetFiles error ${error}`)
                }
            }
        }
    }
    return payload
}

async function publicGetProteinText (pdb) {
    const pdbText = fs.readFileSync(pdb, 'utf8')
    return { pdbText }
}

function getViewsJson (pdb) {
    let filename = pdb
        .replace('.pdb1', '')
        .replace('.pdb', '')
        .replace('.cif', '')
    filename += '.views.json'
    return filename
}

async function publicGetViewDicts (pdb) {
    let filename = getViewsJson(pdb)
    let views = {}
    if (fs.existsSync(filename)) {
        views = JSON.parse(fs.readFileSync(filename, 'utf8'))
    }
    return { views }
}

async function publicSaveViewDicts (pdb, views) {
    let filename = getViewsJson(pdb)
    fs.writeFileSync(filename, JSON.stringify(views, null, 2))
    return { success: true }
}

async function publicDeleteView (pdb, viewId) {
    let viewJson = getViewsJson(pdb)
    if (fs.existsSync(viewJson)) {
        let text = fs.readFileSync(viewJson, 'utf8')
        let views = JSON.parse(text)
        _.remove(views, v => v.view_id === viewId)
        fs.writeFileSync(viewJson, JSON.stringify(views, null, 2))
    }
    return { success: true }
}

async function publicGetAlignment (pdbId) {
    let fname = path.join(config.initDir, `${pdbId}.align.json`)
    if (fs.existsSync(fname)) {
        return JSON.parse(fs.readFileSync(fname, 'utf8'))
    }
    return null
}

async function makeWebApp (pdbs) {
    builder.makeWebApp(_.map(pdbs, p => path.resolve(p)))
}

module.exports = {
    setConfig,
    getConfig,
    publicGetInit,
    publicGetFiles,
    publicGetProteinText,
    publicGetViewDicts,
    publicSaveViewDicts,
    publicDeleteView,
    publicGetAlignment,
    makeWebApp,
}
