# Jolecule - viewer for proteins & DNA with animated views

Jolecule is a viewer for proteins and DNA designed for making animated slideshows. It runs on web-browsers using WebGL via the [three.js](http://threejs.org) library. Jolecule makes it easy to explore and store annotated views. By animating between these stored views, custom slideshows can be created for presentations.

The core package is a javascript module that can display PDB structures. The module has been carefully written so that it can be used in a variety of different ways:

1. On the website <http://jolecule.com>
2. As a native desktop electron app
3. As a local static HTML-page webapp
4. Embedded in other webpages locally
5. Embedded remotely from [the website](http://jolecule.com/embed/pdb?pdb_id=1mbo)

## Demo and Explore

The easiest way to try Jolecule is to go to <http://jolecule.com>.

Or if you know the PDB id of your protein structure, just type in `http://jolecule.com/pdb/PDB-ID`

## Installation

To use Jolecule as a local Desktop app, or to build static webapps, you need to first download the github zip file:

&nbsp; &nbsp; [jolecule-master.zip](https://github.com/boscoh/jolecule/archive/master.zip)

Then you need to install [Node.js](http://nodejs.org), the Javascript run-time.

After Node.js is installed, then, in the Jolecule directory, you need to install all the node-based dependencies:

```bash
> npm install
```

## Desktop App: Explore PDB structures on your computer

An [Electron](electronjs.org) app is provided that allows Jolecule to access your file system. To run the Desktop app on a unix/macosx command-line, in the `jolecule` directory, run:

```bash
> ./jol-electron.sh [PDB-FILE|DIRECTORY]
```

If a specified PDB is given, the PDB will be loaded. All other PDB structures in the directory will also be listed in a left-handed side-bar.

More importantly, the Desktop app allows the creation of views that will be directly saved as a file together with the original PDB file. For a given PDB file, say `1be9.pdb`, the Desktop will save any views in the file `1be9.views.json`. This `views.json` will be used to generate static webapps that you can distribute to other users.

## Views and Animated Slideshows

An key component of Jolecule is the ability to save and re-display views of a molecule. An animated slideshow can then be displayed by cycling smoothly through these views.

The particular view of a molecular is saves as a list of JSON data structure, with the following structure:

```json
{
  "camera": {
    "in": [17.00123423615934, 25.682855200046887, -0.1600056890155509],
    "pos": [17.410000000001787, 26.58999999999918, -0.2600000000028232],
    "slab": {
      "z_back": 5.58086661002549,
      "z_front": -7.753908948194662,
      "zoom": 29.280544867878536
    },
    "up": [16.501362135372435, 26.98427451475052, -0.3975675760496816]
  },
  "creator": "~ apposite @28/5/2015",
  "distances": [],
  "i_atom": 1276,
  "labels": [],
  "order": 6,
  "pdbId": "1mbo",
  "selected": [42, 63, 67, 92, 154, 155, 341],
  "show": {
    "all_atom": false,
    "hydrogen": false,
    "ligands": true,
    "ribbon": true,
    "sidechain": false,
    "trace": false,
    "water": false
  },
  "text": "The surrounding residues around the oxygen is crucial for oxygen molecule binding.",
  "version": 2,
  "view_id": "view:e9mx4p"
}
```

The views are in a Json file with the same basename as the associated PDB file. For instance, `1mbo.pdb` will have a view file in `1mbo.views.json`.

On the public server, the views of a PDB structure <http://jolecule.com/pdb/1mbo> will be accessible at <http://jolecule.com/pdb/1mbo.views.json>. You can download and modify these files.

Jolecule knows how to animate smoothly between views. This will create a slideshow of your structure. Press `Play` in the bottom-left hand to start the slideshow.

A slideshow between the views by clicking on `Play`. It's easiest to create the `views.json` file using the electron app.

## Make static animated slideshows

Once you've started making views, and animating slideshows on the website, or in the Desktop app, you may want to share the slideshow with others. The easiest way to share is to create a static webapp of the slideshow, which can simply be opened by loading the webapp in the browser.

Say that you have `1be9.pdb` and created a bunch of nice views in `1be9.views.json`. Then on the linux/macosx command-line, you can run:

```bash
> ./webapp-builder.js 1be9
```

This will create a directory `1be9-jol` and a completely contained webpage is available at `1be9-jol/index.html`. The `index.html` can be edited to setup the default rendering options of Jolecule within the webapp, such as whether you want animation as auto-start feature, or whether to rotate or rock the protein. You can also turn on/off different subsets of the controls for a different mix of clarity/flexibility.

## Embedding jolecule on other webpages

Javascript was designed to be embedded in other webpages. The easiest way is to
[embed a Jolecule widget via the website](http://jolecule.com/embed/pdb?pdb_id=1mbo).

However, you may want to create your own webpage that embeds a Jolecule widget locally. This requires the creation of a javascript `dataserver.js` module that holds all the protein and view data. The way to do this is to co-opt the static webpapps created by `webapp-builder.js`, and repurpose those files for your website.

First run `jol-static.sh` to generate an existing static Jolecule webapp. For arguments sake, let's say we converted `1be9.pdb` and `1be9.views.json` into a webap in the `1be9-jol` directory. In the `1be9-jol` directory, there will be a file called `dataserver0.js`, which is the module that stores all the `1be9` data.

Essentially, you repurpose the Javascript control script in `1be9/index.html` to insert into your own website. You will require only 3 files from that directory:

- require.js - the module loader
- jolecule.js - the bundled jolecule UMD module
- data-server0.js - specific data for your structure.

This would be the loading code in your HTML:

```html
<!-- jolecule widget will be inserted here, set the size with styles -->
<div id="jolecule-embed"></div>
<script type="text/javascript" src="./require.js"></script>
<script>
  require(['./jolecule.js'], function (jolecule) {
    var widget = jolecule.initEmbedJolecule({
      divTag: '#jolecule-embed', // jquery Tag to your div element
      animateState: 'none', // 'none', 'loop', 'rotate', 'rock'
      isSequenceBar: false, // shows sequence bar in the header
      isGrid: false, // show docking grid panel
      isEditable: false, // show editable buttons at the footer
      isPlayable: true, // show playable option buttons at the footer
      backgroundColor: 0x000000, // background of 3D context
      maxWaitStep: 50, // time to wait per view in looping mode
      viewId: ''
    })
    require(['data-server0'], function (dataServer) {
      widget.asyncAddDataServer(dataServer)
    })
  })
</script>
```

Jolecule will attempt to fit within the size of `#jolecule-embed`.

This can be expanded for multiple widgets, however, there is a limit of 16 WebGL contexts in most browsers, and therefore 16 Jolecule widgets. For different proteins, you can simple rename the `dataserver0.js` to some other name, such
as `datasever1.js`

## Developing jolecule

If you want to edit the source code to jolecule, the source code is found in `jolecule/src`. It is written in ES6 and needs to be compiled. The compiled module is found in `jolecule/dist/jolecule.js`.

Jolecule uses [three.js](http://threejs.org) to interface with [WebGl](https://www.khronos.org/webgl/).

To compile the source code, in the Jolecule directory, run:

```bash
> ./node_modules/.bin/webpack
```

Alternatively, to create a watcher for changes, run:

```bash
> ./node_modules/.bin/webpack -w
```

In the watch mode, open the static webapp in `dist/index.html`, and reload the webpage after the automatic compilation is finished.

## Visual Graphic Design

Jolecule has a focused design for rendering proteins and DNA. The visual design focuses on being able to transition between an overall cartoon view with detailed stereochemical views of bonds and atoms. To enable that, ribbons are drawn through the C-alpha atoms in the backbone chain. This gives a pleated look to the beta-sheets, but has the advantage that sidechains can be draw to protrube clearly from the ribbon in both helices and sidechains.

The author has found that sidechains protruding from ribbons provides an excellent intermediate representation that can show a good intermediate level of details between protein architecture and direct atomic interaction between sidechains.

The cartoon view uses a flat ribbon for alpha-helices and beta-sheets, with a distinct thin tube for coils. C-alpha atoms are shown as arrows to indicate chain direction, and this can make it easy to determine parallel from antiparallel beta-sheets and helical alignments.

In the display of nucleotides, the cartoon tube shows the bases as a well-defined object. This is done to indicate the importance of base-stacking as an ordering principle in nucleotide structure.

## Changelog

- 5.0 (Sep 2018)
  - Proper fly-weight for loading data structures
  - Drawing uses only typed-arrays
  - colors implemented on residue level
  - spherical views
  - transparent chain mode
  - embedded works a lot more flexibly
  - file-browser sidebar for electron app
  - slideshow modes with rock and rotate
  - select residue selector
  - improved sequence bar (with help from Sean O'Donoghue)
- 4.0 (Dec 2016)
  - converted to ES6 using import/export
  - webpack to transpile to bundled ES5 UMD module
  - data delivered as AMD modules
  - modules loaded through require.js
  - converted all 3D vector map to use three.js
  - upgraded to three.js 0.79
  - electron cross-platform GUI
  - switched from python to node for file processing
- 3.0 (Oct 2015)
  - switched rendering to three.js/WebGL
  - DNA ribbon representation
  - arrow for Calphas
  - sequence-bar
  - peptide-bond block representation
- 2.0 (June 2015)
  - bond detector
  - global animation loop
  - correct embedding of widgets in DOM
  - json representation of views
  - parses PDB files in javascript
  - local web-server
  - multiple local loading options
  - integrated visual/residue controls in widgets
  - generation of self-contained webapp
  - single codebase for appengine/local-web/self-contained
  - responsive/iOS-touch web design
- 1.0 (May 2011)
  - original release
