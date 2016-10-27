import THREE from "three";
import $ from "jquery";
import _ from "underscore";
import v3 from "./v3";
import { View } from "./protein";
import {
    PathAndFrenetFrames,
    BlockArrowGeometry,
    UnitCylinderGeometry,
    drawCylinder,
    perpVector,
    expandPath,
    drawBlockArrow,
    setVisible,
    RaisedShapeGeometry,
    RibbonGeometry,
    getUnitVectorRotation,
    getFractionRotation,
    setGeometryVerticesColor
} from "./glgeometry";
import {
  exists,
  pos_dom,
  create_edit_box_div,
  stick_in_center,
  in_array,
  random_id,
} from "./util";

var TV3 = THREE.Vector3;


// Color constants

var green = new THREE.Color( 0x66CC66 );
var blue = new THREE.Color( 0x6666CC )
var yellow = new THREE.Color( 0xCCCC44 );
var purple = new THREE.Color( 0xCC44CC );
var grey = new THREE.Color( 0xBBBBBB );
var red = new THREE.Color( 0x993333 );

var darkGreen = new THREE.Color( 0x226622 );
var darkBlue = new THREE.Color( 0x333399 )
var darkYellow = new THREE.Color( 0x999922 );
var darkPurple = new THREE.Color( 0x992299 );
var darkGrey = new THREE.Color( 0x555555 );
var darkRed = new THREE.Color( 0x662222 );


var ElementColors = {
    "H": 0xCCCCCC,
    "C": 0xAAAAAA,
    "O": 0xCC0000,
    "N": 0x0000CC,
    "S": 0xAAAA00,
    "P": 0x6622CC,
    "F": 0x00CC00,
    "CL": 0x00CC00,
    "BR": 0x882200,
    "I": 0x6600AA,
    "FE": 0xCC6600,
    "CA": 0x8888AA
};



var getSsColor = function ( ss ) {

    if ( ss == "E" ) {
        return yellow;
    } else if ( ss == "H" ) {
        return blue;
    } else if ( ss == "D" ) {
        return purple;
    } else if ( ss == "C" ) {
        return green;
    } else if ( ss == "W" ) {
        return red;
    }
    return grey;

}


var getDarkSsColor = function ( ss ) {

    if ( ss == "E" ) {
        return darkYellow;
    } else if ( ss == "H" ) {
        return darkBlue;
    } else if ( ss == "D" ) {
        return darkPurple;
    } else if ( ss == "C" ) {
        return darkGreen;
    } else if ( ss == "W" ) {
        return darkRed;
    }
    return darkGrey;

}


// Backbone atom names

var backbone_atoms = [
    "N", "C", "O", "H", "HA", "CA", "OXT",
    "C3'", "P", "OP1", "O5'", "OP2",
    "C5'", "O5'", "O3'", "C4'", "O4'", "C1'", "C2'", "O2'",
    "H2'", "H2''", "H3'", "H4'", "H5'", "H5''", "HO3'",
];



// Cartoon cross-sections

var ribbonFace = new THREE.Shape( [
    new THREE.Vector2( -1.5, -0.2 ),
    new THREE.Vector2( -1.5, +0.2 ),
    new THREE.Vector2( +1.5, +0.2 ),
    new THREE.Vector2( +1.5, -0.2 ),
] );


var coilFace = new THREE.Shape( [
    new THREE.Vector2( -0.2, -0.2 ),
    new THREE.Vector2( -0.2, +0.2 ),
    new THREE.Vector2( +0.2, +0.2 ),
    new THREE.Vector2( +0.2, -0.2 ),
] );



// Tube cross-sections

var fatCoilFace = new THREE.Shape( [
    new THREE.Vector2( -0.25, -0.25 ),
    new THREE.Vector2( -0.25, +0.25 ),
    new THREE.Vector2( +0.25, +0.25 ),
    new THREE.Vector2( +0.25, -0.25 ),
] );


function degToRad( deg ) {

    return deg * Math.PI / 180.;

}


function getVerticesFromAtomDict( atoms, atomTypes ) {

    var vertices = [];

    for ( var i = 0; i < atomTypes.length; i += 1 ) {
        var aType = atomTypes[ i ];
        vertices.push( v3.clone( atoms[ aType ].pos ) );
    }

    return vertices;

}


function fraction( reference, target, t ) {

    return t * ( target - reference ) + reference;

}



var text_dialog = function ( parentDiv, label, success ) {

    window.keyboard_lock = true;

    var cleanup = function () {
        dialog.remove();
        window.keyboard_lock = false;
    }

    var editbox = create_edit_box_div(
        '', "100%", success, cleanup, label );

    var dialog = $( '<div>' )
        .addClass( 'jolecule-dialog' )
        .css( 'display', 'block' )
        .css( 'z-index', '2000' )
        .css( 'width', Math.min( 400, parentDiv.width() - 100 ) )
        .append( editbox );

    stick_in_center( parentDiv, dialog, 0, 70 );

    var focus = function () {
        editbox.find( 'textarea' )
            .focus();
    };
    setTimeout( focus, 100 );

}


var convertViewToTarget = function ( view ) {
    // - camera
    //     - pos: scene center, camera focus
    //     - up: gives the direction of the y vector from pos
    //     - in: gives the positive z-axis direction
    //     - scene is from 0 to positive z; since canvasjolecule draws +z into screen
    //     - as opengl +z is out of screen, need to flip z direction
    //     - in opengl, the box is -1 to 1 that gets projected on screen + perspective
    //     - by adding a i distance to move the camera further into -z
    //     - z_front and z_back define cutoffs
    // - opengl:
    //     - x right -> left
    //     - y bottom -> top (inverse of classic 2D coordinate)
    //     - z far -> near 
    //     - that is positive Z direction is out of the screen 
    //     - box -1to +1

    var cameraTarget = v3.clone( view.abs_camera.pos );

    var cameraDirection = v3.clone( view.abs_camera.in_v )
        .sub( cameraTarget )
        .multiplyScalar( view.abs_camera.zoom )
        .negate();

    var cameraPosition = cameraTarget.clone()
        .add( cameraDirection );

    var cameraUp = v3.clone( view.abs_camera.up_v )
        .sub( cameraTarget )
        .negate();

    var target = {
        cameraTarget: cameraTarget,
        cameraPosition: cameraPosition,
        cameraUp: cameraUp,
        zFront: view.abs_camera.z_front,
        zBack: view.abs_camera.z_back,
        zoom: view.abs_camera.zoom
    }

    return target;

}


var convertTargetToView = function ( target ) {

    var view = new View();

    var cameraDirection = target.cameraPosition.clone()
        .sub( target.cameraTarget )
        .negate();
    var zoom = cameraDirection.length()

    view.abs_camera.zoom = zoom;
    view.abs_camera.z_front = target.zFront;
    view.abs_camera.z_back = target.zBack;

    view.abs_camera.pos = v3.clone( target.cameraTarget );

    var up = target.cameraUp.clone()
        .negate()

    view.abs_camera.up_v = v3.clone(
        target.cameraTarget.clone()
        .add( up ) );

    cameraDirection.normalize()
    view.abs_camera.in_v = v3.clone(
        target.cameraTarget.clone()
        .add( cameraDirection ) );

    return view;

}



////////////////////////////////////////////////////////////////////
// MessageBar
////////////////////////////////////////////////////////////////////


class MessageBar {

    constructor( selector ) {
        this.div = $( "<div>" )
            .css( {
                'position': 'absolute',
                'top': 40,
                'left': 40,
                'z-index': 2000,
                'color': 'white',
                'padding': '5',
                'opacity': 0.7,
            } );

        this.parentDiv = $( selector );
        this.parentDiv.append( this.div );
    }

    hide() { this.div.css( 'display', 'none' ); }

    html( text ) {
        this.div.css('display', 'block');
        this.div.html(text);
    }

}


////////////////////////////////////////////////////////////////////
// PopupText
////////////////////////////////////////////////////////////////////

var PopupText = function ( selector ) {

    this.div = $( "<div>" )
        .css( {
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'z-index': 100,
            'background': 'white',
            'padding': '5',
            'opacity': 0.7,
            'display': 'none',
        } );

    this.arrow = $( "<div>" )
        .css( {
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'z-index': 100,
            'width': 0,
            'height': 0,
            'border-left': '5px solid transparent',
            'border-right': '5px solid transparent',
            'border-top': '50px solid white',
            'opacity': 0.7,
            'display': 'none',
        } );

    this.parentDiv = $( selector );
    this.parentDiv.append( this.div );
    this.parentDiv.append( this.arrow );

}


PopupText.prototype.move = function ( x, y ) {

    var parentDivPos = this.parentDiv.position();
    var width = this.div.innerWidth();
    var height = this.div.innerHeight();

    if ( ( x < 0 ) || ( x > this.parentDiv.width() ) || ( y < 0 ) ||
        ( y > this.parentDiv.height() ) ) {
        this.hide();
        return;
    }

    this.div.css( {
        'top': y - height - 50 + parentDivPos.top,
        'left': x - width / 2 + parentDivPos.left,
        'display': 'block',
        'font-family': 'sans-serif',
        'cursor': 'pointer'
    } );

    this.arrow.css( {
        'top': y - 50 + parentDivPos.top,
        'left': x - 5 + parentDivPos.left,
        'display': 'block',
    } );

}


PopupText.prototype.hide = function () {

    this.div.css( 'display', 'none' );
    this.arrow.css( 'display', 'none' );

}


PopupText.prototype.html = function ( text ) {

    this.div.html( text );

}


PopupText.prototype.remove = function () {
    this.div.remove();
    this.arrow.remove();
}


////////////////////////////////////////////////////////////////////
// AtomLabel
////////////////////////////////////////////////////////////////////

var AtomLabel = function ( selector, controller, parentList ) {

    this.popup = new PopupText( selector );
    this.controller = controller;
    this.parentList = parentList;

    var _this = this;

    this.popup.div.click( function () {
        _this.remove()
    } );
}


AtomLabel.prototype.update = function ( i, text, x, y, opacity ) {

    this.i = i;
    this.popup.html( text );
    this.popup.div.css( 'opacity', opacity );
    this.popup.arrow.css( 'opacity', opacity );
    this.popup.move( x, y );

}


AtomLabel.prototype.remove = function () {

    this.popup.remove();
    this.controller.delete_label( this.i );
    this.parentList.splice( this.i, 1 );

}


AtomLabel.prototype.hide = function () {

    this.popup.div.css( 'display', 'none' );
    this.popup.arrow.css( 'display', 'none' );

}


