

# jolecule - a javascript/WebGL viewer for proteins and DNA

`jolecule` is a WebGL protein viewer for proteins and DNA. It can used:

- through the public website <http://jolecule.com> 
- on your smartphone
- as a local webapp for your PDB files
- as an embeded widget on your website

The download here is for using `jolecule` as a local webapp,
or building embedded `jolecule` widgets in  your website.


## Installation

The requirements are:

- a modern webbrowser - Chrome, Safari, Firefox
- node.js - the javascript runtime
- yarn - a javascript package manager
- electron - gui library

Download this [package](https://github.com/boscoh/jolecule/archive/master.zip).

Then run `yarn` to install all required modules.

To install `electron`: `yarn add -g electron`

## Display a PDB file

The viewer is written in ES6 javascript and compiled down to a
UMD in ES5. To use, you can:

1. run it through the `jol-electron` GUI wrapper
2. generate a self-contained web-page, or
3. embed it into your own webpage.

## Jol-electron native GUI

Run a native-GUI electron app to open PDB files:

       ./jol-electron.sh

This will run a simple app that allows you to run jolecule lke a native app.

If you open a file `your.pdb`, views will be saved in `your.views.json`.

## Create a static self-contained webpage

To create a static web page with a PDB converted to a javascript module:

       ./jol-static.js your.pdb
    
This will create a directory `your-jol` and a completely contained
web-page is available at `your-jol/index.html`.

If there also exists a `your.views.json`, these will also be built
statically in the webpage


## Building jolecule

The build process is simply to run webpack.
 
    node_modules/.bin/webpack

If you develop some more, run webpack in watch mode:

    node_modules/.bin/webpack -w

Alternatively, you can run es6 files directly with:

    node_modules/.bin/babel-node your.es6.js

Babel is set to transpile es6 in the `.babelrc` file.

## Visual/GUI Design 

`jolecule` optimizes a simple but rich interface that focuses on
stereochemistry. The focus is on Richardson ribbons that join with
sidechains correctly. Ligands are rendered as balls-and-sticks to
allow the stereochemistry to be seen clearly.
As well arrows are used indicate directionality
on both protein and DNA chains.


## Views and Animated Slideshows

A key concept in `jolecule` is a `view` of the molecule. A `view` stores:

      {
        "camera": {
          "in": [ # position of camera target direction
            20.75720932831459,
            11.068200781142572,
            6.5859819544366776
          ],
          "pos": [ # position of camera
            20.86,
            11.27,
            7.56
          ],
          "slab": { # the z slab relative to camera.pos
            "z_back": 16.38124031007752,
            "z_front": -3.947286821705422,
            "zoom": 32.03436948308024 # how close to the camera.pos
          },
          "up": [ # position of viewer up relative to camera.pos
            20.17884846971397,
            10.570683536097107,
            7.776769638333817
          ]
        },
        "creator": "~ public @9/12/2016",
        "distances": [
          {
            "i_atom1": 213,
            "i_atom2": 90
          }
        ],
        "i_atom": 920,
        "labels": [
          {
            "i_atom": 920,
            "text": "hello"
          }
        ],
        "order": 1, # the order of the view in a list of views
        "pdb_id": "1mbo",
        "res_id": "A:115",
        "selected": [],
        "show": { # rendering options
          "all_atom": false,
          "hydrogen": false,
          "ligands": true,
          "peptide": true,
          "ribbon": true,
          "sidechain": false,
          "trace": false,
          "water": false
        },
        "text": "Click edit to change this text.",
        "version": 2,
        "view_id": "view:a1l45z"
      },

`views` are internally stored as a `json` file. Locally, a PDB file
`1mbo.pdb` will have the views saved as `1mbo.views.json`. On the public
server, the views of <http://jolecule.com/pdb/1mbo> will be
accessible at <http://jolecule.com/pdb/1mbo.views.json>.

`Jolecule` knows how to animate smoothly between views. So a slide-show
 is activated by clicking on `loop` for a list of `views`.


## Embedding jolecule widgets

`jolecule` is designed to be easily embeddable as widgets in an external
web-page. You can link to the public website or create a self-contained
local version that can zipped and stuffed into an email attachment.

An example is given in `examples/1mbo-jol`. It contians:

- index.html - generic html that looks for the following files
- require.js - the module loader
- jolecule.js - the bundled jolecule UMD module
- jolecule.css - common stylings
- data-server.js - specific data for your structure.

This is the loading code in `index.html`:

    <script src="require.js"></script>
    <script>
        require( ['jolecule', 'data-server'], function(jolecule, dataServer) {
            document.title = "jolecule - 1mbo";
            jolecule.initEmbedJolecule({
                div_tag: '#jolecule-views-container',
                data_server: dataServer
            });
        });
    </script>

For multiple widgets in a single page, you can load multiple times, using
different values for `data_server` and `div_tag`.

The parameters in `initEmbedJolecule` controls how the widget is displayed:

- `div_tag`: which HTML `<div>` tag that the widget is attached to.
  You can size this `<div>` yourself, but make sure there is no
  padding or margin.
- `data_server`: the name of the variable for the data in `data_server.js`.
  A unique name is crucial for multiple widgets.
- `view_id`: the id of the view you want to start with, by default it's the PDB's view
- `view_height`: the size of the text window for the view text
- `is_view_text_shown`: determines if the view text is shown or hidden
- `is_loop`: turns loopin on/off for slideshow
- `is_editable`: shows editing buttons, not really used for embedding

## Changelog

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

