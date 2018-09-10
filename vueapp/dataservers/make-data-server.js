#!/usr/bin/env node

'use strict'

const doc = `
Creates a static jolecule page for a given pdb file.

Usage: jol-static.js [-o out-html-dir] pdb
`

const fs = require('fs-extra')
const path = require('path')
const nopt = require('nopt')
const mustache = require('mustache')
const _ = require('lodash')

const dataServerMustache = `

define(function() {

var result = {
  getProteinData: function(loadProteinData) {
    loadProteinData({
      pdbId: "{{pdbId}}",
      pdbText: getPdbLines(),
    });
  },
  getViews: function(loadViewDicts) {
    loadViewDicts(getViewDicts());
  },
  saveViews: function(views, success) { success() },
  deleteView: function(viewId, success) { sucess() }, };
  
function getPdbLines() {
    return pdbLines.join('\\n');
}  

function getViewDicts() {
    return views;
}  

var views = {{{viewsJsonStr}}};

var pdbLines = [
  {{#pdbLines}} 
    "{{{.}}}", 
  {{/pdbLines}}
];

return result;
    
});

`

let knownOpts = {
  'out': [String, null],
  'batch': [Boolean, false],
}
let shortHands = {'o': ['--out']}
let parsed = nopt(knownOpts, shortHands, process.argv, 2)
let remain = parsed.argv.remain

if (remain.length < 1) {
  console.log(doc)
} else {
  const pdb = remain[0]
  let base = path.basename(pdb.replace('.pdb', ''))

  let dataServerLoadStr = ''
  let dataServerArgStr = ''
  for (let i = 0; i < remain.length; i++) {
    let pdb = remain[i]
    if (!_.endsWith(pdb, '.pdb')) {
      pdb += '.pdb'
    }
    let base = path.basename(pdb.replace('.pdb', ''))
    let dirname = path.dirname(pdb)
    const dataJs = path.join(dirname, `${base}-data-server.js`)

    console.log(`Reading ${pdb}`)
    const pdbText = fs.readFileSync(pdb, 'utf8')

    let pdbLines = pdbText.split(/\r?\n/)
    pdbLines = _.map(pdbLines, (l) => l.replace(/"/g, '\\"'))

    let viewsJson = pdb.replace('.pdb', '') + '.views.json'
    let views = {}
    if (fs.existsSync(viewsJson)) {
      console.log(`Adding ${viewsJson}`)
      let text = fs.readFileSync(viewsJson, 'utf8')
      views = JSON.parse(text)
    }
    let viewsJsonStr = JSON.stringify(views, null, 2)

    let pdbId = base
    let dataJsText = mustache.render(
      dataServerMustache,
      {pdbId, pdbLines, viewsJsonStr})
    fs.writeFileSync(dataJs, dataJsText)
    console.log(`Made ${dataJs}`)
  }
}