////////////////////////////////////////////////////////////////////
// DistanceLabel
////////////////////////////////////////////////////////////////////

var DistanceLabel = function (
    selector, threeJsScene, controller, parentList ) {

    this.threeJsScene = threeJsScene;
    this.controller = controller;
    this.parentList = parentList;

    this.div = $( "<div>" )
        .css( {
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'z-index': 100,
            'background-color': '#FFDDDD',
            'padding': '5',
            'opacity': 0.7,
            'font-family': 'sans-serif'
        } );

    var geometry = new THREE.Geometry();
    geometry.vertices.push( new TV3( 0, 0, 0 ) );
    geometry.vertices.push( new TV3( 1, 1, 1 ) );

    var material = new THREE.LineDashedMaterial( {
        color: 0xFF7777,
        dashSize: 3,
        gapSize: 4,
        linewidth: 2
    } );

    this.line = new THREE.Line( geometry, material );

    this.threeJsScene.add( this.line );

    this.parentDiv = $( selector );
    this.parentDiv.append( this.div );

    var _this = this;
    this.div.click( function ( event ) {
        _this.remove()
    } );

}

DistanceLabel.prototype.update = function (
    i, text, x, y, p1, p2, opacity ) {

    this.i = i;

    if ( ( x < 0 ) || ( x > this.parentDiv.width() ) || ( y < 0 ) ||
        ( y > this.parentDiv.height() ) ) {
        this.hide();
        return;
    }

    var parentDivPos = this.parentDiv.position();

    this.div.text( text );

    var width = this.div.innerHeight();
    var height = this.div.innerWidth();

    this.div.css( {
        'top': y - width / 2 + parentDivPos.top,
        'left': x - height / 2 + parentDivPos.left,
        'display': 'block',
        'cursor': 'pointer',
        'opacity': opacity
    } );

    this.line.geometry.vertices[ 0 ].copy( p1 );
    this.line.geometry.vertices[ 1 ].copy( p2 );

}

DistanceLabel.prototype.remove = function () {

    this.threeJsScene.remove( this.line );
    this.div.remove();
    this.controller.delete_dist( this.i );
    this.parentList.splice( this.i, 1 );

}


DistanceLabel.prototype.hide = function () {

    this.div.css( 'display', 'none' );

}


////////////////////////////////////////////////////////////////////
// LineElement
////////////////////////////////////////////////////////////////////

var LineElement = function ( selector, color ) {

    /* This DOM object is to draw a line between (x1, y1) and
    (x2, y2) within a jquery div */

    this.color = color;

    this.div = $( "<canvas>" )
        .css( {
            "position": "absolute",
            "z-index": "1000",
            "display": "none",
            "pointer-events": "none",
        } );

    this.canvas = this.div[ 0 ]
    this.context2d = this.canvas.getContext( '2d' )

    this.parentDiv = $( selector );
    this.parentDiv.append( this.div );

}


LineElement.prototype.hide = function () {

    this.div.css( "display", "none" );

}


LineElement.prototype.move = function ( x1, y1, x2, y2 ) {

    var parentDivPos = this.parentDiv.position();

    var width = Math.abs( x1 - x2 );
    var height = Math.abs( y1 - y2 );

    var left = Math.min( x1, x2 );
    var top = Math.min( y1, y2 );

    this.div
        .css( "display", "block" )
        .css( "width", width )
        .css( "height", height )
        .css( "top", top + parentDivPos.top )
        .css( "left", left + parentDivPos.left );

    this.canvas.width = width;
    this.canvas.height = height;

    this.context2d.clearRect( 0, 0, width, height );
    this.context2d.beginPath();
    this.context2d.moveTo( x1 - left, y1 - top );
    this.context2d.lineTo( x2 - left, y2 - top );
    this.context2d.lineWidth = 2;
    this.context2d.strokeStyle = this.color;
    this.context2d.stroke();

}



////////////////////////////////////////////////////////////////////
// CanvasWrapper - abstract class to wrap a canvas element
////////////////////////////////////////////////////////////////////

class CanvasWrapper {

    constructor(selector) {

        this.parentDiv = $(selector);

        this.div = $("<div>")
          .css('position', 'absolute')
          .css('z-index', 100);

        this.parentDiv.append(this.div);

        this.canvas = $('<canvas>');

        this.div.append(this.canvas);
        this.canvasDom = this.canvas[0];
        this.drawContext = this.canvasDom.getContext('2d');

        this.mousePressed = false;

        this.draw();

        var bind = ( eventType, callback ) => {
            this.canvasDom.addEventListener( eventType, callback );
        };

        bind( 'mousedown', e => this.mousedown( e ) );
        bind( 'mousemove', e => this.mousemove( e ) );
        bind( 'mouseup', e => this.mouseup( e ) );
        bind( 'mouseout', e => this.mouseup( e ) );
        bind( 'touchstart', e => this.mousedown( e ) );
        bind( 'touchmove', e => this.mousemove( e ) );
        bind( 'touchend', e => this.mouseup( e ) );
        bind( 'touchcancel', e => this.mouseup( e ) );

    }


    width() {
        return this.parentDiv.width();
    }


    height() {
        return this.parentDiv.height();
    }


    x() {
        var parentDivPos = this.parentDiv.position();
        return parentDivPos.left;
    }


    y() {
        var parentDivPos = this.parentDiv.position();
        return parentDivPos.top;
    }


    inside(x, y) {
        if ( ( x >= this.x() )
          && ( x <= this.x() + this.width() )
          && ( y >= this.y() )
          && ( y <= this.y() + this.height() )) {
            return true;
        }
        return false;
    }


    draw() { }


    resize() {

        var parentDivPos = this.parentDiv.position();
        this.canvasDom.width = this.width();
        this.canvasDom.height = this.height();

    }


    rect(x, y, w, h, fillStyle) {

        this.drawContext.fillStyle = fillStyle;
        this.drawContext.fillRect(x, y, w, h);

    }


    text(text, x, y, font, color, align) {

        this.drawContext.fillStyle = color;
        this.drawContext.font = font;
        this.drawContext.textAlign = align;
        this.drawContext.textBaseline = 'middle';
        this.drawContext.fillText(text, x, y);

    }


    textWidth(text, font) {

        this.drawContext.font = font;
        this.drawContext.textAlign = 'center';
        return this.drawContext.measureText(text).width;

    }

    mousedown(event) {

        event.preventDefault();

        this.mousePressed = true;

        this.mousemove(event);

    }

    mousemove(event) {

        event.preventDefault();

        if (!this.mousePressed) {
            return;
        }

    }

    mouseup(event) {

        event.preventDefault();

        this.mousePressed = false;

    }

    getPointer(event) {

        var x, y;
        if (event.touches) {
            x = event.touches[0].clientX;
            y = event.touches[0].clientY;
        } else {
            x = event.clientX;
            y = event.clientY;
        }

        this.pointerX = x + document.body.scrollLeft
          + document.documentElement.scrollLeft
          - this.x();

        this.pointerY = y + document.body.scrollTop
          + document.documentElement.scrollTop
          - this.y();

    }
}

////////////////////////////////////////////////////////////////////
// SequenceBar
////////////////////////////////////////////////////////////////////


var resToAa = {
    "ALA":"A", "CYS":"C", "ASP":"D",
    "GLU":"E", "PHE":"F", "GLY":"G",
    "HIS":"H", "ILE":"I", "LYS":"K",
    "LEU":"L", "MET":"M", "ASN":"N",
    "PRO":"P", "GLN":"Q", "ARG":"R",
    "SER":"S", "THR":"T", "VAL":"V",
    "TRP":"W", "TYR":"Y",
    "DA":"A", "DT":"T", "DG":"G", "DC":"C",
    "A":"A", "T":"T", "G":"G", "C":"C",
    "RA":"A", "RU":"U", "C":"C", "RG":"G",
    "U":"U",

}


function SequenceBar( selector, scene, proteinDisplay ) {

    CanvasWrapper.call( this, selector );
    this.scene = scene;
    this.iSelected = 0;
    this.proteinDisplay = proteinDisplay;

}

SequenceBar.prototype = Object.create( CanvasWrapper.prototype );

SequenceBar.prototype.constructor = SequenceBar;

SequenceBar.prototype.resize = function () {

    this.div.css( {
        'width': this.parentDiv.width(),
        'height': 40,
        'top': 0,
        'left': 0,
    } );
    this.canvasDom.width = this.width();
    this.canvasDom.height = this.height();

}

SequenceBar.prototype.iToX = function ( iRes ) {

    return parseInt( iRes / this.n_residue * this.width() );

}

SequenceBar.prototype.xToI = function ( x ) {

    return parseInt(x * this.n_residue / this.width());

}

SequenceBar.prototype.draw = function () {

    if ( !exists(this.scene)) {
        return;
    }

    var residues = this.scene.protein.residues;

    this.n_residue = residues.length;

    var ss = residues[0].ss;

    var i_start = 0;
    var i_end = 0;

    while ( i_end < this.n_residue ) {

        i_end += 1
        if ( i_end == this.n_residue || residues[ i_end ].ss != ss ) {

            var x1 = this.iToX( i_start );
            var x2 = this.iToX( i_end );
            var color = getSsColor( ss ).getStyle();
            this.rect(
                x1,
                0,
                x2 - x1,
                20,
                color );

            if ( i_end <= this.n_residue-1 ) {
                i_start = i_end;
                ss = residues[ i_end ].ss;
            }

        }

    }

}

SequenceBar.prototype.mousedown = function ( event ) {

    event.preventDefault();
    this.mousePressed = true;
    this.mousemove( event );

}

SequenceBar.prototype.mouseup = function ( event ) {

    event.preventDefault();
    this.mousePressed = false;

}

SequenceBar.prototype.mousemove = function ( event ) {

    if ( !this.mousePressed ) {
        return;
    }
    this.getPointer( event );

    var iRes = this.xToI( this.pointerX );
    this.proteinDisplay.setTargetFromAtom(
        this.scene.protein.residues[iRes].central_atom );

}


////////////////////////////////////////////////////////////////////
// SequenceWidget
////////////////////////////////////////////////////////////////////


