

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

Download this [package](https://github.com/boscoh/jolecule/archive/master.zip).

Then run `yarn` to install all required modules.

## Display a PDB file

The viewer is written in ES6 javascript and compiled down to a
UMD in ES5. To use, you can:

1. run it through the `jol-electron` GUI wrapper
2. generate a self-contained web-page, or
3. embed it into your own webpage.

## Jol-electron native GUI

Run an electron app that opens a PDB via a native app.

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

- a specific camera angle
- the magnification
- the z-slab settings
- atom labels
- distance labels
- rendering options
- selected residues
- some explanatory text

`views` are internally stored as a `json` file. Locally, a PDB file `1mbo.pdb` will have the views saved as `1mbo.views.json`. On the public server, the views of <http://jolecule.com/pdb/1mbo> will be accessible at <http://jolecule.com/pdb/1mbo.views.json>.

 `Jolecule` knows how to animate smoothly between views. So a slide-show is activated by clicking on `loop` for a list of `views`.


## Embedding jolecule widgets

`jolecule` is designed to be easily embeddable as widgets in an external web-page. You can link to the public website or create a self-contained local version that can zipped and stuffed into an email attachment.

In the view, click on the `embed` button, you will be directed to the embedding page. This will give the instructions on how to link an embedded `jolecule` page.

If you are running the local version to the local web-server, it is important to note the link at the top of the page. This gives a `file:\\` location. Because of the security model of webbrowsers, we can't directly link to it. But this will point to a specially created directory that holds a complete self-contained version of `jolecule` that embeds the protein in question.

Browse the `index.html` page and see how the widget is embedded. Edit this page, or rip out the embeded code on your page. Essentially, four files are needed to run a `jolecule` widget:

- jolecule.js
- jolecule.css
- require.js
- data-server.js

In your code, you'll need to enter some javascript, the heart of which is something like this:

     register_global_animation_loop(
        new EmbedJolecule({
          div_tag: '#jolecule-embed, 
          data_server: data_server,
          loading_html: 'Loading PDB from RCSB web-site...', 
          loading_failure_html: 'Failed to load PDB.', 
          view_id: '',  
          view_height: 60, 
          is_view_text_shown: false,
          is_loop: false,
          is_editable: false,
        })
     );

The widget must must be registered with the function `register_global_animation_loop` . This is to ensure there is one single animation loop for the whole page, thus allowing multiple widgets to work. 

For multiple widgets, different `data_server` names and different `<div>` tags must be used. You'll have to edit this yourself.

The parameters in `EmbedJolecule` controls how the widget is displayed:

- div_tag: which HTML `<div>` tag that the widget is attached to. You can size this `<div>` yourself, but make sure there is no padding or margin.
- data_server: the name of the variable for the data in `data_server.js`. A unique name is crucial for multiple widgets.
- loading_html: the text shown when the widget is loading
- loading_failure_html: the text shown if PDB fails to load
- view_id: the id of the view you want to start with, by default it's the PDB's view
- view_height: the size of the text window for the view text
- is_view_text_shown: determines if the view text is shown or hidden
- is_loop: turns loopin on/off for slideshow
- is_editable: shows editing buttons, not really used for embedding

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

