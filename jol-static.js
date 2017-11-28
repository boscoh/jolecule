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
const _ = require('lodash');

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
  save_views: function(views, success) { success() },
  delete_protein_view: function(viewId, success) { sucess() }, };
  
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

const embedIndexHtmlMustache = `

<html>
<head>
    <meta name="viewport" 
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <title>jolecule</title>
    <link rel="stylesheet" type="text/css" href="jolecule.css"/>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            width: 100%;
            height: 100%;
        }
        #jolecule {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
  <div id="jolecule"></div>
  <script src="require.js"></script>
  <script>
  require( ['jolecule'], function(jolecule) {
    var j = jolecule.initEmbedJolecule({
      divTag: '#jolecule',
      isGrid: false,
      isEditable: true,
      backgroundColor: 0xCCCCCC});
    require([{{{dataServerLoadStr}}}], function({{{dataServerArgStr}}}) {
      var dataServers = [{{{dataServerArgStr}}}];
      for (var dataServer of dataServers) {
        j.addDataServer(dataServer);
      }
    });
  });
  </script>
</body>
`;

const fullPageIndexHtmlMustache = `
<html>

<head>
  <meta name="mobile-web-app-capable" content="yes"/> 
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
  <link rel="stylesheet" type="text/css" href="full-page-jolecule.css" />
  <link rel="stylesheet" type="text/css" href="jolecule.css"/>
  <title>jolecule</title>
</head>

<body>
  <div id="jolecule-container">
    <div id="jolecule-body">
      <div id="jolecule-sequence-container"></div>
      <div id="jolecule-protein-container"></div>
      <div id="jolecule-views-container"></div>
      <script src="require.js"></script>
      <script>
        (function() {
          require(['jolecule'], function(jolecule) {
            window.user = '{{user_nickname}}';
            var j = jolecule.initFullPageJolecule(
              '#jolecule-protein-container',
              '#jolecule-sequence-container',
              '#jolecule-views-container',
              { 
                isEditable: false,
                isGrid: false,
              });
            require([{{{dataServerLoadStr}}}], function({{{dataServerArgStr}}}) {
              var dataServers = [{{{dataServerArgStr}}}];
              for (var dataServer of dataServers) {
                j.addDataServer(dataServer);
              }
            });
          });
        })();
      </script>
    </div>
  </div>
</body>

</html>
`;


let knownOpts = {
  "out": [String, null],
  "batch": [Boolean, false],
};
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

  let dataServerLoadStr = '';
  let dataServerArgStr = '';
  for (let i=0; i<remain.length; i++) {
    let pdb = remain[i];
    let base = path.basename(pdb.replace('.pdb', ''));
    const dataJs = path.join(targetDir, `data-server${i}.js`);
    const pdbText = fs.readFileSync(pdb, 'utf8');
    if (i > 0) {
      dataServerLoadStr += ', ';
      dataServerArgStr += ', ';
    }
    dataServerLoadStr += `"data-server${i}"`;
    dataServerArgStr += `dataServer${i}`;
    let pdbLines = pdbText.split(/\r?\n/);
    pdbLines = _.map(pdbLines, (l) => l.replace(/"/g, '\\"'));
    let pdbId = base;
    let viewsJson = pdb.replace('.pdb', '') + '.views.json';
    console.log(`> Checking ${viewsJson}`);
    let views = {};
    if (fs.existsSync(viewsJson)) {
      let text = fs.readFileSync(viewsJson, 'utf8');
      views = JSON.parse(text);
    }
    let viewsJsonStr = JSON.stringify(views, null, 2);
    let dataJsText = mustache.render(
      dataServerMustache,
      {pdbId, pdbLines, viewsJsonStr});
    fs.writeFileSync(dataJs, dataJsText);
  }

  let html = path.join(targetDir, 'index.html');
  let title = "jolecule";
  let isFullPage = false;
  let htmlText;
  if (isFullPage) {
    let user_nickname = 'anonymous';
    htmlText = mustache.render(
      fullPageIndexHtmlMustache, {
        dataServerLoadStr,
        dataServerArgStr,
        user_nickname
      });
  } else {
    htmlText = mustache.render(
      embedIndexHtmlMustache, {
        dataServerLoadStr,
        dataServerArgStr,
      });
  }
  fs.writeFileSync(html, htmlText);

  let fnames = [
    'dist/jolecule.js',
    'dist/jolecule.js.map',
    'dist/jolecule.css',
    'dist/full-page-jolecule.css',
    'node_modules/requirejs/require.js'];

  for (let fname of fnames) {
    fs.copySync(
      path.join(__dirname, fname),
      path.join(targetDir, path.basename(fname)));
  }

  if (!parsed.batch) {
    opener(html);
  }
}