var SequenceWidget = function( selector, scene, proteinDisplay ) {

    this.parentDiv = $(selector);
    this.scene = scene;
    this.proteinDisplay = proteinDisplay;

    this.div = $("<div>")
        .css('position', 'absolute')
        .css('overflow', 'hidden')
        .attr('id', 'sequence-widget');

    this.parentDiv.append(this.div);

    this.sequenceBar = new SequenceBar(
        '#sequence-widget', scene, proteinDisplay );

    this.textDiv = $("<div>")
        .css( {
            'position': 'absolute',
            'top': 0,
            'left': 0,
            'z-index': 100,
            'background': '#333',
            'padding': '5',
            'opacity': 0.5,
            'font-family': 'monospace',
            'user-select': 'none',
            'pointer-events': 'none',
        } );

    this.div.append(this.textDiv);

    this.resize();
}

SequenceWidget.prototype.x = function() {

    var parentDivPos = this.parentDiv.position();
    return parentDivPos.left;

}

SequenceWidget.prototype.y = function() {

    var parentDivPos = this.parentDiv.position();
    return parentDivPos.top;

}

SequenceWidget.prototype.resize = function () {

    this.div.css( {
        'width': this.parentDiv.width() - 40,
        'height': 40,
        'top': this.y(),
        'left': this.x(),
    } );

    this.sequenceBar.resize();

}

SequenceWidget.prototype.draw = function () {

    this.sequenceBar.draw();

    if ( !exists(this.scene)) {
        return;
    }

    var residues = this.scene.protein.residues;

    this.n_residue = residues.length;

    var resId = this.scene.current_view.res_id;
    var iRes = this.scene.protein.res_by_id[resId].i;

    var s = "";

    for (var i=iRes-10; i<iRes+11; i+=1) {
        if ( (i<0)  || (i>=residues.length) ) {
            s += "&nbsp;";
        } else {
            var residue =  residues[i]
            var style = "color:" + getSsColor( residue.ss ).getStyle();
            if (iRes == i) {
                style += ";border:1px solid #AAA";
            }
            s += '<span style="' + style + '">';
            var resType = residue.type;
            if ( resType in resToAa ) {
                s += resToAa[resType];
            } else {
                s += ".";
            }
            s += '</span>';
        }

    }

    this.textDiv.css({ 'top': 19 });
    this.textDiv.html(s);
    this.textDiv.css(
        'left',
        this.sequenceBar.iToX( iRes ) - this.textDiv.width() * 0.5 - 3);


}


////////////////////////////////////////////////////////////////////
// ZSlabBar
////////////////////////////////////////////////////////////////////

var ZSlabBar = function ( selector, scene ) {

    this.scene = scene;
    this.maxZLength = 0.0;
    CanvasWrapper.call( this, selector )
    this.div.attr( 'id', 'zslab' );
}


ZSlabBar.prototype = Object.create( CanvasWrapper.prototype );


ZSlabBar.prototype.constructor = ZSlabBar;


ZSlabBar.prototype.resize = function () {

    var parentDivPos = this.parentDiv.position();
    this.div.css( {
        'width': this.width(),
        'height': this.parentDiv.height(),
        'top': this.y(),
        'left': this.x(),
    } );
    this.canvasDom.width = this.width();
    this.canvasDom.height = this.height();

}


ZSlabBar.prototype.width = function () {
    return 40
}


ZSlabBar.prototype.x = function () {
    var parentDivPos = this.parentDiv.position();
    return this.parentDiv.width() - this.width() + parentDivPos.left;
}


ZSlabBar.prototype.y = function () {
    var parentDivPos = this.parentDiv.position();
    return parentDivPos.top;
}


ZSlabBar.prototype.yToZ = function ( y ) {

    var fraction = y / this.height();
    return ( 0.5 - fraction ) * this.maxZLength;

}


ZSlabBar.prototype.zToY = function ( z ) {

    var fraction = z / this.maxZLength;
    return ( 0.5 - fraction ) * this.height();

}


ZSlabBar.prototype.draw = function () {

    var protein = this.scene.protein;
    var camera = this.scene.current_view.abs_camera;
    this.maxZLength = 2.0 * protein.max_length;

    console.log('zslabbar draw', this.maxZLength, camera.z_back, camera.z_front);

    var yBack = this.zToY( camera.z_back );
    var yFront = this.zToY( camera.z_front );
    var yMid = this.zToY( 0 );

    var grey = "rgba(40, 40, 40, 0.75)";
    var dark = "rgba(100, 70, 70, 0.75)";
    var light = "rgba(150, 90, 90, 0.75)";

    this.rect(
        0, 0, this.width(), this.height(), grey);

    this.rect(
        0, yBack, this.width(), yMid - yBack, dark );

    this.rect(
        0, yMid, this.width(), yFront - yMid, light );

    var font = '12px sans-serif';
    var xm = this.width() / 2;

    this.text(
        'zslab', xm, 7, font, light, 'center' )
    this.text(
        'back', xm, yBack - 7, font, dark, 'center' )
    this.text(
        'front', xm, yFront + 7, font, light, 'center' )
}


ZSlabBar.prototype.getZ = function ( event ) {

    this.getPointer( event );

    this.z = this.yToZ( this.pointerY );

}


ZSlabBar.prototype.mousedown = function ( event ) {

    event.preventDefault();

    this.getZ( event );

    if ( this.z > 0 ) {
        this.back = true;
        this.front = false;
    } else {
        this.front = true;
        this.back = false;
    }

    this.mousePressed = true;

    this.mousemove( event );

}


ZSlabBar.prototype.mousemove = function ( event ) {

    event.preventDefault();

    if ( !this.mousePressed ) {
        return;
    }

    this.getZ( event );

    var abs_camera = this.scene.current_view.abs_camera;

    if ( this.back ) {
        abs_camera.z_back = Math.max( 2, this.z );
    } else if ( this.front ) {
        abs_camera.z_front = Math.min( -2, this.z );
    }

    this.scene.changed = true;

}


ZSlabBar.prototype.mouseup = function ( event ) {

    event.preventDefault();

    this.mousePressed = false;

}



////////////////////////////////////////////////////////////////////
// GlProteinDisplay
////////////////////////////////////////////////////////////////////

/*

GlProteinDisplay: The main window for the jolecule
webGL threeJs object.

*/


var GlProteinDisplay = function ( scene, selector, controller ) {

    console.log('init GlProteinDisplay');
    this.selector = selector;
    this.scene = scene;
    this.protein = scene.protein;
    this.controller = controller;

    var _this = this;
    this.controller.set_target_view_by_res_id = function ( resId ) {
        _this.setTargetFromResId( resId );
    }
    this.controller.calculate_current_abs_camera = function () {}

    // stores any meshes that can be clicked
    this.clickMeshes = [];

    // stores light objects to rotate with camera motion
    this.lights = [];

    this.saveMouseX = null;
    this.saveMouseY = null;
    this.saveMouseR = null;
    this.saveMouseT = null;
    this.mouseX = null;
    this.mouseY = null;
    this.mouseR = null;
    this.mouseT = null;
    this.mousePressed = false;

    this.labels = [];
    this.distanceLabels = [];

    // relative to the scene position from camera
    this.zFront = -40;
    this.zBack = 20;

    // determines how far away the camera is from the scene
    this.zoom = 50.0;

    this.mainDiv = $( this.selector );

    this.messageBar = new MessageBar( this.selector );

    this.threeJsScene = new THREE.Scene();
    this.threeJsScene.fog = new THREE.Fog( 0x000000, 1, 100 );
    this.threeJsScene.fog.near = this.zoom + 1;
    this.threeJsScene.fog.far = this.zoom + this.zBack;

    this.cameraTarget = new THREE.Vector3(0, 0, 0);

    this.setLights();

    this.camera = new THREE.PerspectiveCamera(
        45,
        this.width() / this.height(),
        this.zFront + this.zoom,
        this.zBack + this.zoom );

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor( 0x000000 );
    this.renderer.setSize( this.width(), this.height() );

    this.mainDiv[0].appendChild( this.renderer.domElement );

    this.hover = new PopupText( this.selector, "lightblue" );
    this.hover.div.css("pointer-events", "none");
    this.hover.arrow.css("pointer-events", "none");

    this.zSlab = new ZSlabBar( this.selector, this.scene );

    this.sequenceWidget = new SequenceWidget( this.selector, this.scene, this );

    this.distancePartnerPointer = new LineElement(
        this.selector, "#FF7777" );

    var _this = this;

    var dom = this.renderer.domElement;

    dom.addEventListener(
        'mousedown',
        function ( e ) {
            _this.mousedown( e )
        } );
    dom.addEventListener(
        'mousemove',
        function ( e ) {
            _this.mousemove( e )
        } );
    dom.addEventListener(
        'mouseup',
        function ( e ) {
            _this.mouseup( e )
        } );
    dom.addEventListener(
        'mousewheel',
        function ( e ) {
            _this.mousewheel( e )
        } );
    dom.addEventListener(
        'DOMMouseScroll',
        function ( e ) {
            _this.mousewheel( e )
        } );
    dom.addEventListener(
        'touchstart',
        function ( e ) {
            _this.mousedown( e );
        } );
    dom.addEventListener(
        'touchmove',
        function ( e ) {
            _this.mousemove( e );
        } );
    dom.addEventListener(
        'touchend',
        function ( e ) {
            _this.mouseup( e );
        } );
    dom.addEventListener(
        'touchcancel',
        function ( e ) {
            _this.mouseup( e );
        } );
    dom.addEventListener(
        'gesturestart',
        function ( e ) {
            _this.gesturestart( e );
        } );
    dom.addEventListener(
        'gesturechange',
        function ( e ) {
            _this.gesturechange( e );
        } );
    dom.addEventListener(
        'gestureend',
        function ( e ) {
            _this.gestureend( e );
        } );

}


