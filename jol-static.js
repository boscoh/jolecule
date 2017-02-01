#!/usr/bin/env node

"use strict";

const doc = `
Creates a static jolecule page for a given pdb file.

Usage: jol-static.js [-o out-html-dir] pdb
`;


const fs = require('fs-extra');
const path = require('path');
const nopt = require('nopt');
const mustache = require('mustache');
const opener = require('opener');

const dataServerMustache = `

define(function() {

var result = {
  get_protein_data: function(loadProteinData) {
    loadProteinData({
      pdb_id: "{{pdbId}}",
      pdb_text: getPdbLines(),
    });
  },
  get_views: function(loadViewDicts) {
    loadViewDicts(getViewDicts());
  },
  save_views: function(views, success) {},
  delete_protein_view: function(viewId, success) {},
};
  
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

`;

const indexHtmlMustache = `<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <link rel="stylesheet" type="text/css" href="jolecule.css"/>
</head>
<style>
    body, #jolecule {
        margin: 0;
        overflow: hidden;
        width: 100%;
        height: 100%;
    }
</style>
<body>
    <div id="jolecule"></div>
    <script src="require.js"></script>
    <script>
        require( ['jolecule', 'data-server', 'data-server2'], function(jolecule, dataServer, dataServer2) {
            document.title = "{{{title}}}";
            jolecule.initEmbedJolecule({
                div_tag: '#jolecule',
                data_server: dataServer,
                second_data_server: dataServer2,
            });
        });
    </script>
</body>
`;

let knownOpts = {"out": [String, null]};
let shortHands = {"o": ["--out"]};
let parsed = nopt(knownOpts, shortHands, process.argv, 2);
let remain = parsed.argv.remain;

if (remain.length < 1) {
  console.log(doc);
} else {
  const pdb = remain[0];

  let base = path.basename(pdb.replace('.pdb', ''));

  let targetDir = path.join(path.dirname(pdb), base + '-jol');
  if (parsed.out) {
    targetDir = parsed.out;
  }
  fs.ensureDir(targetDir);

  let viewsJson = pdb.replace('.pdb', '') + '.views.json';
  console.log(`Checking ${viewsJson}`);
  let views = {};
  if (fs.existsSync(viewsJson)) {
    let text = fs.readFileSync(viewsJson, 'utf8');
    views = JSON.parse(text);
  }
  let viewsJsonStr = JSON.stringify(views, null, 2);

  const dataJs = path.join(targetDir, 'data-server.js');
  const pdbText = fs.readFileSync(pdb, 'utf8');
  let pdbLines = pdbText.split(/\r?\n/);
  let pdbId = base;
  let dataJsText = mustache.render(
    dataServerMustache,
    {pdbId, pdbLines, viewsJsonStr});
  fs.writeFileSync(dataJs, dataJsText);

  let pdb2;
  if (remain.length > 1) {
    pdb2 = remain[1];
  } else {
    pdb2 = pdb;
  }
  const dataJs2 = path.join(targetDir, 'data-server2.js');
  const pdbText2 = fs.readFileSync(pdb2, 'utf8');
  let pdbLines2 = pdbText2.split(/\r?\n/);
  let base2 = path.basename(pdb2.replace('.pdb', ''));
  let pdbId2 = base2;
  let dataJsText2 = mustache.render(
    dataServerMustache,
    {
      pdbId: pdbId2,
      pdbLines: pdbLines2,
      viewsJsonStr: "[]"
    });
  fs.writeFileSync(dataJs2, dataJsText2);

  let html = path.join(targetDir, 'index.html');
  let title = "jolecule - 1mbo";
  let htmlText = mustache.render(
    indexHtmlMustache, {title, dataJs});
  fs.writeFileSync(html, htmlText);

  let fnames = [
    'jolecule.js',
    'jolecule.js.map',
    'jolecule.css',
    'node_modules/requirejs/require.js'];

  for (let fname of fnames) {
    fs.copySync(
      path.join(__dirname, fname),
      path.join(targetDir, path.basename(fname)));
  }

  opener(html);
}





