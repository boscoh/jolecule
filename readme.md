

# jolecule - a javascript/WebGL viewer for proteins and DNA

`jolecule` is a WebGL protein viewer for proteins and DNA. It can used:

- through the public website <http://jolecule.com> 
- on your smartphone
- as a local webapp for your PDB files
- as an embeded widget on your website

The download here is for using `jolecule` as a local webapp, or building embedded `jolecule` widgets in  your website.


## Installation

Download this [package](https://github.com/boscoh/jolecule/archive/master.zip).

The viewer is written in javascript/HTML5 and runs in a webbrowser. To run `jolecule` locally, you also need Python and some libraries.

The requirements are:

- a modern webbrowser - Chrome, Safari, Firefox
- python 2.7 - a scripting language to handle infrastructure
- flask - a python micro web framework
- jinja2 - a templating engine
- tkform - a python GUI library

On some Macs and Linux, python is preinstalled. Otherwise you need to install [python](https://www.python.org/downloads/), ensuring that command-line links are activated, and the python package manager [pip](https://pip.pypa.io/en/latest/installing.html). Then:

    pip install flask jinja2 tkform

## Load a PDB file

_In Mac OS_, double-click in Finder:
    
    jolecule.command

_In Windows_, double-click in File Explorer:

    jolecule.bat

Once the GUI is started, click on `Load PDB`. This will start the local web-server, which will server your PDB file into the webbrowser.  

_On the command line_, you can put `jolecule.py` on the path, and then:

    jolecule.py 1abc.pdb


## Visual/GUI Design 

`jolecule` optimizes a simple but rich interface that focuses on stereochemistry. The focus is on Richardson ribbons that join with sidechains correctly. Ligands are rendered as balls-and-sticks to allow the stereochemistry to be seen clearly. As well arrows are used indicate directionality on both protein and DNA chains.


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
- jquery.js
- data_server.js 

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
