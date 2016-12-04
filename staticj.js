#!/usr/bin/env node

"use strict";

const fs = require('fs');
const nopt = require('nopt')
const mustache = require('mustache');
const spawn = require('child_process').spawn;

const doc = `
Creates a static jolecule page for a given pdb file.

Usage: staticj.js [-o out-html] pdb
`;

const localServerMustache = `
var localServer = {
  get_protein_data: function(loadProteinData) {
    loadProteinData({
      pdb_id: "{{pdbId}}",
      pdb_text: pdbLines.join('\\n'),
    });
  },
  get_views: function(loadViewDicts) {loadViewDicts({})},
  save_views: function(views, success) {},
  delete_protein_view: function(viewId, success) {},
};
  
var pdbLines = [
  {{#pdbLines}}
  "{{.}}",
  {{/pdbLines}}
];
`;

const indexHtmlMustache = `
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <link rel="stylesheet" type="text/css" href="./jolecule.css"/>
    <title>{{title}}</title>
</head>
<body>
    <div id="jolecule-container">
        <div id="jolecule-body">
            <div id="jolecule-views-container"></div>
        </div>
    </div>
    
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
    
    <script type="text/javascript" src="./jolecule.bundle.js"></script>
    <script type="text/javascript" src="./{{dataJs}}"></script>
    <script>
        initEmbedJolecule('#jolecule-views-container', localServer);
    </script>
</body>
`;


let knownOpts = {"out": [String, null]};
let shortHands = {"o": ["--out"]};
let parsed = nopt(knownOpts, shortHands, process.argv, 2);
let remain = parsed.argv.remain;

if ( remain.length < 1 ) {
    console.log(doc);
}
else {
    const pdb = remain[0];
    let html = "index.html";
    if (parsed.out) { html = parsed.out; }

    const dataJs = 'local-server.js';
    const pdbText = fs.readFileSync(pdb, 'utf8');
    let pdbLines = pdbText.split(/\r?\n/);
    let pdbId = "1mbo";
    let dataJsText = mustache.render(
        localServerMustache, {pdbId, pdbLines});
    fs.writeFileSync(dataJs, dataJsText);

    let title = "jolecule - 1mbo";
    let htmlText = mustache.render(
        indexHtmlMustache, {title, dataJs});
    fs.writeFileSync(html, htmlText);

    spawn('open', [html]);
}