GlProteinDisplay.prototype.post_load = function ( default_html ) {

    this.buildScene();

    // this is some mangling to link openGL
    // with the coordinate system that I had
    // chosen unwittingly when I first designed
    // the raster jolecule library

    var current_view = this.scene.current_view;
    current_view.res_id = this.protein.residues[ 0 ].id;

    current_view.abs_camera.z_front = -this.protein.max_length /
        2;
    current_view.abs_camera.z_back = this.protein.max_length /
        2;
    current_view.abs_camera.zoom = Math.abs( this.protein.max_length );
    current_view.camera.z_front = -this.protein.max_length / 2;
    current_view.camera.z_back = this.protein.max_length / 2;
    current_view.camera.zoom = Math.abs( this.protein.max_length );

    current_view.show.sidechain = false;

    current_view.camera.up_v = v3.create( 0, -1, 0 );
    current_view.abs_camera.up_v = v3.create( 0, -1, 0 );

    var atom = this.protein.get_central_atom();
    current_view.res_id = atom.res_id;
    var residue = this.protein.res_by_id[ current_view.res_id ];
    current_view.i_atom = residue.central_atom.i;
    var center = residue.central_atom.pos;

    current_view.abs_camera.transform(
        v3.translation( center ) );

    var neg_center = v3.scaled( center, -1 );
    this.scene.origin.camera.transform(
        v3.translation( neg_center ) );

    var default_view = current_view.clone();
    default_view.order = 0;
    default_view.text = default_html;
    default_view.pdb_id = this.protein.pdb_id;

    this.scene.save_view( default_view );

    this.cameraTarget.copy( center );
    this.camera.position
        .set( 0, 0, this.zoom )
        .add( this.cameraTarget );
    this.camera.lookAt( this.cameraTarget );

    this.threeJsScene.fog.near = this.zoom + 1;
    this.threeJsScene.fog.far = this.zoom + this.zBack;

    this.scene.is_new_view_chosen = true;
    this.scene.changed = true;

}


GlProteinDisplay.prototype.isPeptideConnected = function ( i0, i1 ) {

    var res0 = this.protein.residues[i0];
    var res1 = this.protein.residues[i1];

    if ( ( "C" in res0.atoms )
     && ( "N" in res1.atoms )
     && ( "CA" in res0.atoms )
     && ( "CA" in res1.atoms )  ) {

        // detect a potential peptide bond

        var c = res0.atoms["C"];
        var n = res1.atoms["N"];
        if ( v3.distance( c.pos, n.pos ) < 2 ) {
            return true;
        }
    }

    return false

}

GlProteinDisplay.prototype.isSugarPhosphateConnected = function ( i0, i1 ) {

    var res0 = this.protein.residues[i0];
    var res1 = this.protein.residues[i1];

    if ( ( "C3'" in res0.atoms )
        && ( "C1'" in res0.atoms )
        && ( "C5'" in res0.atoms )
        && ( "O3'" in res0.atoms )
        && ( "P" in res1.atoms )
        && ( "C3'" in res1.atoms )
        && ( "C1'" in res1.atoms )
        && ( "C5'" in res1.atoms ) ) {

        // detect nucloetide phosphate sugar bond
        var o3 = res0.atoms["O3'"];
        var p = res1.atoms["P"];
        if ( v3.distance( o3.pos, p.pos ) < 2.5 ) {
            return true;
        }

    }

    return false;

}


GlProteinDisplay.prototype.getNormalOfNuc = function ( res ) {

    var atoms = res.atoms;
    var forward = v3.diff(atoms["C3'"].pos, atoms["C5'"].pos);
    var up = v3.diff(atoms["C1'"].pos, atoms["C3'"].pos);
    var normal = v3.cross_product(forward, up);
    return normal;

}

GlProteinDisplay.prototype.findChainsAndPieces = function () {

    // Chains are continuous pieces of proteins or dna
    // Pieces are continuous pieces of secondary structure

    this.trace = new PathAndFrenetFrames();
    var trace = this.trace;

    this.trace.residues = [];

    var n_residue = this.protein.residues.length
    for ( var j = 0; j < n_residue; j += 1 ) {

        var residue = this.protein.residues[ j ];
        var isProteinNucOrConnected = false;

        if ( residue.is_protein_or_nuc ) {

            isProteinNucOrConnected = true;

        } else {

            if ( j > 0 ) {
                if ( this.isPeptideConnected( j-1, j) ) {
                    residue.central_atom = residue.atoms["CA"];
                    isProteinNucOrConnected = true;
                } else if ( this.isSugarPhosphateConnected( j-1, j )) {
                    residue.central_atom = residue.atoms["C3'"];
                    isProteinNucOrConnected = true;
                    residue.ss = "R";
                    residue.normal = this.getNormalOfNuc( residue );
                }
            }

            if ( j < n_residue - 1 ) {
                if ( this.isPeptideConnected( j, j+1) ) {
                    residue.central_atom = residue.atoms["CA"];
                    isProteinNucOrConnected = true;
                } else if ( this.isSugarPhosphateConnected( j, j + 1 ) ) {
                    residue.central_atom = residue.atoms["C3'"];
                    isProteinNucOrConnected = true;
                    residue.ss = "R";
                    residue.normal = this.getNormalOfNuc( residue );

                }
            }
        }

        if ( isProteinNucOrConnected ) {
            this.trace.residues.push( residue );
            this.trace.points.push( v3.clone(residue.central_atom.pos ) );

        }

    }

    this.trace.chains = [];
    this.trace.pieces = [];

    var iStart = 0;
    for ( var iEnd = 1; iEnd < this.trace.points.length + 1; iEnd +=
        1 ) {

        var isBreak = false;

        if ( iEnd == this.trace.points.length ) {
            isBreak = true
        } else {
            var iRes0 = this.trace.residues[ iEnd - 1].i;
            var iRes1 = this.trace.residues[ iEnd].i;
            isBreak = !this.isPeptideConnected(iRes0, iRes1) &&
                !this.isSugarPhosphateConnected(iRes0, iRes1);
        }

        if ( !isBreak ) {
            continue
        }

        if ( iStart == this.trace.points.length - 1 ) {
            continue;
        }

        var chain = {
            iStart: iStart,
            iEnd: iEnd,
            pieces: [],
        };

        this.trace.chains.push( chain );

        var ss = this.trace.residues[ iStart ].ss;
        var iPieceStart = iStart;
        var lenPiece = iEnd - iStart;

        for ( var iPieceEnd = iStart + 1; iPieceEnd < iEnd + 1; iPieceEnd +=
            1 ) {

            isBreak = false;
            if ( iPieceEnd == iEnd ) {
                isBreak = true;
            } else {
                var end_ss = this.trace.residues[ iPieceEnd ].ss;
                if ( end_ss != ss ) {
                    // if ( ( end_ss == "R" || ss == "D" ) &&
                    //      ( end_ss == "D" || ss == "R" ) ) {
                    //     continue;
                    // }
                    isBreak = true;
                }
                if ( iPieceEnd > 0 ) {
                    var res0 = this.trace.residues[ iPieceEnd - 1 ];
                    var res1 = this.trace.residues[ iPieceEnd ];
                }
            }

            if ( !isBreak ) {
                continue
            }

            chain.pieces.push( {
                iStart: iPieceStart,
                iEnd: iPieceEnd,
                ss: ss,
            } );

            iPieceStart = iPieceEnd;
            if ( iPieceEnd < iEnd ) {
                ss = this.trace.residues[ iPieceEnd ].ss;
            }

        }

        iStart = iEnd;

    }

}


GlProteinDisplay.prototype.calcContinuousTangents = function ( trace,
    iStart, iEnd ) {

    var points = trace.points;

    var iLast = iEnd - 1;

    if ( ( iEnd - iStart ) > 2 ) {

        trace.tangents[ iStart ] = points[ iStart + 1 ].clone()
            .sub( points[ iStart ] )
            .normalize();

        for ( var i = iStart + 1; i < iLast; i += 1 ) {
            trace.tangents[ i ] = points[ i + 1 ].clone()
                .sub( points[ i - 1 ] )
                .normalize();
        }

        trace.tangents[ iLast ] = points[ iLast ].clone()
            .sub( points[ iLast - 1 ] )
            .normalize();

        for ( var i = iStart + 1; i < iLast; i += 1 ) {
            if ( trace.residues[ i ].normal !== null ) {
                trace.normals[ i ] = perpVector(
                        trace.tangents[ i ],
                        v3.clone( trace.residues[ i ].normal )
                    )
                    .normalize();
            } else {
                var diff = points[ i ].clone()
                    .sub( points[ i - 1 ] );
                trace.normals[ i ] = new TV3()
                    .crossVectors(
                        diff, trace.tangents[ i ] )
                    .normalize();
            }
        }

        trace.normals[ iStart ] = trace.normals[ iStart + 1 ];

        trace.normals[ iLast ] = trace.normals[ iLast - 1 ];

    } else {

        // for 2 point loops
        var tangent = points[ iLast ].clone()
            .sub( points[ iStart ] )
            .normalize()

        trace.tangents[ iStart ] = tangent;
        trace.tangents[ iLast ] = tangent;

        for ( var i = iStart; i <= iLast; i += 1 ) {
            if ( trace.residues[ i ].normal !== null ) {
                trace.normals[ i ] = perpVector(
                        trace.tangents[ i ],
                        v3.clone( trace.residues[ i ].normal )
                    )
                    .normalize();
            } else {
                var randomDir = points[ i ]
                trace.normals[ i ] = new TV3()
                    .crossVectors( randomDir, tangent )
                    .normalize();
            }
        }

    }

    for ( var i = iStart + 1; i < iEnd; i += 1 ) {
        if ( trace.residues[ i ].ss != "D" && trace.residues[ i -
                1 ].ss != "D" ) {
            if ( trace.normals[ i ].dot( trace.normals[ i - 1 ] ) <
                0 ) {
                trace.normals[ i ].negate();
            }
        }
    }

    for ( var i = iStart; i < iEnd; i += 1 ) {
        trace.binormals[ i ] = new TV3()
            .crossVectors(
                trace.tangents[ i ], trace.normals[ i ] );
    }

}


GlProteinDisplay.prototype.getAtomColor = function ( atom ) {

    if ( atom.elem == "C" || atom.elem == "H" ) {
        var res = this.protein.res_by_id[ atom.res_id ];
        return getSsColor( res.ss );
    } else if ( atom.elem in ElementColors ) {
        return ElementColors[ atom.elem ];
    }
    return darkGrey;

}


GlProteinDisplay.prototype.setLights = function () {

    var directionalLight =
        new THREE.DirectionalLight( 0xFFFFFF );
    directionalLight.position.copy(
        new TV3( 0.2, 0.2, 100 )
        .normalize() );
    directionalLight.intensity = 1.2;
    this.lights.push( directionalLight );

    var directionalLight2 =
      new THREE.DirectionalLight( 0xFFFFFF );
    directionalLight2.position.copy(
      new TV3( 0.2, 0.2, -100 )
        .normalize() );
    directionalLight2.intensity = 1.2;
    this.lights.push( directionalLight2 );

    var ambientLight = new THREE.AmbientLight( 0x202020 );
    this.lights.push( ambientLight );

    for ( var i = 0; i < this.lights.length; i += 1 ) {
        this.threeJsScene.add( this.lights[ i ] );
    }

}


