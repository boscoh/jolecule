

# Jolecule

Read me
requires
- flask
- jinja2
- tkform

Frequently Asked Questions
==========================

How do I upload a file?
-----------------------

To upload your own PDB file, you will need to login with an account.
Joleucule uses your Google account for logins. Click on the login link
in the upper right hand side of the page, and you will be asked for your
Google account details.

Once logged in, you will see your google name next to the login link.
Click on this to access your page. On that page will be a link for you
to upload your pdb. You must enter a file through the file dialog, and
then click submit. Default accounts allow up to 5 structures. You can
delete existing structures to make room for other structures

What is the point of a slab clipping plane?
-------------------------------------------

The art of molecular visualization is to show only that which you are
interested in. Normally there is so much detail in a typical display
that it is very very difficult to see exactly what you want to see.

One common tool is to use a clipping plane - both front and back. In
jolecule, control of the clipping plane for visualization is considered
to be so important that the clipping plane is always displayed on the
right on the display panel. Moreover, you can directly move the front
and back planes by dragging the lines on the display.

For simplicity of controls, the shading goes from the central point to
the back plane. You can thus control the shading by changing the center
and/or moving the back plane.

How do I save a view?
---------------------

Once you have labeled your atoms of choice, added distance measurement,
found the right angle, centered the right atom etc., you can save by
simply pressing 'v' or clicking on the save link at the top of the
annotations panel.

How do I edit the text in an view
---------------------------------

Once a view is saved, it will pop up as a new entry in the annotated
views panel. The default text is 'Insert text here'. It will be the
highlighted box straight after the save. Under the text, there will be a
link called [edit]. Click on this to edit the text.

Reordering annotations
----------------------

Eventually, you may want to construct a slide-show. In that case, the
order of the views are very important as the animation will cycle
through the views according to the order. To change the order, go to one
the views you want to change, and click on the [up] link to move the
order up, or the [down] link to move the order down.

How should I use the annotations?
---------------------------------

They are to save interesting things you see in the structure. And also
to construct future slide shows.

What's kind of keyboard shortcuts?
----------------------------------

'L' - show/hide ligands  
 'S' - show/hide sidechains  
 'H' - show/hide hydrogens if any  

'B' - cycle through different backbone display styles  

'V' - save current view to annotated view  
 '&darr;' or ' ' - move to next annotated view  
 '&uarr;' - move to previous annotated view  
   

'&larr;' or 'K' - move to previous residue  
 '&rarr;' or 'J'- move to next residue

'X' - select centered atom (and show if the Sidechain option is off)   
 'A' - add label to centered atom

I don't like the rendering options?
-----------------------------------

The graphics are rendered with a very simple 3D engine that I wrote on
top of the canvas HTML5 element. It is meant to show a stylized protein.
The library can only convert 3D objects to circles and polygons.
Although a true OpenGL interface is planned for HTML5, it may take a few
years before it becomes as ubiquitous as the canvas element.

I don't like the ribbons
------------------------

The limitations of the graphics is due to HTML5. HTML5 introduced the
canvas element that is a 2D drawing element, and the canvas element has
been implemented on most browsers.. To do the limited 3D graphics, I
created a very simple 3D rendering-engine that takes a lot of shortcuts.
It is not designed to be a fully featured 3D engine. As such, it can
only really draw circles and polygons. Hence the 3D elements is
restricted to sticks and balls, and the ribbon only has carbon based
planes.

As the WebGL standard becomes, proper 3D graphics may be possible in web
browsers. Watch this space.

How do I select a subset of residues?
-------------------------------------

There are two interacting commands for this. First you must turn off the
sidechain checkbox. All sidehains will disappear. After that, you can
select residues in the Residue Panel, or you can click on an atom of the
residue you want, then, after the atom is center, you press 'X'.

How do stick a label on an atom?
--------------------------------

After you have clicked on an atom, and centered it, press 'A', or click
on the link 'label' at the bottom-left corner of the window. If you want
to delete the label, just click on it.

How do I measure distances between atoms?
-----------------------------------------

Simply drag the mouse from the centered atom to any other atom. If you
want to delete the distance, just click on the distance label.

Why have you restricted everything to the central atom?
-------------------------------------------------------

In typical protein viewers, there are three implicit centers: the
rotation center, the viewing center, and the measurement center. These
are typically ordered implicitly and not directly shown. Hence, it
requires a lot of guesswork to move confidently through a protein
structure. By restricting rotation, viewing, and manipulation to a
centered, you can always see where the key center is. I think the
clarity in control offsets any loss in flexibility.

How do move around the protein?
-------------------------------

In Jolecule, translation has been replaced with atom hopping. The
reasoning is that for beginners, it is much too easy to lose you center
of rotation, which is the most important thing for manipulating the
protein. Consequently, the center of rotation is always tied to the
centered atom. This has the result of providing a restricted set of
translations based on changing your centered atoms. Granted, this is not
good for making specific publication images, but it is not the current
goal of jolecule to make graphics. Rather the emphasis is on
ease-of-use.

How do I change the colors?
---------------------------

This is coming. I'm still thinking about the interface.

How do I send information?
--------------------------

Each structure, both from the PDB and uploaded, has a unique URL. Just
copy-and-paste, and send the URL to your buddy. If their browser is
modern, it should just work.

Each saved annotated view also has it's own URL, as well, each residue
has it's own URL.

How do I load a PDB file from the public database of protein structures?
------------------------------------------------------------------------

Set the URL to "jolecule.appspot.com/pdb/" + PDB\_ID. The protein will
be loaded directly from the Protein Data Bank.

How do I rotate the structure?
------------------------------

You drag the left mouse button in the display panel to pitch and roll.

You drag the right mouse button up/down to zoom in/out, and left/right
to rotate around the z-axis. An alternative for single-button mouse and
trackpads is to shift+left-mouse-button for zoom and z-axis.

How do I zoom?
--------------

Right-mouse button, or shift+left mouse-button.