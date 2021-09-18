#!/usr/bin/env node

'use strict'

const fs = require('fs-extra')
const path = require('path')
const nopt = require('nopt')
const mustache = require('mustache')
const opener = require('opener')
const _ = require('lodash')

// language="javascript"
const dataServerMustache = `
define(function() {

const result = {
  version: 2,
  pdbId: "{{pdbId}}",
  format: "{{format}}",
  asyncGetData: async () => pdbLines.join('\\n'),
  asyncGetViews: async () => views,
  async asyncSaveViews() {},
  async asyncDeleteViews() {},
};
  
var views = {{{viewsJsonStr}}};

var pdbLines = [
  {{#pdbLines}} 
  "{{{.}}}", 
  {{/pdbLines}}
];

return result;
    
});
`

const embedIndexHtmlMustache = `
<html>
<head>
    <meta name="viewport" 
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <title>jolecule</title>
    <link rel="stylesheet" type="text/css" href="jolecule.css"/>
    <link rel="stylesheet" type="text/css" href="chosen.css"/>
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
    let widget = jolecule.initEmbedJolecule({
      divTag: '#jolecule',
      isGrid: true,
      isEditable: true,
      backgroundColor: 0x000000});
    require([{{{dataServerLoadStr}}}], function({{{dataServerArgStr}}}) {
      var dataServers = [{{{dataServerArgStr}}}];
      for (var dataServer of dataServers) {
        widget.asyncAddDataServer(dataServer);
      }
    });
  });
  </script>
</body>
`

const fullPageIndexHtmlMustache = `
<html>

<head>
  <meta name="mobile-web-app-capable" content="yes"/> 
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
  <link rel="stylesheet" type="text/css" href="full-page-jolecule.css" />
  <title>jolecule</title>
</head>

<body>
  <div id="jolecule-container">
    <div id="jolecule-body">
      <div id="jolecule-protein-container"></div>
      <div id="jolecule-views-container"></div>
      <script src="require.js"></script>
      <script>
        (function() {
          require(['jolecule'], function(jolecule) {
            var j = jolecule.initFullPageJolecule(
              '#jolecule-protein-container',
              '#jolecule-views-container',
              { 
                isEditable: true,
                isExtraEditable: true,
                isGrid: true,
                isPlayable: true,
                backgroundColor: 0x000000
              });
            require([{{{dataServerLoadStr}}}], function({{{dataServerArgStr}}}) {
              var dataServers = [{{{dataServerArgStr}}}];
              for (var dataServer of dataServers) {
                j.asyncAddDataServer(dataServer);
              }
            });
          });
        })();
      </script>
    </div>
  </div>
</body>

</html>
`

function makeWebApp (pdbs, options) {
    const pdb = pdbs[0]
    let targetDir = path.join(path.dirname(pdb), path.basename(pdb) + '-webapp')
    if (_.get(options, 'out')) {
        targetDir = options.out
    }
    fs.ensureDir(targetDir)
    console.log(`Building jolecule webapp from ${pdb} to ${targetDir}`)

    let dataServerLoadStr = ''
    let dataServerArgStr = ''
    for (let i = 0; i < pdbs.length; i++) {
        let pdb = pdbs[i]
        const exts = ['.pdb', '.pdb1', '.cif']
        let format = ''
        let base = ''
        for (let ext of exts) {
            if (_.endsWith(pdb, ext)) {
                format = _.includes(ext, 'pdb') ? 'pdb' : 'cif'
                base = path.basename(pdb.replace(ext, ''))
            }
        }
        const dataJs = path.join(targetDir, `data-server${i}.js`)
        const pdbText = fs.readFileSync(pdb, 'utf8')
        if (i > 0) {
            dataServerLoadStr += ', '
            dataServerArgStr += ', '
        }
        dataServerLoadStr += `"data-server${i}"`
        dataServerArgStr += `dataServer${i}`
        let pdbLines = pdbText.split(/\r?\n/)
        pdbLines = _.map(pdbLines, l => l.replace(/"/g, '\\"'))
        let pdbId = base
        let viewsJson =
            pdb.replace('.pdb', '').replace('.pdb1', '') + '.views.json'
        console.log(`Checking ${viewsJson}`)
        let views = {}
        if (fs.existsSync(viewsJson)) {
            let text = fs.readFileSync(viewsJson, 'utf8')
            views = JSON.parse(text)
        }
        let viewsJsonStr = JSON.stringify(views, null, 2)
        let dataJsText = mustache.render(dataServerMustache, {
            pdbId,
            pdbLines,
            viewsJsonStr,
            format,
        })
        fs.writeFileSync(dataJs, dataJsText)
    }

    let html = path.join(targetDir, 'index.html')
    let isFullPage = !_.get(options, 'embed')
    console.log('isFullPage', isFullPage)
    let htmlText
    if (isFullPage) {
        let user_nickname = 'anonymous'
        htmlText = mustache.render(fullPageIndexHtmlMustache, {
            dataServerLoadStr,
            dataServerArgStr,
            user_nickname,
        })
    } else {
        htmlText = mustache.render(embedIndexHtmlMustache, {
            dataServerLoadStr,
            dataServerArgStr,
        })
    }
    fs.writeFileSync(html, htmlText)

    let fnames = [
        'dist/jolecule.js',
        'dist/jolecule.js.map',
        'dist/full-page-jolecule.css',
        'node_modules/requirejs/require.js',
    ]

    for (let fname of fnames) {
        fs.copySync(
            path.join(__dirname, fname),
            path.join(targetDir, path.basename(fname))
        )
    }

    return html
}

module.exports = {
    makeWebApp,
}

const doc = `
Creates a static jolecule page for a given pdb file.

Usage: jol-static.js [-f] [-b] [-o out-html-dir] pdb
`

function run () {
    let knownOpts = {
        out: [String, null],
        browser: [Boolean, false],
        embed: [Boolean, true],
    }
    let shortHands = {
        o: ['--out'],
        e: ['--embed'],
        b: ['--browser'],
    }
    let parsed = nopt(knownOpts, shortHands, makeWebApp.argv, 2)
    let remain = parsed.argv.remain

    if (remain.length < 1) {
        console.log(doc)
        return
    }

    const html = makeWebApp(remain, parsed)
    if (!parsed.browser) {
        opener(html)
    }
}

if (require.main === module) {
    run()
}