GlProteinDisplay.prototype.getSsFace = function ( ss ) {

    if ( ss == "C" || ss == "-" ) {
        return coilFace;
    }
    return ribbonFace;

}


GlProteinDisplay.prototype.buildTube = function () {

    this.objects.tube = new THREE.Object3D();

    var detail = 4;

    for ( var iChain = 0; iChain < this.trace.chains.length; iChain +=
        1 ) {

        var chain = this.trace.chains[ iChain ];
        var iStart = chain.iStart;
        var iEnd = chain.iEnd;

        this.calcContinuousTangents( this.trace, iStart, iEnd );
        var path = expandPath( this.trace.slice( iStart, iEnd ),
            2 * detail );

        for ( var iPiece = 0; iPiece < chain.pieces.length; iPiece +=
            1 ) {

            var piece = chain.pieces[ iPiece ];
            var iPieceStart = piece.iStart - iStart;
            var iPieceEnd = piece.iEnd - iStart;
            var ss = piece.ss;

            if ( ( iPieceEnd - iPieceStart ) < 1 ) {
                continue;
            }

            // allows for overhang between residues
            var iPathStart = ( 2 * iPieceStart - 1 ) * detail;
            if ( iPathStart < 0 ) {
                iPathStart = 0;
            }

            var iPathEnd = ( iPieceEnd * 2 - 1 ) * detail + 1;
            if ( iPathEnd > path.points.length - 1 ) {
                iPathEnd = path.points.length - 1;
            }

            var pieceOfPath = path.slice( iPathStart, iPathEnd );

            var material = new THREE.MeshLambertMaterial( {
                color: getSsColor( ss )
            } );

            var geom = new RibbonGeometry( fatCoilFace,
                pieceOfPath, true );

            var mesh = new THREE.Mesh( geom, material );

            mesh.visible = false;
            this.objects.tube.add( mesh );

        }

    }

}



GlProteinDisplay.prototype.buildCartoon = function () {

    this.objects.ribbons = new THREE.Object3D();

    var detail = 4;

    for ( var iChain = 0; iChain < this.trace.chains.length; iChain +=
        1 ) {

        var chain = this.trace.chains[ iChain ];
        var iStart = chain.iStart;
        var iEnd = chain.iEnd;

        this.calcContinuousTangents( this.trace, iStart, iEnd );
        var path = expandPath( this.trace.slice( iStart, iEnd ),
            2 * detail );

        for ( var iPiece = 0; iPiece < chain.pieces.length; iPiece +=
            1 ) {

            var piece = chain.pieces[ iPiece ];
            var iPieceStart = piece.iStart - iStart;
            var iPieceEnd = piece.iEnd - iStart;
            var ss = piece.ss;

            if ( ( iPieceEnd - iPieceStart ) < 1 ) {
                continue;
            }

            // allows for overhang between residues
            var iPathStart = ( 2 * iPieceStart - 1 ) * detail;
            if ( iPathStart < 0 ) {
                iPathStart = 0;
            }

            var iPathEnd = ( iPieceEnd * 2 - 1 ) * detail + 1;
            if ( iPathEnd > path.points.length - 1 ) {
                iPathEnd = path.points.length - 1;
            }

            var pieceOfPath = path.slice( iPathStart, iPathEnd );

            var face = this.getSsFace( ss );
            var color = getSsColor( ss );
            var round = ss == "C";

            var material = new THREE.MeshLambertMaterial( {
                color: color
            } );
            var geom = new RibbonGeometry( face, pieceOfPath,
                round );
            var mesh = new THREE.Mesh( geom, material );

            this.objects.ribbons.add( mesh );

        }

    }

}


GlProteinDisplay.prototype.buildArrows = function () {

    this.objects.arrows = new THREE.Object3D();

    for ( var iChain = 0; iChain < this.trace.chains.length; iChain +=
        1 ) {
        var chain = this.trace.chains[ iChain ];
        for ( var iPiece = 0; iPiece < chain.pieces.length; iPiece +=
            1 ) {
            var piece = chain.pieces[ iPiece ];
            var color = getDarkSsColor( piece.ss );
            for ( var i = piece.iStart; i < piece.iEnd; i += 1 ) {

                var arrow = drawBlockArrow(
                    this.trace.points[ i ],
                    this.trace.tangents[ i ],
                    this.trace.binormals[ i ],
                    color )

                arrow.atom = this.trace.residues[ i ].central_atom;
                arrow.atom.is_central = true;

                this.objects.arrows.add( arrow );

                this.clickMeshes.push( arrow );
            }
        }
    }

}


GlProteinDisplay.prototype.mergeBond = function (
    totalGeom, bond, residue ) {

    function cylinderMatrix( from, to, radius ) {

        var midpoint = from.clone()
            .add( to )
            .multiplyScalar( 0.5 );

        var obj = new THREE.Object3D();
        obj.scale.set( radius, radius, from.distanceTo( to ) );
        obj.position.copy( midpoint );
        obj.lookAt( to );
        obj.updateMatrix();
        return obj.matrix;

    }

    var p1 = v3.clone( bond.atom1.pos );
    var p2 = v3.clone( bond.atom2.pos );

    var res1 = this.protein.res_by_id[ bond.atom1.res_id ];
    var res2 = this.protein.res_by_id[ bond.atom2.res_id ];

    var color1 = getSsColor( res1.ss );
    var color2 = getSsColor( res2.ss );

    var geom = new UnitCylinderGeometry();

    var radius = 0.2;

    if ( color1 == color2 ) {

        setGeometryVerticesColor( geom, color1 );

        totalGeom.merge( geom, cylinderMatrix( p1, p2, radius ) );

    } else {

        var midpoint = p2.clone()
            .add( p1 )
            .multiplyScalar( 0.5 );

        if ( bond.atom1.res_id == residue.id ) {
            setGeometryVerticesColor( geom, color1 );
            totalGeom.merge( geom, cylinderMatrix( p1, midpoint,
                radius ) );
        }

        if ( bond.atom2.res_id == residue.id ) {
            setGeometryVerticesColor( geom, color2 );
            totalGeom.merge( geom, cylinderMatrix( p2, midpoint,
                radius ) );
        }
    }

}


GlProteinDisplay.prototype.mergeAtom = function ( totalGeom, atom ) {

    if ( atom.is_alt ) {
        return;
    }

    var pos = v3.clone( atom.pos );
    var color = this.getAtomColor( atom );
    var geom = this.unitSphereGeom;
    setGeometryVerticesColor( geom, color );

    var radius = 0.35;
    var obj = new THREE.Object3D();
    obj.scale.set( radius, radius, radius );
    obj.position.copy( pos );
    obj.updateMatrix();

    totalGeom.merge( geom, obj.matrix );

}


GlProteinDisplay.prototype.pushAtom = function ( object, atom ) {

    var pos = v3.clone( atom.pos );
    var material = new THREE.MeshLambertMaterial( {
        color: this.getAtomColor( atom )
    } );
    var radius = 0.35;
    var mesh = new THREE.Mesh( this.unitSphereGeom, material );
    mesh.scale.set( radius, radius, radius );
    mesh.position.copy( pos );
    mesh.atom = atom;
    object.add( mesh );
    this.clickMeshes.push( mesh );

}


GlProteinDisplay.prototype.assignBonds = function () {

    for ( var j = 0; j < this.protein.residues.length; j += 1 ) {
        var res = this.protein.residues[ j ];
        res.bonds = [];
    }

    for ( var j = 0; j < this.protein.bonds.length; j += 1 ) {

        var bond = this.protein.bonds[ j ];
        var atom1 = bond.atom1;
        var atom2 = bond.atom2;

        if ( atom1.is_alt || atom2.is_alt ) {
            continue;
        }

        var res1 = this.protein.res_by_id[ atom1.res_id ];
        var res2 = this.protein.res_by_id[ atom2.res_id ];

        res1.bonds.push( bond );

        if ( res1 != res2 ) {
            res2.bonds.push( bond );
        }

    }

}


GlProteinDisplay.prototype.buildBackbone = function () {

    this.objects.backbone = new THREE.Object3D();

    var geom = new THREE.Geometry();

    for ( var i = 0; i < this.protein.residues.length; i += 1 ) {

        var residue = this.protein.residues[ i ]
        if ( !residue.is_protein_or_nuc ) {
            continue;
        }

        for ( var j = 0; j < residue.bonds.length; j += 1 ) {
            var bond = residue.bonds[ j ];
            if ( in_array( bond.atom1.type, backbone_atoms ) ||
                in_array( bond.atom2.type, backbone_atoms ) ) {
                this.mergeBond( geom, bond, residue );
            }
        }

        for ( var a in residue.atoms ) {
            var atom = residue.atoms[ a ];
            if ( in_array( atom.type, backbone_atoms ) ) {
                this.pushAtom( this.objects.backbone, atom );
            }
        }

    }

    var material = new THREE.MeshLambertMaterial( {
        color: 0xFFFFFF,
        vertexColors: THREE.VertexColors
    } );
    var mesh = new THREE.Mesh( geom, material );
    this.objects.backbone.add( mesh );

    this.threeJsScene.add( this.objects.backbone );

}


GlProteinDisplay.prototype.buildLigands = function () {

    this.objects.ligands = new THREE.Object3D();
    this.threeJsScene.add( this.objects.ligands );

    var geom = new THREE.Geometry();

    for ( var i = 0; i < this.protein.residues.length; i += 1 ) {

        var residue = this.protein.residues[ i ]

        if ( !residue.is_ligands ) {
            continue;
        }

        for ( var j = 0; j < residue.bonds.length; j += 1 ) {
            this.mergeBond( geom, residue.bonds[ j ], residue );
        }

        for ( var a in residue.atoms ) {
            this.pushAtom( this.objects.ligands, residue.atoms[ a ] );
        }

    }

    var material = new THREE.MeshLambertMaterial( {
        color: 0xFFFFFF,
        vertexColors: THREE.VertexColors
    } );
    var mesh = new THREE.Mesh( geom, material );
    this.objects.ligands.add( mesh );

}


GlProteinDisplay.prototype.buildWaters = function () {

    console.log('buildWaters');

    this.objects.water = new THREE.Object3D();
    this.threeJsScene.add( this.objects.water );

    var geom = new THREE.Geometry();

    for ( var i = 0; i < this.protein.residues.length; i += 1 ) {

        var residue = this.protein.residues[ i ]

        if ( !residue.is_water ) {
            continue;
        }

        for ( var j = 0; j < residue.bonds.length; j += 1 ) {
            this.mergeBond( geom, residue.bonds[ j ], residue );
        }

        for ( var a in residue.atoms ) {
            this.pushAtom( this.objects.water, residue.atoms[ a ] );
        }

    }

    var material = new THREE.MeshLambertMaterial( {
        color: 0xFFFFFF,
        vertexColors: THREE.VertexColors
    } );
    var mesh = new THREE.Mesh( geom, material );
    this.objects.water.add( mesh );

}


GlProteinDisplay.prototype.drawSidechain = function ( residue ) {

    if ( !residue.is_protein_or_nuc ) {
        return;
    }

    var scGeom = new THREE.Geometry();
    residue.sidechain = new THREE.Object3D();
    this.threeJsScene.add( residue.sidechain );

    for ( var j = 0; j < residue.bonds.length; j += 1 ) {

        var bond = residue.bonds[ j ];

        if ( !in_array( bond.atom1.type, backbone_atoms ) ||
            !in_array( bond.atom2.type, backbone_atoms ) ) {

            this.mergeBond( scGeom, bond, residue );
        }

    }

    var material = new THREE.MeshLambertMaterial( {
        color: 0xFFFFFF,
        vertexColors: THREE.VertexColors
    } );
    var mesh = new THREE.Mesh( scGeom, material );
    residue.sidechain.add( mesh );

    for ( var a in residue.atoms ) {
        var atom = residue.atoms[ a ];
        if ( !in_array( atom.type, backbone_atoms ) ) {
            atom.is_sidechain = true;
            this.pushAtom( residue.sidechain, atom );
        }
    }

}


function addBondGeometry( totalGeom, atoms, a1, a2, color ) {

    var vertices = getVerticesFromAtomDict( atoms, [ a1, a2 ] );
    var cylinder = drawCylinder(
        vertices[ 0 ], vertices[ 1 ], 0.2, color, true );
    cylinder.updateMatrix();
    totalGeom.merge( cylinder.geometry, cylinder.matrix );

}


GlProteinDisplay.prototype.buildPeptideBonds = function () {

    var totalGeom = new THREE.Geometry();

    var residues = this.protein.residues;

    var isProtein = function ( iRes ) {

        var residue = residues[ iRes ]
        return residue.ss != "D" && residue.is_protein_or_nuc;

    }

    for ( var iRes = 1; iRes < this.protein.residues.length; iRes +=
        1 ) {

        if ( !isProtein( iRes - 1 ) || !isProtein( iRes ) ) {
            continue;
        }

        var geom = new THREE.Geometry()

        var residue0 = this.protein.residues[ iRes - 1 ];
        var residue1 = this.protein.residues[ iRes ];

        var vertices;

        var vertices = getVerticesFromAtomDict(
            residue0.atoms, [ "CA", "O", "C" ] );
        var ca0 = vertices[ 0 ];
        var o = vertices[ 1 ];
        var c = vertices[ 2 ];


        vertices = getVerticesFromAtomDict(
            residue1.atoms, [ "CA", "N" ] );
        var ca1 = vertices[ 0 ];
        var n = vertices[ 1 ];

        if ( c.distanceTo( n ) > 3 ) {
            continue;
        }

        var ca1ToN = new TV3()
            .subVectors( n, ca1 );
        var cToN = new TV3()
            .subVectors( n, c );
        var nToH = new TV3()
            .addVectors( ca1ToN, cToN )
            .normalize()
            .multiplyScalar( 1.0 );
        var h = n.clone()
            .add( nToH );

        var color0 = getSsColor( residues[ iRes - 1 ].ss );
        var color1 = getSsColor( residues[ iRes ].ss );

        var color = color0;
        var vertices = [ ca0, o, c, n, h, ca0 ];
        var geom = new RaisedShapeGeometry( vertices, 0.3 );
        geom.merge( geom, geom.matrix );
        setGeometryVerticesColor( geom, color );
        totalGeom.merge( geom );

        var color = color1;
        var vertices = [ ca1, o, c, n, h, ca1 ];
        var geom = new RaisedShapeGeometry( vertices, 0.3 );
        geom.merge( geom, geom.matrix );
        setGeometryVerticesColor( geom, color );

        totalGeom.merge( geom );

    }

    totalGeom.computeFaceNormals();

    var material = new THREE.MeshLambertMaterial( {
        color: 0xFFFFFF,
        vertexColors: THREE.VertexColors
    } );

    this.objects.peptides = new THREE.Mesh( totalGeom, material );

    this.threeJsScene.add( this.objects.peptides );

}


GlProteinDisplay.prototype.buildNucleotides = function () {

    var totalGeom = new THREE.Geometry();

    for ( var iRes = 0; iRes < this.protein.residues.length; iRes +=
        1 ) {

        var residue = this.protein.residues[ iRes ]

        if ( residue.ss != "D" || !residue.is_protein_or_nuc ) {
            continue;
        }

        var geom = new THREE.Geometry()
        var atomTypes, bondTypes;

        if ( residue.type == "DA" || residue.type == "A" ) {

            atomTypes = [ "N9", "C8", "N7", "C5", "C6",
                "N1", "C2", "N3", "C4"
            ];
            bondTypes = [
                [ "C3'", "C2'" ],
                [ "C2'", "C1'" ],
                [ "C1'", "N9" ],
                [ "C6", "N6" ]
            ];

        } else if ( residue.type == "DG" || residue.type == "G" ) {

            atomTypes = [ "N9", "C8", "N7", "C5", "C6", "N1",
                "C2", "N3", "C4"
            ];
            bondTypes = [
                [ "C3'", "C2'" ],
                [ "C2'", "C1'" ],
                [ "C1'", "N9" ],
                [ "C6", "O6" ],
                [ "C2", "N2" ]
            ];

        } else if ( residue.type == "DT" || residue.type == "U" ) {

            atomTypes = [ "C6", "N1", "C2", "N3", "C4", "C5" ];
            bondTypes = [
                [ "C3'", "C2'" ],
                [ "C2'", "C1'" ],
                [ "C1'", "N1" ],
                [ "C4", "O4" ]
            ];

        } else if ( residue.type == "DC" || residue.type == "C" ) {

            atomTypes = [ "C6", "N1", "C2", "N3", "C4", "C5" ];
            bondTypes = [
                [ "C3'", "C2'" ],
                [ "C2'", "C1'" ],
                [ "C1'", "N1" ],
                [ "C4", "N4" ],
                [ "C2", "O2" ]
            ];

        } else {

            continue;

        }

        var vertices = getVerticesFromAtomDict( residue.atoms,
            atomTypes );
        var geom = new RaisedShapeGeometry( vertices, 0.3 );
        geom.merge( geom, geom.matrix );

        for ( var i = 0; i < bondTypes.length; i += 1 ) {
            var bond = bondTypes[ i ];
            addBondGeometry(
                geom, residue.atoms, bond[ 0 ], bond[ 1 ] );
        }

        totalGeom.merge( geom );

        baseMesh = new THREE.Mesh( geom, material );
        baseMesh.atom = residue.central_atom;
        baseMesh.updateMatrix();
        this.clickMeshes.push( baseMesh );

    }

    totalGeom.computeFaceNormals();

    var material = new THREE.MeshLambertMaterial( {
        color: getSsColor( "D" ),
        vertexColors: THREE.VertexColors
    } );

    var color = new THREE.Color( purple );
    setGeometryVerticesColor( totalGeom, color );

    this.objects.basepairs = new THREE.Mesh( totalGeom, material );

}


GlProteinDisplay.prototype.buildCrossHairs = function() {
    var radius = 1.2,
    segments = 60,
    material = new THREE.LineDashedMaterial(
        { color: 0xFF7777, linewidth: 2 } );
    var geometry = new THREE.CircleGeometry( radius, segments );

    // Remove center vertex
    geometry.vertices.shift();

    this.crossHairs = new THREE.Line( geometry, material );
    this.threeJsScene.add( this.crossHairs );
}


GlProteinDisplay.prototype.moveCrossHairs = function() {

    this.crossHairs.position.copy(this.cameraTarget);
    this.crossHairs.lookAt(this.camera.position );
    this.crossHairs.updateMatrix();
}


GlProteinDisplay.prototype.buildScene = function () {

    this.messageBar.html( 'Drawing scene...' );

    this.messageBar.html( 'Finding chains...' );

    this.findChainsAndPieces();

    this.unitSphereGeom = new THREE.SphereGeometry( 1, 8, 8 );

    this.objects = {}

    this.messageBar.html( 'Building cartoon...' );

    // this.buildTube();

    this.buildCartoon();

    // this.buildNucleotides();
    this.buildArrows();
    for ( var k in this.objects ) {
        this.threeJsScene.add( this.objects[ k ] );
    }

    this.buildCrossHairs();

    this.messageBar.html( 'Finding bonds...' );

    this.assignBonds();

    this.messageBar.hide();

}


GlProteinDisplay.prototype.setTargetFromResId = function ( resId ) {

    var atom = this.protein.res_by_id[ resId ].central_atom;
    this.setTargetFromAtom( atom );

}


GlProteinDisplay.prototype.setTargetFromAtom = function (
    atom ) {

    var position = v3.clone( atom.pos );
    var sceneDisplacement = position.clone()
        .sub( this.cameraTarget );

    var view = convertTargetToView( {
        cameraTarget: position,
        cameraPosition: this.camera.position.clone()
            .add( sceneDisplacement ),
        cameraUp: this.camera.up.clone(),
        zFront: this.zFront,
        zBack: this.zBack,
    } );

    view.copy_metadata_from_view( this.scene.current_view );
    view.res_id = atom.res_id;
    view.i_atom = atom.i;
    this.scene.target_view = view;

    this.scene.is_new_view_chosen = true;
    this.scene.n_update_step = this.scene.max_update_step;

}



GlProteinDisplay.prototype.setCameraFromCurrentView = function () {

    var target = convertViewToTarget(
        this.scene.current_view
    );

    var cameraDirection = this.camera.position.clone()
        .sub( this.cameraTarget )
        .normalize();

    var targetCameraDirection = target.cameraPosition.clone()
        .sub( target.cameraTarget );
    this.zoom = targetCameraDirection.length();
    targetCameraDirection.normalize();

    var rotation = getUnitVectorRotation(
        cameraDirection, targetCameraDirection );

    for ( var i = 0; i < this.lights.length; i += 1 ) {
        this.lights[ i ].position.applyQuaternion( rotation );
    }

    this.cameraTarget.copy( target.cameraTarget );
    this.camera.position.copy( target.cameraPosition );
    this.camera.up.copy( target.cameraUp );

    this.zFront = target.zFront;
    this.zBack = target.zBack;

    var far = this.zoom + this.zBack;
    var near = this.zoom + this.zFront;
    if ( near < 1 ) {
        near = 1;
    }

    this.camera.near = near;
    this.camera.far = far;
    this.camera.lookAt( this.cameraTarget );
    this.camera.updateProjectionMatrix();

    this.threeJsScene.fog.near = near;
    this.threeJsScene.fog.far = far;

    var residues = this.protein.residues;
    var view = this.scene.current_view;
    for ( var i = 0; i < residues.length; i += 1 ) {
        residues[ i ].selected = false;
    }
    for ( var i = 0; i < view.selected.length; i += 1 ) {
        var i_res = view.selected[ i ];
        residues[ i_res ].selected = true;
    }

}


GlProteinDisplay.prototype.adjustCamera = function (
    xRotationAngle, yRotationAngle, zRotationAngle, zoomRatio ) {

    var y = this.camera.up;
    var z = this.camera.position.clone()
        .sub( this.cameraTarget )
        .normalize();
    var x = ( new TV3() )
        .crossVectors( y, z )
        .normalize();

    var rot_z = new THREE.Quaternion()
        .setFromAxisAngle( z, zRotationAngle );

    var rot_y = new THREE.Quaternion()
        .setFromAxisAngle( y, -yRotationAngle );

    var rot_x = new THREE.Quaternion()
        .setFromAxisAngle( x, -xRotationAngle );

    var rotation = new THREE.Quaternion()
        .multiply( rot_z )
        .multiply( rot_y )
        .multiply( rot_x );

    var newZoom = zoomRatio * this.zoom;

    if ( newZoom < 2 ) {
        newZoom = 2;
    }

    var cameraPosition = this.camera.position.clone()
        .sub( this.cameraTarget )
        .applyQuaternion( rotation )
        .normalize()
        .multiplyScalar( newZoom )
        .add( this.cameraTarget );

    var view = convertTargetToView( {
        cameraTarget: this.cameraTarget.clone(),
        cameraPosition: cameraPosition,
        cameraUp: this.camera.up.clone()
            .applyQuaternion( rotation ),
        zFront: this.zFront,
        zBack: this.zBack,
    } );

    view.copy_metadata_from_view( this.scene.current_view );

    this.controller.set_current_view( view );

}


GlProteinDisplay.prototype.resize = function () {

    this.camera.aspect = this.width() / this.height();
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( this.width(), this.height() );

    this.zSlab.resize();
    this.sequenceWidget.resize();

    this.controller.flag_changed();

}


GlProteinDisplay.prototype.width = function () {

    return this.mainDiv.width();

}


GlProteinDisplay.prototype.height = function () {

    return this.mainDiv.height();

}


GlProteinDisplay.prototype.getMouse = function ( event ) {

    // if ( exists( event.touches ) && ( event.touches.length == 2 ) ) {
    //     var x0 = event.touches[0].x;
    //     var y0 = event.touches[0].y;
    //     var x1 = event.touches[1].x;
    //     var y1 = event.touches[1].y;
    //     var x = x1 - x0;
    //     var y = y1 - y0;
    //     this.pinchR = Math.sqrt( x*x + y*y );
    //     this.mouseT = Math.atan( y / x );
    //     if ( x < 0 ) {
    //         if ( y > 0 ) {
    //             this.mouseT += Math.PI;
    //         } else {
    //             this.mouseT -= Math.PI;
    //         }
    //     }
    // }


    if ( exists( event.touches ) && ( event.touches.length > 0 ) ) {
        this.eventX = event.touches[ 0 ].clientX;
        this.eventY = event.touches[ 0 ].clientY;
    } else {
        this.eventX = event.clientX;
        this.eventY = event.clientY;
    }

    var result = pos_dom(this.mainDiv[0]);
    this.mouseX = this.eventX - result[0];
    this.mouseY = this.eventY - result[1];

    var x = this.mouseX - this.width() / 2;
    var y = this.mouseY - this.height() / 2;

    this.mouseR = Math.sqrt( x * x + y * y );

    this.mouseT = Math.atan( y / x );
    if ( x < 0 ) {
        if ( y > 0 ) {
            this.mouseT += Math.PI;
        } else {
            this.mouseT -= Math.PI;
        }
    }
}


GlProteinDisplay.prototype.saveMouse = function () {

    this.saveMouseX = this.mouseX;
    this.saveMouseY = this.mouseY;
    this.saveMouseR = this.mouseR;
    this.saveMouseT = this.mouseT;

}



GlProteinDisplay.prototype.getZ = function ( pos ) {

    var origin = this.cameraTarget.clone();

    var cameraDir = origin.clone()
        .sub( this.camera.position )
        .normalize();

    var posRelativeToOrigin = pos.clone()
        .sub( origin );

    return posRelativeToOrigin.dot( cameraDir );

}



GlProteinDisplay.prototype.inZlab = function ( pos ) {

    var z = this.getZ( pos );

    if ( ( z >= this.zFront ) && ( z <= this.zBack ) ) {

        return true;

    } else {

        return false;

    }

}


GlProteinDisplay.prototype.opacity = function ( pos ) {

    var z = this.getZ( pos );

    if ( z < this.zFront ) {
        return 1.0;
    }

    if ( z > this.zBack ) {
        return 0.0;
    }

    var depth = 1 - ( z - this.zFront ) / ( this.zBack - this.zFront );

    return depth;

}


GlProteinDisplay.prototype.getHoverAtom = function () {

    var x = this.mouseX;
    var y = this.mouseY;

    if ( ( x === null ) || ( y === null ) ) {
        return null;
    }

    var vector = new THREE.Vector3(
        ( x / this.width() ) * 2 - 1,
        -( y / this.height() ) * 2 + 1,
        0.5
    );

    vector.unproject( this.camera );

    var raycaster = new THREE.Raycaster(
        this.camera.position,
        vector.sub( this.camera.position )
        .normalize()
    );

    var intersects = raycaster.intersectObjects(
        this.clickMeshes );

    var show = this.scene.current_view.show;

    for ( var i = 0; i < intersects.length; i += 1 ) {

        var intersect = intersects[ i ];

        var atom = intersect.object.atom;
        var res = this.protein.res_by_id[ atom.res_id ];

        if ( atom.is_sidechain && !show.sidechain && !res.selected ) {
            continue;
        }

        if ( atom.is_backbone && !atom.is_central && !show.all_atom ) {
            continue;
        }

        if ( atom.is_ligand && !show.ligands ) {
            continue;
        }

        if ( atom.is_water && !show.water ) {
            continue;
        }

        if ( this.inZlab( v3.clone( intersect.object.atom.pos ) ) ) {
            return intersects[ i ].object.atom;
        }

    }

    return null;
}



GlProteinDisplay.prototype.posXY = function ( pos ) {

    var widthHalf = 0.5 * this.width();
    var heightHalf = 0.5 * this.height();

    var vector = pos.project( this.camera );

    var result = {
        x: ( vector.x * widthHalf ) + widthHalf,
        y: -( vector.y * heightHalf ) + heightHalf }

    return result;
}



GlProteinDisplay.prototype.atom_label_dialog = function () {

    var i_atom = this.scene.current_view.i_atom;
    if ( i_atom >= 0 ) {

        var controller = this.controller;
        var success = function ( text ) {
            controller.make_label( i_atom, text );
        }

        var atom = this.protein.atoms[ i_atom ];
        var label = 'Label atom : ' + atom.label;

        text_dialog( this.mainDiv, label, success );
    }

}


GlProteinDisplay.prototype.updateHover = function () {

    this.hoverAtom = this.getHoverAtom();

    if ( this.hoverAtom ) {

        var text = this.hoverAtom.label;
        if ( this.hoverAtom == this.scene.centered_atom() ) {
            text = "<center>" + text
            text = text +
                "<br>[drag distances]<br>[double-click labels]</center>"
        }
        this.hover.html( text );
        var vector = this.posXY( v3.clone( this.hoverAtom.pos ) );
        this.hover.move( vector.x, vector.y );

    } else {

        this.hover.hide();

    }

}


GlProteinDisplay.prototype.mousedown = function ( event ) {

    this.getMouse( event );

    event.preventDefault();

    var now = ( new Date )
        .getTime();

    var isDoubleClick = ( now - this.timePressed ) < 500;

    this.updateHover();

    this.downAtom = this.getHoverAtom();

    this.isDraggingCentralAtom = false;

    if ( this.downAtom !== null ) {

        if ( this.downAtom == this.scene.centered_atom() ) {

            this.isDraggingCentralAtom = true;

            if ( isDoubleClick ) {

                this.atom_label_dialog();

                this.isDraggingCentralAtom = false;
            }
        }

    }

    this.timePressed = now;

    this.saveMouse();
    this.mousePressed = true;

}


GlProteinDisplay.prototype.mousemove = function ( event ) {

    this.getMouse( event );

    event.preventDefault();

    if ( this.isGesture ) {
        return;
    }

    this.updateHover();

    if ( this.isDraggingCentralAtom ) {

        var mainDivPos = this.mainDiv.position()
        var v = this.posXY( v3.clone( this.downAtom.pos ) );

        this.distancePartnerPointer.move( this.mouseX, this.mouseY,
            v.x,
            v.y );

    } else {

        var shiftDown = ( event.shiftKey == 1 );

        var rightMouse =
            ( event.button == 2 ) || ( event.which == 3 );

        if ( this.mousePressed ) {

            var zoomRatio = 1.0;
            var zRotationAngle = 0;
            var yRotationAngle = 0;
            var xRotationAngle = 0;

            if ( rightMouse || shiftDown ) {

                zRotationAngle = this.mouseT - this.saveMouseT

                if ( this.mouseR > 0.0 ) {
                    zoomRatio = this.saveMouseR / this.mouseR;
                }

            } else {

                yRotationAngle = degToRad( this.mouseX - this.saveMouseX );
                xRotationAngle = degToRad( this.mouseY - this.saveMouseY );

            }

            this.adjustCamera(
                xRotationAngle, yRotationAngle,
                zRotationAngle, zoomRatio );

            this.saveMouse();

        }
    }

}


GlProteinDisplay.prototype.mousewheel = function ( event ) {

    event.preventDefault();

    if ( exists(event.wheelDelta) ) {
        var wheel = event.wheelDelta/120;
    } else {
        // for Firefox
        var wheel = -event.detail/12;
    }
    zoom = Math.pow(1 + Math.abs(wheel)/2 , wheel > 0 ? 1 : -1);

    this.adjustCamera( 0, 0, 0, zoom );

}


GlProteinDisplay.prototype.mouseup = function ( event ) {

    this.getMouse( event );

    event.preventDefault();

    if ( this.isDraggingCentralAtom ) {

        if ( this.hoverAtom !== null ) {

            var centralAtom = this.scene.centered_atom();

            if ( this.hoverAtom !== centralAtom ) {
                this.controller.make_dist( this.hoverAtom,
                    centralAtom );
            }

        }

        this.distancePartnerPointer.hide();

        this.isDraggingCentralAtom = false;

    } else if ( this.hoverAtom !== null ) {

        if ( this.hoverAtom == this.downAtom ) {

            this.setTargetFromAtom( this.hoverAtom );
        }

    }

    if ( exists( event.touches ) ) {

        this.hover.hide();
        this.mouseX = null;
        this.mouseY = null;

    }

    this.downAtom = null;

    this.mousePressed = false;

}


GlProteinDisplay.prototype.onKeyDown = function ( event ) {

    if ( window.keyboard_lock ) {
        return
    }

    var c = String.fromCharCode( event.keyCode )
        .toUpperCase();

    if ( c == ' ' ) {

        this.controller.set_target_next_view();

    } else if ( c == 'V' ) {

        this.controller.save_current_view( random_id() );

    } else if ( c == 'B' ) {

        var show = this.scene.current_view.show;
        if ( show.all_atom ) {
            this.controller.set_backbone_option( 'ribbon' );
        } else if ( show.ribbon ) {
            this.controller.set_backbone_option( 'trace' );
        } else if ( show.trace ) {
            this.controller.set_backbone_option( 'all_atom' );
        }

        this.controller.flag_changed();

    } else if ( c == 'N' ) {

        this.controller.toggle_neighbors( false );

    } else if ( c == 'W' ) {

        this.controller.toggle_show_option( 'water' );

    } else if ( c == 'L' ) {

        this.controller.toggle_show_option( 'ligands' );


    } else if ( c == 'X' ) {

        var i_atom = this.scene.current_view.i_atom;
        if ( i_atom >= 0 ) {
            var res_id = this.protein.atoms[ i_atom ].res_id;
            var res = this.protein.res_by_id[ res_id ]
            var i = this.protein.get_i_res_from_res_id( res_id );
            this.controller.select_residue( i, !res.selected );
        }

    } else if ( c == 'S' ) {

        this.controller.set_show_option( 'sidechain', true );

    } else if ( c == 'C' ) {

        this.controller.set_show_option( 'sidechain', false );
        this.controller.clear_selected();

    }

}


GlProteinDisplay.prototype.gesturestart = function ( event ) {

    event.preventDefault();
    this.isGesture = true;
    this.lastPinchRotation = 0;
    this.lastScale = event.scale * event.scale;

}


GlProteinDisplay.prototype.gesturechange = function ( event ) {

    event.preventDefault();
    this.adjustCamera(
        0,
        0,
        degToRad( event.rotation * 2 - this.lastPinchRotation ),
        this.lastScale / ( event.scale * event.scale ) );

    this.lastPinchRotation = event.rotation * 2;
    this.lastScale = event.scale * event.scale

}


GlProteinDisplay.prototype.gestureend = function ( event ) {

    event.preventDefault();
    this.isGesture = false;
    this.downAtom = null;
    this.mousePressed = false;

}


GlProteinDisplay.prototype.is_changed = function () {

    return this.scene.changed;

}


GlProteinDisplay.prototype.selectVisibleObjects = function () {

    var show = this.scene.current_view.show;

    setVisible( this.objects.tube, show.trace );

    setVisible( this.objects.ribbons, show.ribbon );

    setVisible( this.objects.arrows, !show.all_atom );

    if ( !exists( this.objects.backbone ) && show.all_atom ) {
        this.messageBar.html('building backbone');
        this.buildBackbone();
        this.buildPeptideBonds();
        this.messageBar.html('');
    }
    setVisible( this.objects.backbone, show.all_atom );
    setVisible( this.objects.peptides, show.all_atom );

    if ( !exists( this.objects.ligands ) && show.ligands ) {
        this.buildLigands();
    }
    setVisible( this.objects.ligands, show.ligands );

    if ( !exists( this.objects.water ) && show.water ) {
        this.buildWaters();
    }
    setVisible( this.objects.water, show.water );

    for ( var i = 0; i < this.trace.residues.length; i += 1 ) {

        var residue = this.trace.residues[ i ];

        var residueShow;
        if ( show.sidechain ) {
            residueShow = true;
        } else {
            residueShow = residue.selected;
        }

        if ( residueShow && !exists( residue.sidechain ) ) {
            this.drawSidechain( residue );
        }
        setVisible( residue.sidechain, residueShow );

    }

}


GlProteinDisplay.prototype.drawDistanceLabels = function () {

    var distances = this.scene.current_view.distances;
    var distanceLabels = this.distanceLabels;
    var atoms = this.protein.atoms;

    for ( var i = 0; i < distances.length; i += 1 ) {

        var distance = distances[ i ];

        var p1 = v3.clone( atoms[ distance.i_atom1 ].pos );
        var p2 = v3.clone( atoms[ distance.i_atom2 ].pos );
        var m = p1.clone()
            .add( p2 )
            .multiplyScalar( 0.5 );
        var opacity = 0.7 * this.opacity( m ) + 0.2;

        var v = this.posXY( m );
        var text = p1.distanceTo( p2 )
            .toFixed( 1 );

        if ( i >= distanceLabels.length ) {
            this.distanceLabels.push(
                new DistanceLabel(
                    this.selector, this.threeJsScene,
                    this.controller, this.distanceLabels ) );
        }

        distanceLabels[ i ].update(
            i, text, v.x, v.y, p1, p2, opacity );

        if ( !this.inZlab( m ) ) {
            distanceLabels[ i ].hide();
        }

    }

    for ( var i = distanceLabels.length - 1; i >= 0; i -= 1 ) {
        if ( i >= distances.length ) {
            distanceLabels[ i ].remove();
        }
    }

}


GlProteinDisplay.prototype.drawAtomLabels = function () {

    var labels = this.scene.current_view.labels;
    var atomLabels = this.labels;

    for ( var i = atomLabels.length; i < labels.length; i += 1 ) {
        var atomLabel = new AtomLabel(
            this.selector, this.controller, atomLabels );
        atomLabels.push( atomLabel );
    }

    for ( var i = atomLabels.length - 1; i >= 0; i -= 1 ) {
        if ( i >= labels.length ) {
            atomLabels[ i ].remove();
        }
    }

    var atoms = this.protein.atoms;

    for ( var i = 0; i < labels.length; i += 1 ) {

        var atom = atoms[ labels[ i ].i_atom ];
        var pos = v3.clone( atom.pos );
        var v = this.posXY( pos );
        var opacity = 0.7 * this.opacity( pos ) + 0.2;

        atomLabels[ i ].update(
            i, labels[ i ].text, v.x, v.y, opacity );

        if ( !this.inZlab( pos ) ) {
            atomLabels[ i ].hide();
        }

    }

}


GlProteinDisplay.prototype.draw = function () {
    if (_.isUndefined(this.objects)) {
        return;
    }
    if ( !this.is_changed() ) {
        return;
    }
    this.resize();
    this.setCameraFromCurrentView();
    this.selectVisibleObjects();
    this.drawAtomLabels();
    this.drawDistanceLabels();
    this.moveCrossHairs();
    this.renderer.render( this.threeJsScene, this.camera );
    this.drawAtomLabels();
    this.drawDistanceLabels();
    this.zSlab.draw();
    this.sequenceWidget.draw();
    this.scene.changed = false;

}


GlProteinDisplay.prototype.animate = function () {

    if ( this.scene.target_view == null ) {
        return;
    }

    this.scene.n_update_step -= 1;

    var nStep = this.scene.n_update_step;

    if ( nStep <= 0 ) {
        return;
    }

    var t = 1.0 / nStep

    var old = {
        cameraTarget: this.cameraTarget.clone(),
        cameraPosition: this.camera.position.clone(),
        cameraUp: this.camera.up.clone(),
        zFront: this.zFront,
        zBack: this.zBack
    }

    var oldCameraDirection = old.cameraPosition.clone()
        .sub( old.cameraTarget );
    var oldZoom = oldCameraDirection.length();
    oldCameraDirection.normalize();

    var target = convertViewToTarget( this.scene.target_view );
    var targetCameraDirection =
        target.cameraPosition.clone()
        .sub( target.cameraTarget );
    var targetZoom = targetCameraDirection.length();
    targetCameraDirection.normalize();

    var targetCameraDirRotation = getUnitVectorRotation(
        oldCameraDirection, targetCameraDirection )

    var rotatedCameraUp = old.cameraUp.clone()
        .applyQuaternion( targetCameraDirRotation )

    var newCameraRotation = getUnitVectorRotation(
        rotatedCameraUp, target.cameraUp );
    newCameraRotation.multiply(
        targetCameraDirRotation );
    newCameraRotation = getFractionRotation(
        newCameraRotation, t );

    var current = {};
    var disp = target.cameraTarget.clone()
        .sub( old.cameraTarget )
        .multiplyScalar( t )
    current.cameraTarget = old.cameraTarget.clone()
        .add( disp );
    var zoom = fraction( oldZoom, targetZoom, t );
    var disp = oldCameraDirection.clone()
        .applyQuaternion( newCameraRotation )
        .multiplyScalar( zoom )
    current.cameraPosition = current.cameraTarget.clone()
        .add( disp );
    current.cameraUp = old.cameraUp.clone()
        .applyQuaternion( newCameraRotation );
    current.zFront = fraction( old.zFront, target.zFront, t );
    current.zBack = fraction( old.zBack, target.zBack, t );

    var view = convertTargetToView( current );
    view.copy_metadata_from_view( this.scene.target_view );
    this.controller.set_current_view( view );

    this.updateHover();
}


export {
    backbone_atoms,
    ribbonFace,
    coilFace,
    fatCoilFace,
    degToRad,
    getVerticesFromAtomDict,
    fraction,
    text_dialog,
    convertViewToTarget,
    convertTargetToView,
    MessageBar,
    PopupText,
    AtomLabel,
    DistanceLabel,
    LineElement,
    CanvasWrapper,
    SequenceBar,
    SequenceWidget,
    ZSlabBar,
    GlProteinDisplay,
}