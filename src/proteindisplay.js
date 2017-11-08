import THREE from 'three'
import $ from 'jquery'
import _ from 'lodash'
import v3 from './v3'
import {View} from './protein'
import {
  PathAndFrenetFrames,
  UnitCylinderGeometry,
  perpVector,
  BlockArrowGeometry,
  expandPath,
  setVisible,
  RaisedShapeGeometry,
  RibbonGeometry,
  getUnitVectorRotation,
  getFractionRotation,
  setGeometryVerticesColor,
  clearObject3D
} from './glgeometry'
import {
  toggleButton,
  linkButton,
  exists,
  getDomPosition,
  stickJqueryDivInCenter,
  inArray,
  stickJqueryDivInTopLeft
} from './util'


var TV3 = THREE.Vector3

// Color constants

var green = new THREE.Color(0x639941)
var blue = new THREE.Color(0x568AB5)
var yellow = new THREE.Color(0xFFC900)
var purple = new THREE.Color(0x9578AA)
var grey = new THREE.Color(0xBBBBBB)
var red = new THREE.Color(0x993333)

var darkGreen = new THREE.Color(0x2E471E)
var darkBlue = new THREE.Color(0x406786)
var darkYellow = new THREE.Color(0xC39900)
var darkPurple = new THREE.Color(0x5E4C6B)
var darkGrey = new THREE.Color(0x555555)
var darkRed = new THREE.Color(0x662222)

var ElementColors = {
  'H': 0xCCCCCC,
  'C': 0xAAAAAA,
  'O': 0xCC0000,
  'N': 0x0000CC,
  'S': 0xAAAA00,
  'P': 0x6622CC,
  'F': 0x00CC00,
  'CL': 0x00CC00,
  'BR': 0x882200,
  'I': 0x6600AA,
  'FE': 0xCC6600,
  'CA': 0x8888AA,
  'He': 0x7B86C2,
  'Ne': 0x9ED2E4,
  'Ar': 0x5DC4BE,
  'Kr': 0xACD376,
  'Xe': 0xF79F7C,
  'Rn': 0xE29EC5
}

for (let [k, v] of _.toPairs(ElementColors)) {
  ElementColors[k] = new THREE.Color(v)
}

function getSsColor (ss) {
  if (ss === 'E') {
    return yellow
  } else if (ss === 'H') {
    return blue
  } else if (ss === 'D') {
    return purple
  } else if (ss === 'C') {
    return green
  } else if (ss === 'W') {
    return red
  }
  return grey
}


function getDarkSsColor (ss) {
  if (ss === 'E') {
    return darkYellow
  } else if (ss === 'H') {
    return darkBlue
  } else if (ss === 'D') {
    return darkPurple
  } else if (ss === 'C') {
    return darkGreen
  } else if (ss === 'W') {
    return darkRed
  }
  return darkGrey
}


function getResColor (res) {
  return res.color
}


function getAtomColor (atom) {
  return new THREE.Color().setHex(atom.i)
}


// Backbone atom names

var backboneAtoms = [
  'N', 'C', 'O', 'H', 'HA', 'CA', 'OXT',
  'C3\'', 'P', 'OP1', 'O5\'', 'OP2',
  'C5\'', 'O5\'', 'O3\'', 'C4\'', 'O4\'', 'C1\'', 'C2\'', 'O2\'',
  'H2\'', 'H2\'\'', 'H3\'', 'H4\'', 'H5\'', 'H5\'\'', 'HO3\''
]

// Cartoon cross-sections

var ribbonFace = new THREE.Shape([
  new THREE.Vector2(-1.5, -0.2),
  new THREE.Vector2(-1.5, +0.2),
  new THREE.Vector2(+1.5, +0.2),
  new THREE.Vector2(+1.5, -0.2)
])

var coilFace = new THREE.Shape([
  new THREE.Vector2(-0.2, -0.2),
  new THREE.Vector2(-0.2, +0.2),
  new THREE.Vector2(+0.2, +0.2),
  new THREE.Vector2(+0.2, -0.2)
])

// Tube cross-sections

var fatCoilFace = new THREE.Shape([
  new THREE.Vector2(-0.25, -0.25),
  new THREE.Vector2(-0.25, +0.25),
  new THREE.Vector2(+0.25, +0.25),
  new THREE.Vector2(+0.25, -0.25)
])

function degToRad (deg) {
  return deg * Math.PI / 180.0
}

function getVerticesFromAtomDict (atoms, atomTypes) {
  var vertices = []

  for (var i = 0; i < atomTypes.length; i += 1) {
    var aType = atomTypes[i]
    vertices.push(v3.clone(atoms[aType].pos))
  }

  return vertices
}

function fraction (reference, target, t) {
  return t * (target - reference) + reference
}

function textEntryDialog (parentDiv, label, callback) {
  if (!label) {
    label = ''
  }

  window.keyboard_lock = true

  function cleanup () {
    dialog.remove()
    window.keyboard_lock = false
  }

  function accept () {
    callback(textarea.val())
    cleanup()
    window.keyboard_lock = false
  }

  function discard () {
    cleanup()
    window.keyboard_lock = false
  }

  var save_button = linkButton(
    'okay', 'okay', 'jolecule-small-button', accept)

  var discard_button = linkButton(
    'discard', 'discard', 'jolecule-small-button', discard)

  var textarea = $('<textarea>')
    .css('width', '100%')
    .addClass('jolecule-view-text')
    .keydown(
      function(e) {
        if (e.keyCode === 27) {
          discard()
          return true
        }
      })

  var editbox = $('<div>')
    .css('width', '100%')
    .append(label)
    .append(textarea)
    .append(save_button)
    .append(' ')
    .append(discard_button)

  var dialog = $('<div>')
    .addClass('jolecule-dialog')
    .css('display', 'block')
    .css('z-index', '2000')
    .css('width', Math.min(400, parentDiv.width() - 100))
    .append(editbox)

  stickJqueryDivInCenter(parentDiv, dialog, 0, 70)

  setTimeout(() => {
    editbox.find('textarea').focus()
  }, 100)
}

/**
 * Converts the older view datastructure to a target data
 * structure that can be easily converted into a THREE.js
 * camera
 *
 * - camera
 *     - pos: scene center, camera focus
 *     - up: gives the direction of the y vector from pos
 *     - in: gives the positive z-axis direction
 *     - scene is from 0 to positive z; since canvasjolecule draws +z into screen
 *     - as opengl +z is out of screen, need to flip z direction
 *     - in opengl, the box is -1 to 1 that gets projected on screen + perspective
 *     - by adding a i distance to move the camera further into -z
 *     - z_front and z_back define cutoffs
 * - opengl:
 *     - x right -> left
 *     - y bottom -> top (inverse of classic 2D coordinate)
 *     - z far -> near
 *     - that is positive Z direction is out of the screen
 *     - box -1to +1
 **/

function convertViewToTarget (view) {
  var cameraTarget = v3.clone(view.abs_camera.pos)

  var cameraDirection = v3.clone(view.abs_camera.in_v)
    .sub(cameraTarget)
    .multiplyScalar(view.abs_camera.zoom)
    .negate()

  var cameraPosition = cameraTarget.clone()
    .add(cameraDirection)

  var cameraUp = v3.clone(view.abs_camera.up_v)
    .sub(cameraTarget)
    .negate()

  return {
    cameraTarget: cameraTarget,
    cameraPosition: cameraPosition,
    cameraUp: cameraUp,
    zFront: view.abs_camera.z_front,
    zBack: view.abs_camera.z_back,
    zoom: view.abs_camera.zoom
  }
}

function convertTargetToView (target) {
  var view = new View()

  var cameraDirection = target.cameraPosition.clone()
    .sub(target.cameraTarget)
    .negate()

  view.abs_camera.zoom = cameraDirection.length()
  view.abs_camera.z_front = target.zFront
  view.abs_camera.z_back = target.zBack

  view.abs_camera.pos = v3.clone(target.cameraTarget)

  var up = target.cameraUp.clone().negate()

  view.abs_camera.up_v = v3.clone(
    target.cameraTarget.clone()
      .add(up))

  cameraDirection.normalize()
  view.abs_camera.in_v = v3.clone(
    target.cameraTarget.clone()
      .add(cameraDirection))

  return view
}

/**
 * PopupText
 **/

class PopupText {
  constructor (selector) {
    this.div = $('<div>')
      .css({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'background': 'white',
        'padding': '5',
        'opacity': 0.7,
        'display': 'none'
      })

    this.arrow = $('<div>')
      .css({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'width': 0,
        'height': 0,
        'border-left': '5px solid transparent',
        'border-right': '5px solid transparent',
        'border-top': '50px solid white',
        'opacity': 0.7,
        'display': 'none'
      })

    this.parentDiv = $(selector)
    this.parentDiv.append(this.div)
    this.parentDiv.append(this.arrow)
  }

  move (x, y) {
    var parentDivPos = this.parentDiv.position()
    var width = this.div.innerWidth()
    var height = this.div.innerHeight()

    if ((x < 0) || (x > this.parentDiv.width()) || (y < 0) ||
      (y > this.parentDiv.height())) {
      this.hide()
      return
    }

    this.div.css({
      'top': y - height - 50 + parentDivPos.top,
      'left': x - width / 2 + parentDivPos.left,
      'display': 'block',
      'font-family': 'sans-serif',
      'cursor': 'pointer'
    })

    this.arrow.css({
      'top': y - 50 + parentDivPos.top,
      'left': x - 5 + parentDivPos.left,
      'display': 'block'
    })
  }

  hide () {
    this.div.css('display', 'none')
    this.arrow.css('display', 'none')
  }

  html (text) {
    this.div.html(text)
  }

  remove () {
    this.div.remove()
    this.arrow.remove()
  }
}

/**
 * AtomLabel
 */

class AtomLabel {
  constructor (selector, controller, parentList) {
    this.popup = new PopupText(selector)
    this.controller = controller
    this.parentList = parentList
    this.popup.div.click(() => this.remove())
  }

  update (i, text, x, y, opacity) {
    this.i = i
    this.popup.html(text)
    this.popup.div.css('opacity', opacity)
    this.popup.arrow.css('opacity', opacity)
    this.popup.move(x, y)
  }

  remove () {
    this.popup.remove()
    this.controller.delete_label(this.i)
    this.parentList.splice(this.i, 1)
  }

  hide () {
    this.popup.div.css('display', 'none')
    this.popup.arrow.css('display', 'none')
  }
}

/**
 * DistanceMeasure
 */

class DistanceMeasure {
  constructor (selector, threeJsScene, controller, parentList) {
    this.displayScene = threeJsScene
    this.controller = controller
    this.parentList = parentList

    this.div = $('<div>')
      .css({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        // 'z-index': 100,
        'background-color': '#FFDDDD',
        'padding': '5',
        'opacity': 0.7,
        'font-family': 'sans-serif'
      })

    var geometry = new THREE.Geometry()
    geometry.vertices.push(new TV3(0, 0, 0))
    geometry.vertices.push(new TV3(1, 1, 1))

    var material = new THREE.LineDashedMaterial({
      color: 0xFF7777,
      dashSize: 3,
      gapSize: 4,
      linewidth: 2
    })

    this.line = new THREE.Line(geometry, material)

    this.displayScene.add(this.line)

    this.parentDiv = $(selector)
    this.parentDiv.append(this.div)

    this.div.click(() => this.remove())
  }

  update (i, text, x, y, p1, p2, opacity) {
    this.i = i

    if ((x < 0) || (x > this.parentDiv.width()) || (y < 0) ||
      (y > this.parentDiv.height())) {
      this.hide()
      return
    }

    var parentDivPos = this.parentDiv.position()

    this.div.text(text)

    var width = this.div.innerHeight()
    var height = this.div.innerWidth()

    this.div.css({
      'top': y - width / 2 + parentDivPos.top,
      'left': x - height / 2 + parentDivPos.left,
      'display': 'block',
      'cursor': 'pointer',
      'opacity': opacity
    })

    this.line.geometry.vertices[0].copy(p1)
    this.line.geometry.vertices[1].copy(p2)
  }

  remove () {
    this.displayScene.remove(this.line)
    this.div.remove()
    this.controller.delete_dist(this.i)
    this.parentList.splice(this.i, 1)
  }

  hide () {
    this.div.css('display', 'none')
  }
}

/**
 * LineElement
 * - instantiates a DOM object is to draw a line between (x1, y1) and
 *   (x2, y2) within a jquery div
 * - used to display the mouse tool for making distance labels
 */

class LineElement {
  constructor (selector, color) {
    this.color = color

    this.div = $('<canvas>')
      .css({
        'position': 'absolute',
        'z-index': '1000',
        'display': 'none',
        'pointer-events': 'none'
      })

    this.canvas = this.div[0]
    this.context2d = this.canvas.getContext('2d')

    this.parentDiv = $(selector)
    this.parentDiv.append(this.div)
  }

  hide () {
    this.div.css('display', 'none')
  }

  move (x1, y1, x2, y2) {
    var parentDivPos = this.parentDiv.position()

    var width = Math.abs(x1 - x2)
    var height = Math.abs(y1 - y2)

    var left = Math.min(x1, x2)
    var top = Math.min(y1, y2)

    this.div
      .css('display', 'block')
      .css('width', width)
      .css('height', height)
      .css('top', top + parentDivPos.top)
      .css('left', left + parentDivPos.left)

    this.canvas.width = width
    this.canvas.height = height

    this.context2d.clearRect(0, 0, width, height)
    this.context2d.beginPath()
    this.context2d.moveTo(x1 - left, y1 - top)
    this.context2d.lineTo(x2 - left, y2 - top)
    this.context2d.lineWidth = 2
    this.context2d.strokeStyle = this.color
    this.context2d.stroke()
  }
}

/**
 * CanvasWrapper
 *   - abstract class to wrap a canvas element
 *   - instantiates an absolute div that fits the $(selector)
 *   - attaches a canvas to this div
 *   - creates methods that redirects mouse commands to that canvas
 **/

class CanvasWrapper {
  constructor (selector) {
    this.parentDiv = $(selector)

    this.div = $('<div>')
      .css('position', 'absolute')
      .css('z-index', 100)

    this.parentDiv.append(this.div)

    this.canvas = $('<canvas>')

    this.div.append(this.canvas)
    this.canvasDom = this.canvas[0]
    this.drawContext = this.canvasDom.getContext('2d')

    this.mousePressed = false
    const dom = this.canvasDom
    const bind = (ev, fn) => {
      dom.addEventListener(ev, fn)
    }
    bind('mousedown', e => this.mousedown(e))
    bind('mousemove', e => this.mousemove(e))
    bind('mouseup', e => this.mouseup(e))
    bind('mouseout', e => this.mouseup(e))
    bind('touchstart', e => this.mousedown(e))
    bind('touchmove', e => this.mousemove(e))
    bind('touchend', e => this.mouseup(e))
    bind('touchcancel', e => this.mouseup(e))
  }

  width () {
    return this.parentDiv.width()
  }

  height () {
    return this.parentDiv.height()
  }

  x () {
    var parentDivPos = this.parentDiv.position()
    return parentDivPos.left
  }

  y () {
    var parentDivPos = this.parentDiv.position()
    return parentDivPos.top
  }

  inside (x, y) {
    return (
      (x >= this.x()) &&
      (x <= this.x() + this.width()) &&
      (y >= this.y()) &&
      (y <= this.y() + this.height()))
  }

  draw () {
  }

  resize () {
    this.canvasDom.width = this.width()
    this.canvasDom.height = this.height()
  }

  strokeRect (x, y, w, h, strokeStyle) {
    this.drawContext.strokeStyle = strokeStyle
    this.drawContext.strokeRect(x, y, w, h)
  }

  fillRect (x, y, w, h, fillStyle) {
    this.drawContext.fillStyle = fillStyle
    this.drawContext.fillRect(x, y, w, h)
  }

  line (x1, y1, x2, y2, lineWidth, color) {
    this.drawContext.moveTo(x1, y1)
    this.drawContext.lineTo(x2, y2)
    this.drawContext.lineWidth = lineWidth
    this.drawContext.strokeStyle = color
    this.drawContext.stroke()
  }

  text (text, x, y, font, color, align) {
    this.drawContext.fillStyle = color
    this.drawContext.font = font
    this.drawContext.textAlign = align
    this.drawContext.textBaseline = 'middle'
    this.drawContext.fillText(text, x, y)
  }

  textWidth (text, font) {
    this.drawContext.font = font
    this.drawContext.textAlign = 'center'
    return this.drawContext.measureText(text).width
  }

  mousedown (event) {
    event.preventDefault()

    this.mousePressed = true

    this.mousemove(event)
  }

  mousemove (event) {
  }

  mouseup (event) {
    event.preventDefault()

    this.mousePressed = false
  }

  getPointer (event) {
    var x, y
    if (event.touches) {
      x = event.touches[0].clientX
      y = event.touches[0].clientY
    } else {
      x = event.clientX
      y = event.clientY
    }

    this.pointerX = x +
      document.body.scrollLeft +
      document.documentElement.scrollLeft -
      this.x()

    this.pointerY = y +
      document.body.scrollTop +
      document.documentElement.scrollTop -
      this.y()
  }
}

var resToAa = {
  'ALA': 'A',
  'CYS': 'C',
  'ASP': 'D',
  'GLU': 'E',
  'PHE': 'F',
  'GLY': 'G',
  'HIS': 'H',
  'ILE': 'I',
  'LYS': 'K',
  'LEU': 'L',
  'MET': 'M',
  'ASN': 'N',
  'PRO': 'P',
  'GLN': 'Q',
  'ARG': 'R',
  'SER': 'S',
  'THR': 'T',
  'VAL': 'V',
  'TRP': 'W',
  'TYR': 'Y',
  'DA': 'A',
  'DT': 'T',
  'DG': 'G',
  'DC': 'C',
  'A': 'A',
  'T': 'T',
  'G': 'G',
  'C': 'C',
  'RA': 'A',
  'RU': 'U',
  'RC': 'C',
  'RG': 'G',
  'U': 'U'

}


/**
 * SequenceWidget
 *   - creates a dual band across the top of the selected div
 *     for glProteinDisplay
 *   - the first band is a sequence bar widget
 *   - the second band is a sequence text widget
 *   - these two are integrated so that they share state
 **/

class SequenceWidget extends CanvasWrapper {
  constructor (selector, scene, proteinDisplay) {
    super(selector)

    this.scene = scene
    this.protein = scene.protein

    this.proteinDisplay = proteinDisplay
    this.iRes = 0

    this.offsetY = 4
    this.heightBar = 16
    this.spacingY = 4
    this.backColor = '#CCC'
    this.selectColor = '#FFF'
    this.highlightColor = '#222'

    this.div.attr('id', 'sequence-widget')
    this.div.css({
      'width': this.parentDiv.width(),
      'height': this.height(),
      'top': this.y(),
      'background-color': '#CCC',
      'border-bottom': '1px solid #AAA'
    })

    this.charWidth = 14
    this.charHeight = 16

    this.textXOffset = 0

    this.residues = null
    this.iRes = null
    this.iStartChar = null
    this.iEndChar = null

    this.resize()
  }

  width () {
    return this.parentDiv.width()
  }

  height () {
    return this.offsetY + this.heightBar + this.spacingY * 6 + this.charHeight
  }

  resize () {
    super.resize()
    this.div.css('width', this.parentDiv.width())
  }

  xToI (x) {
    return parseInt((x - this.textXOffset) * this.nResidue / this.textWidth())
  }

  iToX (iRes) {
    return parseInt(iRes / this.nResidue * this.textWidth()) + this.textXOffset
  }

  textWidth () {
    return this.width() - this.textXOffset
  }

  xToIChar (x) {
    return parseInt((x - this.textXOffset) * this.nChar / this.textWidth()) + this.iStartChar
  }

  iCharToX (iRes) {
    return parseInt(
      (iRes - this.iStartChar) /
      this.nChar *
      this.textWidth() +
      this.textXOffset)
  }

  resetResidues () {
    let nRawResidue = this.scene.protein.residues.length

    this.residues = []
    for (let iRes = 0; iRes < nRawResidue; iRes += 1) {
      let residue = this.scene.protein.residues[iRes]
      if (_.includes(['-', 'W'], residue.ss)) {
        continue
      }

      let entry = {
        i: iRes,
        ss: residue.ss,
        resId: residue.id
      }

      let resType = residue.type
      if (resType in resToAa) {
        entry.c = resToAa[resType]
      } else {
        entry.c = '.'
      }

      this.residues.push(entry)
    }

    this.nResidue = this.residues.length

    this.iRes = this.nChar / 2
    this.iStartChar = 0
  }

  draw () {
    if (!exists(this.scene)) {
      return
    }

    if (this.residues.length === 0) {
      return
    }

    this.nChar = Math.ceil(this.width() / this.charWidth)

    this.iEndChar = this.iStartChar + this.nChar
    if (this.iEndChar > this.residues.length) {
      this.iEndChar = this.residues.length
    }
    if (this.iStartChar < 0) {
      this.iStartChar = 0
    }

    // draw background
    this.fillRect(
      0, 0, this.width(), this.height(), this.backColor)

    this.fillRect(
      this.textXOffset, 0, this.textWidth(), this.heightBar + this.spacingY * 2, this.backColor)

    this.fillRect(
      this.textXOffset, this.offsetY + this.heightBar + this.spacingY * 2,
      this.textWidth(), this.charHeight + this.spacingY * 2, this.selectColor)

    let x1 = this.iToX(this.iStartChar)
    let x2 = this.iToX(this.iEndChar)

    this.fillRect(
      x1, this.offsetY, x2 - x1, this.heightBar + this.spacingY * 2,
      1, this.selectColor)

    // draw secondary-structure color bars
    let ss = this.residues[0].ss
    let iStart = 0
    let iEnd = 0
    while (iEnd < this.nResidue) {
      iEnd += 1
      if (iEnd === this.nResidue || this.residues[iEnd].ss !== ss) {
        let x1 = this.iToX(iStart)
        let x2 = this.iToX(iEnd)
        let color = getSsColor(ss).getStyle()
        this.fillRect(
          x1,
          this.offsetY + this.spacingY,
          x2 - x1,
          this.heightBar,
          color)

        if (iEnd <= this.nResidue - 1) {
          iStart = iEnd
          ss = this.residues[iEnd].ss
        }
      }
    }

    // draw characters for sequence
    let y = this.offsetY + this.heightBar + this.spacingY * 3
    for (var iChar = this.iStartChar; iChar < this.iEndChar; iChar += 1) {
      let residue = this.residues[iChar]
      let x1 = this.iCharToX(iChar)
      let colorStyle = getSsColor(residue.ss).getStyle()
      this.fillRect(
        x1, y, this.charWidth, this.charHeight, colorStyle)
      var style = `color:black; background-color:${colorStyle}`
      this.text(
        residue.c,
        x1 + this.charWidth / 2, y + this.charHeight / 2,
        '8pt Monospace', 'black', 'center')
    }

    let currResId = this.scene.current_view.res_id
    for (var iRes = this.iStartChar; iRes < this.iEndChar; iRes++) {
      if (this.residues[iRes].resId === currResId) {
        this.strokeRect(
          this.iCharToX(iRes),
          this.offsetY + this.heightBar + this.spacingY * 2,
          this.charWidth,
          this.charHeight + this.spacingY * 2,
          this.highlightColor)
        break
      }
    }
  }

  getFullIRes () {
    return this.residues[this.iRes].i
  }

  mousemove (event) {
    if (!this.mousePressed) {
      return
    }
    this.getPointer(event)
    if (this.pointerY < (this.heightBar + this.spacingY * 2)) {
      this.iRes = this.xToI(this.pointerX)

      // reset sequence window
      this.iStartChar = Math.max(this.iRes - 0.5 * this.nChar, 0)
      this.iStartChar = Math.min(this.iStartChar, this.nResidue - this.nChar)
      this.iStartChar = parseInt(this.iStartChar)

      this.proteinDisplay.setTargetFromAtom(
        this.scene.protein.residues[this.getFullIRes()].central_atom)
    } else {
      this.iRes = this.xToIChar(this.pointerX)
      this.proteinDisplay.setTargetFromAtom(
        this.scene.protein.residues[this.getFullIRes()].central_atom)
    }
  }
}

/**
 * ZSlabWidget
 **/

class ZSlabWidget extends CanvasWrapper {
  constructor (selector, scene) {
    super(selector)
    this.scene = scene
    this.maxZLength = 0.0
    this.yOffset = 60
    this.div.attr('id', 'zslab')

    this.backColor = 'rgba(150, 150, 150, 0.75)'
    this.zBackColor = 'rgba(100, 70, 70, 0.75)'
    this.zFrontColor = 'rgba(150, 90, 90, 0.75)'
  }

  resize () {
    this.div.css({
      'width': this.width(),
      'height': this.height(),
      'top': this.y(),
      'left': this.x()
    })
    super.resize()
  }

  width () {
    return 40
  }

  y () {
    var parentDivPos = this.parentDiv.position()
    return parentDivPos.top + this.yOffset
  }

  height () {
    return this.parentDiv.height() - this.yOffset
  }

  x () {
    var parentDivPos = this.parentDiv.position()
    return this.parentDiv.width() - this.width() + parentDivPos.left
  }

  yToZ (y) {
    var fraction = y / this.height()
    return (0.5 - fraction) * this.maxZLength
  }

  zToY (z) {
    var fraction = z / this.maxZLength
    return (0.5 - fraction) * this.height()
  }

  draw () {
    var protein = this.scene.protein
    var camera = this.scene.current_view.abs_camera
    this.maxZLength = 2.0 * protein.max_length

    var yBack = this.zToY(camera.z_back)
    var yFront = this.zToY(camera.z_front)
    var yMid = this.zToY(0)

    this.fillRect(
      0, 0, this.width(), this.height(), this.backColor)

    this.fillRect(
      0, yBack, this.width(), yMid - yBack, this.zBackColor)

    this.fillRect(
      0, yMid, this.width(), yFront - yMid, this.zFrontColor)

    var font = '12px sans-serif'
    var xm = this.width() / 2

    this.text(
      'zslab', xm, 10, font, this.zFrontColor, 'center')
    this.text(
      'back', xm, yBack - 7, font, this.zBackColor, 'center')
    this.text(
      'front', xm, yFront + 7, font, this.zFrontColor, 'center')
  }

  getZ (event) {
    this.getPointer(event)

    this.z = this.yToZ(this.pointerY)
  }

  mousedown (event) {
    this.getZ(event)

    if (this.z > 0) {
      this.back = true
      this.front = false
    } else {
      this.front = true
      this.back = false
    }

    super.mousedown(event)
  }

  mousemove (event) {
    event.preventDefault()

    if (!this.mousePressed) {
      return
    }

    this.getZ(event)

    var abs_camera = this.scene.current_view.abs_camera

    if (this.back) {
      abs_camera.z_back = Math.max(2, this.z)
    } else if (this.front) {
      abs_camera.z_front = Math.min(-2, this.z)
    }

    this.scene.changed = true
  }
}

/**
 * GridControlWidget
 **/

class GridControlWidget extends CanvasWrapper {
  constructor (selector, scene) {
    super(selector)
    this.scene = scene
    this.maxB = 2
    this.minB = 0.4
    this.diffB = this.maxB - this.minB
    this.scene.grid = 0.8
    this.scene.gridChanged = true
    this.scene.grid_atoms = {}
    this.buttonHeight = 40
    this.sliderHeight = this.buttonHeight * 6 - 50
    this.div.attr('id', 'gridControlWidget')
    this.div.css('height', this.height())
    this.backgroundColor = '#AAA'
    this.buttonsDiv = $('<div>')
    this.div.append(this.buttonsDiv)
    this.reset()
  }

  reset () {
    this.buttonsDiv.empty()
    var y = 10
    for (var elem in this.scene.grid_atoms) {
      this.buttonsDiv.append(this.makeElemButton(elem, y))
      y += this.buttonHeight
    }
    if (_.keys(this.scene.grid_atoms).length === 0) {
      this.div.hide()
    } else {
      this.div.show()
    }
  }

  makeElemButton (elem, y) {
    console.log('> make grid atoms', elem, this.scene.grid_atoms[elem])
    var color = new THREE.Color(ElementColors[elem])
    var colorHexStr = color.getHexString()
    var text_button = toggleButton(
      'toggle_text',
      elem,
      'jolecule-button',
      () => this.scene.grid_atoms[elem],
      (b) => {
        this.scene.grid_atoms[elem] = b
        this.scene.changed = true
      },
      colorHexStr)
    text_button.css('position', 'absolute')
    text_button.css('top', y + 'px')
    text_button.css('left', '40px')
    text_button.css('width', '20px')
    return text_button
  }

  resize () {
    let parentDivPos = this.parentDiv.position()
    this.div.css({
      'width': this.width(),
      'height': this.height(),
      'top': this.y(),
      'left': this.x()
    })
    this.canvasDom.width = this.width()
    this.canvasDom.height = this.height()
  }

  width () {
    return 84
  }

  height () {
    return this.buttonHeight * 6 + 10
  }

  x () {
    let parentDivPos = this.parentDiv.position()
    return parentDivPos.left
  }

  y () {
    let parentDivPos = this.parentDiv.position()
    return parentDivPos.top + 60
  }

  yToZ (y) {
    let fraction = (y - 20) / this.sliderHeight
    let z = fraction * this.diffB + this.minB
    if (z < this.minB) {
      z = this.minB
    }
    if (z > this.maxB) {
      z = this.maxB
    }
    return z
  }

  zToY (z) {
    return (z - this.minB) / this.diffB * this.sliderHeight + 20
  }

  draw () {
    let protein = this.scene.protein
    let camera = this.scene.current_view.abs_camera

    this.fillRect(0, 0, this.width(), this.height(), this.backgroundColor)

    let xm = 20

    let dark = 'rgb(100, 100, 100)'
    let yTop = this.zToY(this.minB)
    let yBottom = this.zToY(this.maxB)
    this.line(xm, yTop, xm, yBottom, 1, dark)
    this.line(5, yTop, 35, yTop, 1, dark)

    let font = '12px sans-serif'
    let textColor = '#666'
    let y = this.zToY(this.scene.grid)
    this.fillRect(5, y, 30, 5, textColor)
    this.text(-this.scene.grid.toFixed(2), xm, y + 15, font, textColor, 'center')
  }

  getZ (event) {
    this.getPointer(event)

    this.z = this.yToZ(this.pointerY)
  }

  mousedown (event) {
    event.preventDefault()

    this.getZ(event)

    this.mousePressed = true

    this.mousemove(event)
  }

  mousemove (event) {
    event.preventDefault()

    if (!this.mousePressed) {
      return
    }

    this.getZ(event)

    this.scene.grid = this.z
    this.scene.gridChanged = true
    this.draw()

    this.scene.changed = true
  }

  mouseup (event) {
    event.preventDefault()

    this.mousePressed = false
  }
}

function cylinderMatrix (from, to, radius) {
  var midpoint = from.clone()
    .add(to)
    .multiplyScalar(0.5)

  var obj = new THREE.Object3D()
  obj.scale.set(radius, radius, from.distanceTo(to))
  obj.position.copy(midpoint)
  obj.lookAt(to)
  obj.updateMatrix()
  return obj.matrix
}


class Trace extends PathAndFrenetFrames {

  constructor () {
    super()
    this.indices = []
    this.referenceObjects = []
    this.detail = 4
  }

  getReferenceObject (i) {
    let iRef = this.indices[i]
    return this.referenceObjects[iRef]
  }

  /**
   * Calculates tangents as an average on neighbouring points
   * so that we get a smooth path
   *
   * @param {*} iStart
   * @param {*} iEnd
   */
  calcContinuousTangents (iStart, iEnd) {
    let trace = this
    var points = trace.points

    var iLast = iEnd - 1

    var i

    if ((iEnd - iStart) > 2) {
      // project out first tangent from main chain
      trace.tangents[iStart] = points[iStart + 1].clone()
        .sub(points[iStart])
        .normalize()

      // calculate tangents as averages of neighbouring residues
      for (i = iStart + 1; i < iLast; i += 1) {
        trace.tangents[i] = points[i + 1].clone()
          .sub(points[i - 1])
          .normalize()
      }

      // project out last tangent from main chain
      trace.tangents[iLast] = points[iLast].clone()
        .sub(points[iLast - 1])
        .normalize()

      // generate normals 
      for (i = iStart + 1; i < iLast; i += 1) {

        // check if reference object provides a normal
        let refNormal = this.getReferenceObject(i).normal
        if (refNormal !== null) {
          trace.normals[i] = perpVector(
            trace.tangents[i],
            v3.clone(refNormal)
          )
            .normalize()
        } else {
          var diff = points[i].clone()
            .sub(points[i - 1])
          trace.normals[i] = new TV3()
            .crossVectors(
              diff, trace.tangents[i])
            .normalize()
        }
      }

      trace.normals[iStart] = trace.normals[iStart + 1]
      trace.normals[iLast] = trace.normals[iLast - 1]

    } else {
      // for short 2 point traces, tangents are a bit harder to do
      var tangent = points[iLast].clone()
        .sub(points[iStart])
        .normalize()

      trace.tangents[iStart] = tangent
      trace.tangents[iLast] = tangent

      for (i = iStart; i <= iLast; i += 1) {
        let refNormal = this.getReferenceObject(i).normal
        if (refNormal !== null) {
          trace.normals[i] = perpVector(
            trace.tangents[i],
            v3.clone(refNormal)
          )
            .normalize()
        } else {
          var randomDir = points[i]
          trace.normals[i] = new TV3()
            .crossVectors(randomDir, tangent)
            .normalize()
        }
      }
    }

    // flip normals so that they are all pointing in same direction
    // this is from beta-sheets so should do at the next level up
    for (i = iStart + 1; i < iEnd; i += 1) {
      if (this.getReferenceObject(i).ss !== 'D'
        && this.getReferenceObject(i - 1).ss !== 'D') {
        if (trace.normals[i].dot(trace.normals[i - 1]) < 0) {
          trace.normals[i].negate()
        }
      }
    }

    // calculate binormals from tangents and normals
    for (i = iStart; i < iEnd; i += 1) {
      trace.binormals[i] = new TV3()
        .crossVectors(trace.tangents[i], trace.normals[i])
    }
  }

  expand () {
    this.calcContinuousTangents(0, this.points.length)
    this.detailedPath = expandPath(this, 2 * this.detail)
  }

  /**
   * A path is generated with 2*detail.
   *
   * If a residue is not at the end of a piece,
   * will be extended to detail beyond that is
   * half-way between the residue and the neighboring
   * residue in a different piece.
   **/
  getSegmentGeometry (iRes, face, isRound, isFront, isBack, color) {
    let path = this.detailedPath

    // works out start on expanded path, including overhang
    let iPathStart = (iRes * 2 * this.detail) - this.detail
    if (iPathStart < 0) {
      iPathStart = 0
    }

    // works out end of expanded path, including overhang
    let iPathEnd = ((iRes + 1) * 2 * this.detail) - this.detail + 1
    if (iPathEnd >= path.points.length) {
      iPathEnd = path.points.length - 1
    }

    let segmentPath = path.slice(iPathStart, iPathEnd)
    let geom = new RibbonGeometry(
      face, segmentPath, isRound, isFront, isBack)

    setGeometryVerticesColor(geom, color)

    return geom
  }
}

/**
 *
 * ProteinDisplay: The main window for drawing the protein
 * in a WebGL HTML5 canvas, with a Z-Slabe and Sequence Display
 */
class ProteinDisplay {

  /**
   * ProteinDisplay Constructor
   *
   * @param scene - Scene object that holds a protein and views
   * @param divTag - a tag for a DOM element
   * @param controller - the controller for the scene
   * @param isGrid - flat to show autodock 3D grid
   * @param backgroundColor - the background color of the canvas
   *                          and protein
   */
  constructor (scene, divTag, controller, isGrid, backgroundColor) {
    this.divTag = divTag
    this.scene = scene
    this.protein = scene.protein
    this.controller = controller
    this.isGrid = isGrid

    this.controller.set_target_view_by_res_id = (resId) => {
      this.setTargetFromResId(resId)
    }
    this.controller.calculate_current_abs_camera = function() {
    }

    this.saveMouseX = null
    this.saveMouseY = null
    this.saveMouseR = null
    this.saveMouseT = null
    this.mouseX = null
    this.mouseY = null
    this.mouseR = null
    this.mouseT = null
    this.mousePressed = false

    this.labels = []
    this.distanceLabels = []

    // relative to the scene position from camera
    this.zFront = -40
    this.zBack = 20

    // determines how far away the camera is from the scene
    this.zoom = 50.0

    this.mainDiv = $(this.divTag)
    this.mainDiv.css('overflow', 'hidden')

    this.hover = new PopupText(this.divTag, 'lightblue')
    this.hover.div.css('pointer-events', 'none')
    this.hover.arrow.css('pointer-events', 'none')

    this.zSlabWidget = new ZSlabWidget(this.divTag, this.scene)
    if (this.isGrid) {
      this.gridControlWidget = new GridControlWidget(this.divTag, this.scene)
    }

    this.messageDiv = $('<div>')
      .attr('id', 'loading-message')
      .addClass('jolecule-loading-message')

    this.setProcessingMesssage('Loading data for proteins')

    this.nDataServer = 0

    this.unitSphereGeom = new THREE.SphereGeometry(1, 8, 8)

    this.backgroundColor = backgroundColor

    this.webglDivId = this.mainDiv.attr('id') + '-canvas-wrapper'
    this.webglDivTag = '#' + this.webglDivId
    this.webglDiv = $('<div>')
      .attr('id', this.webglDivId)
      .css('overflow', 'hidden')
      .css('background-color', '#CCC')

    this.mainDiv.append(this.webglDiv)
    this.mainDiv.css('background-color', '#CCC')

    this.cameraTarget = new THREE.Vector3(0, 0, 0)
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.width() / this.height(),
      this.zFront + this.zoom,
      this.zBack + this.zoom)

    this.sequenceWidget = new SequenceWidget(
      this.divTag, this.scene, this)

    this.displayMeshes = {}
    this.displayScene = new THREE.Scene()
    this.displayScene.background = new THREE.Color(this.backgroundColor)
    this.displayScene.fog = new THREE.Fog(this.backgroundColor, 1, 100)
    this.displayScene.fog.near = this.zoom + 1
    this.displayScene.fog.far = this.zoom + this.zBack
    this.displayMaterial = new THREE.MeshLambertMaterial({
      vertexColors: THREE.VertexColors
    })

    this.radius = 0.35 // small atom radius
    this.obj = new THREE.Object3D() // utility object

    this.pickingMeshes = {}
    this.pickingScene = new THREE.Scene()
    this.pickingTexture = new THREE.WebGLRenderTarget(this.width(), this.height())
    this.pickingTexture.texture.minFilter = THREE.LinearFilter
    this.pickingMaterial = new THREE.MeshBasicMaterial(
      {vertexColors: THREE.VertexColors})

    this.lights = []
    this.buildLights()

    this.buildCrossHairs()

    this.distancePartnerPointer = new LineElement(this.webglDivTag, '#FF7777')
  }

  initWebglRenderer () {
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setClearColor(this.backgroundColor)
    this.renderer.setSize(this.width(), this.height())
    let dom = this.renderer.domElement
    this.webglDiv[0].appendChild(dom)
    const bind = (w, fn) => {
      dom.addEventListener(w, fn)
    }
    bind('mousedown', e => this.mousedown(e))
    bind('mousemove', e => this.mousemove(e))
    bind('mouseup', e => this.mouseup(e))
    bind('mousewheel', e => this.mousewheel(e))
    bind('DOMMouseScroll', e => this.mousewheel(e))
    bind('touchstart', e => this.mousedown(e))
    bind('touchmove', e => this.mousemove(e))
    bind('touchend', e => this.mouseup(e))
    bind('touchcancel', e => this.mouseup(e))
    bind('gesturestart', e => this.gesturestart(e))
    bind('gesturechange', e => this.gesturechange(e))
    bind('gestureend', e => this.gestureend(e))
  }

  setProcessingMesssage (message) {
    console.log('> ProteinDisplay.setProcessingMessage:', message)
    this.messageDiv.html(message).show()
    stickJqueryDivInTopLeft(this.mainDiv, this.messageDiv, 100, 90)
  };

  cleanupProcessingMessage () {
    this.resize()
    this.messageDiv.hide()
  };

  /**
   * Allow the DOM to show a message before a compute-intensive function
   *
   * @param message
   * @param computeHeavyFn
   */
  displayProcessMessageAndRun (message, computeHeavyFn) {
    this.setProcessingMesssage(message)
    // this pause allows the DOM to update before compute
    setTimeout(computeHeavyFn, 0)
  }

  buildAfterDataLoad (defaultHtml) {

    for (let res of this.protein.residues) {
      res.color = getSsColor(res.ss)
    }

    this.buildScene()

    this.sequenceWidget.resetResidues()

    // this is some mangling to link openGL
    // with the coordinate system that I had
    // chosen unwittingly when I first designed
    // the raster jolecule library

    var current_view = this.scene.current_view
    current_view.res_id = this.protein.residues[0].id

    current_view.abs_camera.z_front = -this.protein.max_length /
      2
    current_view.abs_camera.z_back = this.protein.max_length /
      2
    current_view.abs_camera.zoom = Math.abs(this.protein.max_length)
    current_view.camera.z_front = -this.protein.max_length / 2
    current_view.camera.z_back = this.protein.max_length / 2
    current_view.camera.zoom = Math.abs(this.protein.max_length)

    current_view.show.sidechain = false

    current_view.camera.up_v = v3.create(0, -1, 0)
    current_view.abs_camera.up_v = v3.create(0, -1, 0)

    var atom = this.protein.get_central_atom()
    current_view.res_id = atom.res_id
    var residue = this.protein.res_by_id[current_view.res_id]
    current_view.i_atom = residue.central_atom.i
    var center = residue.central_atom.pos

    current_view.abs_camera.transform(
      v3.translation(center))

    var neg_center = v3.scaled(center, -1)
    this.scene.origin.camera.transform(
      v3.translation(neg_center))

    var default_view = current_view.clone()
    default_view.order = 0
    default_view.text = this.protein.default_html
    default_view.pdb_id = this.protein.pdb_id

    this.scene.save_view(default_view)

    this.cameraTarget.copy(center)
    this.camera.position
      .set(0, 0, this.zoom)
      .add(this.cameraTarget)
    this.camera.lookAt(this.cameraTarget)

    this.displayScene.fog.near = this.zoom + 1
    this.displayScene.fog.far = this.zoom + this.zBack

    this.scene.is_new_view_chosen = true
    this.scene.changed = true
  }

  buildAfterAddProteinData () {
    clearObject3D(this.displayScene)
    this.buildScene()
    this.sequenceWidget.resetResidues()
    this.scene.changed = true
    this.gridControlWidget.reset()
  }

  isPeptideConnected (i0, i1) {
    var res0 = this.protein.residues[i0]
    var res1 = this.protein.residues[i1]

    if (('C' in res0.atoms) &&
      ('N' in res1.atoms) &&
      ('CA' in res0.atoms) &&
      ('CA' in res1.atoms)) {
      // detect a potential peptide bond

      var c = res0.atoms['C']
      var n = res1.atoms['N']
      if (v3.distance(c.pos, n.pos) < 2) {
        return true
      }
    }

    return false
  }

  isSugarPhosphateConnected (i0, i1) {
    var res0 = this.protein.residues[i0]
    var res1 = this.protein.residues[i1]

    if (('C3\'' in res0.atoms) &&
      ('C1\'' in res0.atoms) &&
      ('C5\'' in res0.atoms) &&
      ('O3\'' in res0.atoms) &&
      ('P' in res1.atoms) &&
      ('C3\'' in res1.atoms) &&
      ('C1\'' in res1.atoms) &&
      ('C5\'' in res1.atoms)) {
      // detect nucloetide phosphate sugar bond
      var o3 = res0.atoms['O3\'']
      var p = res1.atoms['P']
      if (v3.distance(o3.pos, p.pos) < 2.5) {
        return true
      }
    }

    return false
  }

  getNormalOfNuc (res) {
    var atoms = res.atoms
    var forward = v3.diff(atoms['C3\''].pos, atoms['C5\''].pos)
    var up = v3.diff(atoms['C1\''].pos, atoms['C3\''].pos)
    return v3.crossProduct(forward, up)
  }

  findContinuousTraces () {
    this.traces = []

    let residues = this.protein.residues
    let makeNewTrace = () => {
      this.trace = new Trace()
      this.trace.referenceObjects = residues
      this.traces.push(this.trace)
    }

    let nResidue = residues.length
    for (let iResidue = 0; iResidue < nResidue; iResidue += 1) {

      let residue = residues[iResidue]
      var isResInTrace = false

      if (residue.is_protein_or_nuc) {
        isResInTrace = true
      } else {
        // Handles non-standard amino-acids and nucleotides that are
        // covalently bonded with the correct atom types to 
        // neighbouring residues
        if (iResidue > 0) {
          if (this.isPeptideConnected(iResidue - 1, iResidue)) {
            residue.central_atom = residue.atoms['CA']
            isResInTrace = true
          } else if (this.isSugarPhosphateConnected(iResidue - 1, iResidue)) {
            residue.central_atom = residue.atoms['C3\'']
            isResInTrace = true
            residue.ss = 'R'
            residue.normal = this.getNormalOfNuc(residue)
          }
        }

        if (iResidue < nResidue - 1) {
          if (this.isPeptideConnected(iResidue, iResidue + 1)) {
            residue.central_atom = residue.atoms['CA']
            isResInTrace = true
          } else if (this.isSugarPhosphateConnected(iResidue, iResidue + 1)) {
            residue.central_atom = residue.atoms['C3\'']
            isResInTrace = true
            residue.ss = 'R'
            residue.normal = this.getNormalOfNuc(residue)
          }
        }
      }

      if (isResInTrace) {
        if (iResidue === 0) {
          makeNewTrace()
        } else {
          let iLastResidue = iResidue - 1
          let peptideConnect = this.isPeptideConnected(iLastResidue, iResidue)
          let nucleotideConnect = this.isSugarPhosphateConnected(iLastResidue, iResidue)
          if (!peptideConnect && !nucleotideConnect) {
            makeNewTrace()
          }
        }
        this.trace.indices.push(iResidue)
        this.trace.points.push(v3.clone(residue.central_atom.pos))
      }
    }

    for (let trace of this.traces) {
      trace.expand()
    }
  }

  getAtomColor (atom) {
    if (atom.elem === 'C' || atom.elem === 'H') {
      var res = this.protein.res_by_id[atom.res_id]
      return getResColor(res)
    } else if (atom.elem in ElementColors) {
      return ElementColors[atom.elem]
    }
    return darkGrey
  }

  getSsFace (ss) {
    if (ss === 'C' || ss === '-') {
      return coilFace
    }
    return ribbonFace
  }

  mergeUnitGeom (totalGeom, unitGeom, color, matrix) {
    setGeometryVerticesColor(unitGeom, color)
    totalGeom.merge(unitGeom, matrix)
  }

  getSphereMatrix (pos, radius) {
    this.obj.matrix.identity()
    this.obj.position.copy(pos)
    this.obj.scale.set(radius, radius, radius)
    this.obj.updateMatrix()
    return this.obj.matrix
  }

  getAtomIndexColor (atom) {
    return new THREE.Color().setHex(atom.i)
  }

  getSphereMatrix (pos, radius) {
    this.obj.matrix.identity()
    this.obj.position.copy(pos)
    this.obj.scale.set(radius, radius, radius)
    this.obj.updateMatrix()
    return this.obj.matrix
  }

  assignBondsToResidues () {
    for (let j = 0; j < this.protein.residues.length; j += 1) {
      var res = this.protein.residues[j]
      res.bonds = []
    }

    for (let j = 0; j < this.protein.bonds.length; j += 1) {
      var bond = this.protein.bonds[j]
      var atom1 = bond.atom1
      var atom2 = bond.atom2

      if (atom1.is_alt || atom2.is_alt) {
        continue
      }

      var res1 = this.protein.res_by_id[atom1.res_id]
      var res2 = this.protein.res_by_id[atom2.res_id]

      res1.bonds.push(bond)

      if (res1 !== res2) {
        res2.bonds.push(bond)
      }
    }
  }

  buildLights () {
    var directionalLight =
      new THREE.DirectionalLight(0xFFFFFF)
    directionalLight.position.copy(
      new TV3(0.2, 0.2, 100)
        .normalize())
    directionalLight.dontDelete = true
    // directionalLight.intensity = 1.2;
    this.lights.push(directionalLight)

    var directionalLight2 =
      new THREE.DirectionalLight(0xFFFFFF)
    directionalLight2.position.copy(
      new TV3(0.2, 0.2, -100)
        .normalize())
    directionalLight2.dontDelete = true
    // directionalLight2.intensity = 1.2;
    this.lights.push(directionalLight2)

    var ambientLight = new THREE.AmbientLight(0x202020)
    ambientLight.dontDelete = true
    this.lights.push(ambientLight)

    for (var i = 0; i < this.lights.length; i += 1) {
      this.displayScene.add(this.lights[i])
    }
  }

  /**
   * Routines to build meshes that will be incorporated into
   * scenes, and to be used for gpu-picking.
   *
   * Meshes are stored in a dictionary: this.displayMeshes &
   * this.pickingMeshes
   *
   */

  isChanged () {
    return this.scene.changed
  }

  drawDistanceLabels () {
    var distances = this.scene.current_view.distances
    var distanceLabels = this.distanceLabels
    var atoms = this.protein.atoms

    for (var i = 0; i < distances.length; i += 1) {
      var distance = distances[i]

      var p1 = v3.clone(atoms[distance.i_atom1].pos)
      var p2 = v3.clone(atoms[distance.i_atom2].pos)
      var m = p1.clone()
        .add(p2)
        .multiplyScalar(0.5)
      var opacity = 0.7 * this.opacity(m) + 0.3

      var v = this.posXY(m)
      var text = p1.distanceTo(p2)
        .toFixed(1)

      if (i >= distanceLabels.length) {
        this.distanceLabels.push(
          new DistanceMeasure(
            this.webglDivTag, this.displayScene,
            this.controller, this.distanceLabels))
      }

      distanceLabels[i].update(
        i, text, v.x, v.y, p1, p2, opacity)

      if (!this.inZlab(m)) {
        distanceLabels[i].hide()
      }
    }

    for (var i = distanceLabels.length - 1; i >= 0; i -= 1) {
      if (i >= distances.length) {
        distanceLabels[i].remove()
      }
    }
  }

  drawAtomLabels () {
    var labels = this.scene.current_view.labels
    var atomLabels = this.labels

    for (let i = atomLabels.length; i < labels.length; i += 1) {
      var atomLabel = new AtomLabel(
        this.webglDivTag, this.controller, atomLabels)
      atomLabels.push(atomLabel)
    }

    for (let i = atomLabels.length - 1; i >= 0; i -= 1) {
      if (i >= labels.length) {
        atomLabels[i].remove()
      }
    }

    var atoms = this.protein.atoms

    for (let i = 0; i < labels.length; i += 1) {
      var atom = atoms[labels[i].i_atom]
      var pos = v3.clone(atom.pos)
      var v = this.posXY(pos)
      var opacity = 0.7 * this.opacity(pos) + 0.2

      atomLabels[i].update(
        i, labels[i].text, v.x, v.y, opacity)

      if (!this.inZlab(pos)) {
        atomLabels[i].hide()
      }
    }
  }

  draw () {
    if (_.isUndefined(this.displayMeshes)) {
      return
    }
    if (!this.isChanged()) {
      return
    }

    this.resize()

    this.setCameraFromCurrentView()

    this.selectVisibleMeshes()

    this.drawAtomLabels()
    this.drawDistanceLabels()

    this.moveCrossHairs()

    // leave this to the very last moment
    // to avoid the dreaded black canvas
    if (!exists(this.renderer)) {
      this.initWebglRenderer()
    }
    this.renderer.render(this.displayScene, this.camera)

    this.drawAtomLabels()
    this.drawDistanceLabels()

    this.zSlabWidget.draw()
    if (this.isGrid) {
      this.gridControlWidget.draw()
    }

    this.sequenceWidget.draw()

    this.scene.changed = false
  }

  animate () {
    if (this.scene.target_view === null) {
      return
    }

    this.scene.n_update_step -= 1

    var nStep = this.scene.n_update_step

    if (nStep <= 0) {
      return
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
      .sub(old.cameraTarget)
    var oldZoom = oldCameraDirection.length()
    oldCameraDirection.normalize()

    var target = convertViewToTarget(this.scene.target_view)
    var targetCameraDirection =
      target.cameraPosition.clone()
        .sub(target.cameraTarget)
    var targetZoom = targetCameraDirection.length()
    targetCameraDirection.normalize()

    var targetCameraDirRotation = getUnitVectorRotation(
      oldCameraDirection, targetCameraDirection)

    var rotatedCameraUp = old.cameraUp.clone()
      .applyQuaternion(targetCameraDirRotation)

    var newCameraRotation = getUnitVectorRotation(
      rotatedCameraUp, target.cameraUp)
    newCameraRotation.multiply(
      targetCameraDirRotation)
    newCameraRotation = getFractionRotation(
      newCameraRotation, t)

    var current = {}
    var disp
    disp = target.cameraTarget.clone()
      .sub(old.cameraTarget)
      .multiplyScalar(t)
    current.cameraTarget = old.cameraTarget.clone()
      .add(disp)
    var zoom = fraction(oldZoom, targetZoom, t)
    disp = oldCameraDirection.clone()
      .applyQuaternion(newCameraRotation)
      .multiplyScalar(zoom)
    current.cameraPosition = current.cameraTarget.clone()
      .add(disp)
    current.cameraUp = old.cameraUp.clone()
      .applyQuaternion(newCameraRotation)
    current.zFront = fraction(old.zFront, target.zFront, t)
    current.zBack = fraction(old.zBack, target.zBack, t)

    var view = convertTargetToView(current)
    view.copy_metadata_from_view(this.scene.target_view)
    this.controller.set_current_view(view)

    this.updateHover()
  }

  buildScene () {
    // calculate protein parameters
    this.assignBondsToResidues()
    this.findContinuousTraces()
    this.findGridLimits()

    // create default Meshes
    this.buildMeshOfRibbons()
    this.buildMeshOfGrid()
    // this.buildMeshOfNucleotides()
    this.buildMeshOfArrows()
    this.rebuildSceneWithMeshes()
  }

  /**
   * Creates a mesh entry in mesh collection, so that a scene
   * can be generated
   *
   * @param meshName - the handle for this mesh in the centralized
   *   repository
   */
  clearMesh (meshName) {
    if (!(meshName in this.displayMeshes)) {
      this.displayMeshes[meshName] = new THREE.Object3D()
    } else {
      clearObject3D(this.displayMeshes[meshName])
    }
    if (!(meshName in this.pickingMeshes)) {
      this.pickingMeshes[meshName] = new THREE.Object3D()
    } else {
      clearObject3D(this.pickingMeshes[meshName])
    }
  }

  /**
   * Rebuild scene from meshes in this.displayMeshes &
   * this.pickingMeshes
   */
  rebuildSceneWithMeshes () {
    clearObject3D(this.displayScene)
    clearObject3D(this.pickingScene)
    for (let [k, v] of _.toPairs(this.displayMeshes)) {
      if (v.children.length > 0) {
        this.displayScene.add(this.displayMeshes[k])
      }
    }
    for (let [k, v] of _.toPairs(this.pickingMeshes)) {
      if (v.children.length > 0) {
        this.pickingScene.add(v)
      }
    }
    for (let trace of this.traces) {
      for (let residue of trace.referenceObjects) {
        if (residue.sidechainMeshes) {
          this.displayScene.add(residue.sidechainMeshes)
        }
        if (residue.sidechainPickingMeshes) {
          this.pickingScene.add(residue.sidechainPickingMeshes)
        }
      }
    }
  }

  /**
   * Sets the visibility of a mesh this.displayMeshes & this.pickingMeshes.
   * If it does not exist, create it, and look for the corresponding method
   * to build the mesh this.build<CaptializaedMeshName>
   *
   * @param meshName
   * @param visible
   */
  setMeshVisible (meshName, visible) {
    if (visible) {
      if (!(meshName in this.displayMeshes)) {
        let buildMeshOfFunctionName = 'buildMeshOf' + _.capitalize(meshName)
        console.log('> ProteinDisplay.' + buildMeshOfFunctionName)
        this[buildMeshOfFunctionName]()
        this.updateMeshesInScene = true
      }
    }
    if (meshName in this.displayMeshes) {
      setVisible(this.displayMeshes[meshName], visible)
    }
  }

  selectVisibleMeshes () {

    var show = this.scene.current_view.show
    this.updateMeshesInScene = false

    this.setMeshVisible('tube', show.trace)
    this.setMeshVisible('water', show.water)
    this.setMeshVisible('ribbons', show.ribbon)
    this.setMeshVisible('arrows', !show.all_atom)
    this.setMeshVisible('backbone', show.all_atom)
    this.setMeshVisible('ligands', show.ligands)

    if (exists(this.displayMeshes.grid)) {
      for (let mesh of [this.displayMeshes.grid, this.pickingMeshes.grid]) {
        mesh.traverse(child => {
          if (exists(child.i)) {
            child.visible = this.isVisibleGridAtom(child.i)
          }
        })
      }
    }

    for (let trace of this.traces) {
      for (let i of _.range(trace.indices.length)) {
        let residue = trace.getReferenceObject(i)
        let residueShow = show.sidechain || residue.selected
        if (residueShow && !exists(residue.mesh)) {
          this.buildMeshOfSidechain(residue)
          this.updateMeshesInScene = true
          residue.mesh = true
        }
      }
    }

    for (let trace of this.traces) {
      for (let i of _.range(trace.indices.length)) {
        let residue = trace.getReferenceObject(i)
        let residueShow = show.sidechain || residue.selected
        setVisible(residue.sidechainMeshes, residueShow)
      }
    }

    if (this.updateMeshesInScene) {
      this.rebuildSceneWithMeshes()
    }
  }

  /**
   ***************************************
   * Mesh-building methods
   ***************************************
   */

  mergeAtomToGeom (geom, pickGeom, atom) {
    let matrix = this.getSphereMatrix(atom.pos, this.radius)
    let unitGeom = this.unitSphereGeom
    this.mergeUnitGeom(geom, unitGeom, this.getAtomColor(atom), matrix)
    this.mergeUnitGeom(pickGeom, unitGeom, this.getAtomIndexColor(atom), matrix)
  }

  mergeBondToGeom (totalGeom, bond, residue) {

    var p1 = v3.clone(bond.atom1.pos)
    var p2 = v3.clone(bond.atom2.pos)

    var res1 = this.protein.res_by_id[bond.atom1.res_id]
    var res2 = this.protein.res_by_id[bond.atom2.res_id]

    var color1 = getResColor(res1)
    var color2 = getResColor(res2)

    var geom = new UnitCylinderGeometry()

    var radius = 0.2

    if (color1 === color2) {

      this.mergeUnitGeom(
        totalGeom, geom, color1, cylinderMatrix(p1, p2, radius))

    } else {

      var midpoint = p2.clone().add(p1).multiplyScalar(0.5)

      if (bond.atom1.res_id === residue.id) {

        this.mergeUnitGeom(
          totalGeom, geom, color1, cylinderMatrix(p1, midpoint, radius))

      } else if (bond.atom2.res_id === residue.id) {

        this.mergeUnitGeom(
          totalGeom, geom, color2, cylinderMatrix(p2, midpoint, radius))

      }

    }
  }

  addGeomToDisplayMesh (meshName, geom) {
    if (geom.vertices == 0) {
      return
    }
    this.displayMeshes[meshName].add(
      new THREE.Mesh(geom, this.displayMaterial)
    )
  }

  addGeomToPickingMesh (meshName, geom) {
    if (geom.vertices == 0) {
      return
    }
    this.pickingMeshes[meshName].add(
      new THREE.Mesh(geom, this.pickingMaterial)
    )
  }

  buildMeshOfTube () {
    this.clearMesh('tube')
    let geom = new THREE.Geometry()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let res = trace.getReferenceObject(i)
        let ss = res.ss
        let color = getResColor(res)
        let isRound = true
        let isFront = (i === 0)
        let isBack = (i === n - 1)
        let resGeom = trace.getSegmentGeometry(
          i, fatCoilFace, isRound, isFront, isBack, color)
        geom.merge(resGeom)
        let iAtom = res.central_atom.i
        setGeometryVerticesColor(resGeom, new THREE.Color().setHex(iAtom))
      }
    }
    this.addGeomToDisplayMesh('tube', geom)
  }

  buildMeshOfRibbons () {
    this.clearMesh('ribbons')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let res = trace.getReferenceObject(i)
        let face = this.getSsFace(res.ss)
        let color = getResColor(res)
        let isRound = res.ss === 'C'
        let isFront = ((i === 0) ||
          (res.ss !== trace.getReferenceObject(i - 1).ss))
        let isBack = ((i === n - 1) ||
          (res.ss !== trace.getReferenceObject(i + 1).ss))
        let resGeom = trace.getSegmentGeometry(
          i, face, isRound, isFront, isBack, color)
        displayGeom.merge(resGeom)
        let iAtom = res.central_atom.i
        setGeometryVerticesColor(
          resGeom, this.getAtomIndexColor(res.central_atom))
        pickingGeom.merge(resGeom)
      }
    }
    this.addGeomToDisplayMesh('ribbons', displayGeom)
    this.addGeomToPickingMesh('ribbons', pickingGeom)
  }

  buildMeshOfArrows () {
    this.clearMesh('arrows')

    let geom = new THREE.Geometry()
    let blockArrowGeometry = new BlockArrowGeometry()
    blockArrowGeometry.computeFaceNormals()

    let obj = new THREE.Object3D()

    for (let trace of this.traces) {
      for (let i of _.range(trace.points.length)) {
        let point = trace.points[i]
        let tangent = trace.tangents[i]
        let normal = trace.binormals[i]
        let target = point.clone().add(tangent)

        let res = trace.getReferenceObject(i)
        let color = getDarkSsColor(res.ss)
        setGeometryVerticesColor(blockArrowGeometry, color)

        obj.matrix.identity()
        obj.position.copy(point)
        obj.up.copy(normal)
        obj.lookAt(target)
        obj.updateMatrix()

        geom.merge(blockArrowGeometry, obj.matrix)
      }
    }

    this.addGeomToDisplayMesh('arrows', geom)
  }

  buildMeshOfSidechain (residue) {
    if (!residue.is_protein_or_nuc) {
      return
    }

    var displayGeom = new THREE.Geometry()
    var pickingGeom = new THREE.Geometry()

    for (let bond of residue.bonds) {
      if (!inArray(bond.atom1.type, backboneAtoms)
        || !inArray(bond.atom2.type, backboneAtoms)) {
        this.mergeBondToGeom(displayGeom, bond, residue)
      }
    }

    for (let atom of _.values(residue.atoms)) {
      if (!inArray(atom.type, backboneAtoms)) {
        atom.is_sidechain = true
        let matrix = this.getSphereMatrix(atom.pos, this.radius)
        this.mergeUnitGeom(
          displayGeom, this.unitSphereGeom, this.getAtomColor(atom), matrix)
        this.mergeUnitGeom(
          pickingGeom, this.unitSphereGeom, this.getAtomIndexColor(atom), matrix)
      }
    }

    residue.sidechainMeshes = new THREE.Object3D()
    residue.sidechainMeshes.add(new THREE.Mesh(displayGeom, this.displayMaterial))
    residue.sidechainPickingMeshes = new THREE.Object3D()
    residue.sidechainPickingMeshes.add(new THREE.Mesh(pickingGeom, this.pickingMaterial))
  }

  buildMeshOfBackbone () {
    this.clearMesh('backbone')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let residue of this.protein.residues) {
      if (residue.is_protein_or_nuc) {
        for (let bond of residue.bonds) {
          if (inArray(bond.atom1.type, backboneAtoms) ||
            inArray(bond.atom2.type, backboneAtoms)) {
            this.mergeBondToGeom(displayGeom, bond, residue)
          }
        }
        for (let atom of _.values(residue.atoms)) {
          if (inArray(atom.type, backboneAtoms)) {
            this.mergeAtomToGeom(displayGeom, pickingGeom, atom)
          }
        }
      }
    }
    this.addGeomToDisplayMesh('backbone', displayGeom)
    this.addGeomToPickingMesh('backbone', pickingGeom)
  }

  buildMeshOfLigands () {
    this.clearMesh('ligands')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let residue of this.protein.residues) {
      if (residue.is_ligands) {
        for (let bond of residue.bonds) {
          this.mergeBondToGeom(displayGeom, bond, residue)
        }
        for (let atom of _.values(residue.atoms)) {
          this.mergeAtomToGeom(displayGeom, pickingGeom, atom)
        }
      }
    }
    this.addGeomToDisplayMesh('ligands', displayGeom)
    this.addGeomToPickingMesh('ligands', pickingGeom)
  }

  buildMeshOfWater () {
    this.clearMesh('water')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let residue of this.protein.residues) {
      if (residue.is_water) {
        for (let bond of residue.bonds) {
          this.mergeBondToGeom(displayGeom, bond, residue)
        }
        for (let atom of _.values(residue.atoms)) {
          this.mergeAtomToGeom(displayGeom, pickingGeom, atom)
        }
      }
    }
    this.addGeomToDisplayMesh('water', displayGeom)
    this.addGeomToPickingMesh('water', pickingGeom)
  }

  /**
   * Searches atoms for autodock grid atoms and gets the
   * B-factor limits for the grid atoms
   */
  findGridLimits () {
    this.scene.grid_atoms = {}

    for (var i = 0; i < this.protein.residues.length; i += 1) {
      var residue = this.protein.residues[i]
      if (residue.is_grid) {
        for (var a in residue.atoms) {
          var atom = residue.atoms[a]

          if (!(atom.elem in this.scene.grid_atoms)) {
            this.scene.grid_atoms[atom.elem] = true
          }

          if (this.gridControlWidget.minB === null) {
            this.gridControlWidget.minB = atom.bfactor
            this.gridControlWidget.maxB = atom.bfactor
          } else {
            if (atom.bfactor > this.gridControlWidget.maxB) {
              this.gridControlWidget.maxB = atom.bfactor
            }
            if (atom.bfactor < this.gridControlWidget.minB) {
              this.gridControlWidget.minB = atom.bfactor
            }
          }
        }
      }
    }

    if (this.gridControlWidget.minB === null) {
      this.gridControlWidget.minB = 0
    }
    if (this.gridControlWidget.maxB === null) {
      this.gridControlWidget.minB = 0
    }
    this.gridControlWidget.diffB = this.gridControlWidget.maxB - this.gridControlWidget.minB
    this.scene.grid = this.gridControlWidget.minB
    console.log('> ProteinDisplay.findGridLimits', this.scene.grid_atoms)
  }

  isVisibleGridAtom (iAtom) {
    let atom = this.protein.atoms[iAtom]
    let isAtomInRange = atom.bfactor > this.scene.grid
    let isAtomElemSelected = this.scene.grid_atoms[atom.elem]
    return isAtomElemSelected && isAtomInRange
  }

  buildMeshOfGrid () {
    if (!this.isGrid) {
      return
    }
    this.clearMesh('grid')
    for (let residue of this.protein.residues) {
      if (residue.is_grid) {
        for (let a in residue.atoms) {
          let atom = residue.atoms[a]
          if ((atom.bfactor > this.scene.grid) &&
            (this.scene.grid_atoms[atom.elem])) {
            var radius = 0.35
            var material = new THREE.MeshLambertMaterial({
              color: this.getAtomColor(atom)
            })

            var mesh = new THREE.Mesh(this.unitSphereGeom, material)
            mesh.scale.set(radius, radius, radius)
            mesh.position.copy(atom.pos)
            mesh.i = atom.i
            this.displayMeshes.grid.add(mesh)

            let indexMaterial = new THREE.MeshBasicMaterial({
              color: this.getAtomIndexColor(atom)
            })
            let pickingMesh = new THREE.Mesh(this.unitSphereGeom, indexMaterial)
            pickingMesh.scale.set(radius, radius, radius)
            pickingMesh.position.copy(atom.pos)
            pickingMesh.i = atom.i
            this.pickingMeshes.grid.add(pickingMesh)
          }
        }
      }
    }
  }

  buildMeshOfNucleotides () {
    this.clearMesh('basepairs')

    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()

    let cylinderGeom = new UnitCylinderGeometry()

    for (let residue of this.protein.residues) {
      if (residue.ss !== 'D' || !residue.is_protein_or_nuc) {
        continue
      }

      let basepairGeom = new THREE.Geometry()

      let atomTypes, bondTypes
      if (residue.type === 'DA' || residue.type === 'A') {
        atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']
        ]
      } else if (residue.type === 'DG' || residue.type === 'G') {
        atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']
        ]
      } else if (residue.type === 'DT' || residue.type === 'U') {
        atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']
        ]
      } else if (residue.type === 'DC' || residue.type === 'C') {
        atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']
        ]
      } else {
        continue
      }
      let vertices = getVerticesFromAtomDict(residue.atoms, atomTypes)
      basepairGeom.merge(new RaisedShapeGeometry(vertices, 0.3))

      let radius = 0.2
      for (let bond of bondTypes) {
        let vertices = getVerticesFromAtomDict(residue.atoms, [bond[0], bond[1]])
        basepairGeom.merge(cylinderGeom, cylinderMatrix(vertices[0], vertices[1], radius))
      }

      basepairGeom.computeFaceNormals()

      setGeometryVerticesColor(basepairGeom, getResColor(residue))
      displayGeom.merge(basepairGeom)

      setGeometryVerticesColor(basepairGeom, this.getAtomIndexColor(residue.central_atom))
      pickingGeom.merge(basepairGeom)
    }

    this.addGeomToDisplayMesh('basepairs', displayGeom)
    this.addGeomToPickingMesh('basepairs', pickingGeom)
  }

  /**
   ******************************************
   * Other Graphical objects
   ******************************************
   */

  buildCrossHairs () {
    var radius = 1.2,
      segments = 60,
      material = new THREE.LineDashedMaterial(
        {color: 0xFF7777, linewidth: 2})
    var geometry = new THREE.CircleGeometry(radius, segments)

    // Remove center vertex
    geometry.vertices.shift()

    this.crossHairs = new THREE.Line(geometry, material)
    this.crossHairs.dontDelete = true
    this.displayScene.add(this.crossHairs)
  }

  moveCrossHairs () {
    this.crossHairs.position.copy(this.cameraTarget)
    this.crossHairs.lookAt(this.camera.position)
    this.crossHairs.updateMatrix()
  }

  setTargetFromResId (resId) {
    var atom = this.protein.res_by_id[resId].central_atom
    this.setTargetFromAtom(atom)
  }

  setTargetFromAtom (atom) {
    var position = v3.clone(atom.pos)
    var sceneDisplacement = position.clone()
      .sub(this.cameraTarget)

    var view = convertTargetToView({
      cameraTarget: position,
      cameraPosition: this.camera.position.clone()
        .add(sceneDisplacement),
      cameraUp: this.camera.up.clone(),
      zFront: this.zFront,
      zBack: this.zBack
    })

    view.copy_metadata_from_view(this.scene.current_view)
    view.res_id = atom.res_id
    view.i_atom = atom.i
    this.scene.target_view = view

    this.scene.is_new_view_chosen = true
    this.scene.n_update_step = this.scene.max_update_step
  }

  setCameraFromCurrentView () {
    var target = convertViewToTarget(
      this.scene.current_view
    )

    var cameraDirection = this.camera.position.clone()
      .sub(this.cameraTarget)
      .normalize()

    var targetCameraDirection = target.cameraPosition.clone()
      .sub(target.cameraTarget)
    this.zoom = targetCameraDirection.length()
    targetCameraDirection.normalize()

    var rotation = getUnitVectorRotation(
      cameraDirection, targetCameraDirection)

    for (let i = 0; i < this.lights.length; i += 1) {
      this.lights[i].position.applyQuaternion(rotation)
    }

    this.cameraTarget.copy(target.cameraTarget)
    this.camera.position.copy(target.cameraPosition)
    this.camera.up.copy(target.cameraUp)

    this.zFront = target.zFront
    this.zBack = target.zBack

    var far = this.zoom + this.zBack
    var near = this.zoom + this.zFront
    if (near < 1) {
      near = 1
    }

    this.camera.near = near
    this.camera.far = far
    this.camera.lookAt(this.cameraTarget)
    this.camera.updateProjectionMatrix()

    this.displayScene.fog.near = near
    this.displayScene.fog.far = far

    var residues = this.protein.residues
    var view = this.scene.current_view
    for (let i = 0; i < residues.length; i += 1) {
      residues[i].selected = false
    }
    for (let i = 0; i < view.selected.length; i += 1) {
      var i_res = view.selected[i]
      residues[i_res].selected = true
    }
  }

  adjustCamera (xRotationAngle, yRotationAngle, zRotationAngle, zoomRatio) {
    var y = this.camera.up
    var z = this.camera.position.clone()
      .sub(this.cameraTarget)
      .normalize()
    var x = (new TV3())
      .crossVectors(y, z)
      .normalize()

    var rot_z = new THREE.Quaternion()
      .setFromAxisAngle(z, zRotationAngle)

    var rot_y = new THREE.Quaternion()
      .setFromAxisAngle(y, -yRotationAngle)

    var rot_x = new THREE.Quaternion()
      .setFromAxisAngle(x, -xRotationAngle)

    var rotation = new THREE.Quaternion()
      .multiply(rot_z)
      .multiply(rot_y)
      .multiply(rot_x)

    var newZoom = zoomRatio * this.zoom

    if (newZoom < 2) {
      newZoom = 2
    }

    var cameraPosition = this.camera.position.clone()
      .sub(this.cameraTarget)
      .applyQuaternion(rotation)
      .normalize()
      .multiplyScalar(newZoom)
      .add(this.cameraTarget)

    var view = convertTargetToView({
      cameraTarget: this.cameraTarget.clone(),
      cameraPosition: cameraPosition,
      cameraUp: this.camera.up.clone()
        .applyQuaternion(rotation),
      zFront: this.zFront,
      zBack: this.zBack
    })

    view.copy_metadata_from_view(this.scene.current_view)

    this.controller.set_current_view(view)
  }

  resize () {
    this.camera.aspect = this.width() / this.height()
    this.camera.updateProjectionMatrix()

    if (exists(this.renderer)) {
      this.renderer.setSize(this.width(), this.height())
    }

    this.pickingTexture.setSize(this.width(), this.height())

    this.zSlabWidget.resize()

    if (this.isGrid) {
      this.gridControlWidget.resize()
    }

    this.sequenceWidget.resize()

    this.controller.flag_changed()
  }

  width () {
    return this.mainDiv.width()
  }

  height () {
    return this.mainDiv.height()
  }

  getMouse (event) {
    if (exists(event.touches) && (event.touches.length > 0)) {
      this.eventX = event.touches[0].clientX
      this.eventY = event.touches[0].clientY
    } else {
      this.eventX = event.clientX
      this.eventY = event.clientY
    }

    var result = getDomPosition(this.mainDiv[0])
    this.mouseX = this.eventX - result[0]
    this.mouseY = this.eventY - result[1]

    var x = this.mouseX - this.width() / 2
    var y = this.mouseY - this.height() / 2

    this.mouseR = Math.sqrt(x * x + y * y)

    this.mouseT = Math.atan(y / x)
    if (x < 0) {
      if (y > 0) {
        this.mouseT += Math.PI
      } else {
        this.mouseT -= Math.PI
      }
    }
  }

  saveMouse () {
    this.saveMouseX = this.mouseX
    this.saveMouseY = this.mouseY
    this.saveMouseR = this.mouseR
    this.saveMouseT = this.mouseT
  }

  getZ (pos) {
    var origin = this.cameraTarget.clone()

    var cameraDir = origin.clone()
      .sub(this.camera.position)
      .normalize()

    var posRelativeToOrigin = pos.clone()
      .sub(origin)

    return posRelativeToOrigin.dot(cameraDir)
  }

  inZlab (pos) {
    var z = this.getZ(pos)

    return ((z >= this.zFront) && (z <= this.zBack))
  }

  opacity (pos) {
    var z = this.getZ(pos)

    if (z < this.zFront) {
      return 1.0
    }

    if (z > this.zBack) {
      return 0.0
    }

    var opacity = 1 - (z - this.zFront) / (this.zBack - this.zFront)

    return opacity
  }

  getHoverAtom () {
    var x = this.mouseX
    var y = this.mouseY

    if ((x === null) || (y === null)) {
      return null
    }

    // create buffer for reading single pixel
    var pixelBuffer = new Uint8Array(4)

    // render the picking scene off-screen
    this.renderer.render(
      this.pickingScene, this.camera, this.pickingTexture)

    // read the pixel under the mouse from the texture
    this.renderer.readRenderTargetPixels(
      this.pickingTexture,
      this.mouseX, this.pickingTexture.height - y,
      1, 1,
      pixelBuffer)

    // interpret the pixel as an ID
    var i = ( pixelBuffer[0] << 16 )
      | ( pixelBuffer[1] << 8 )
      | ( pixelBuffer[2] )

    if (i < this.protein.atoms.length) {
      return this.protein.atoms[i]
    }

    return null

  }

  posXY (pos) {
    var widthHalf = 0.5 * this.width()
    var heightHalf = 0.5 * this.height()

    var vector = pos.clone().project(this.camera)

    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    }
  }

  atomLabelDialog () {
    var i_atom = this.scene.current_view.i_atom
    if (i_atom >= 0) {
      var controller = this.controller

      function success (text) {
        controller.make_label(i_atom, text)
      }

      var atom = this.protein.atoms[i_atom]
      var label = 'Label atom : ' + atom.label

      textEntryDialog(this.mainDiv, label, success)
    }
  }

  updateHover () {
    this.hoverAtom = this.getHoverAtom()

    if (this.hoverAtom) {
      var text = this.hoverAtom.label
      if (this.hoverAtom === this.scene.centered_atom()) {
        text = '<div style="text-align: center">'
        text += '<br>[drag distances]<br>'
        text += '[double-click labels]'
        text += '</div>'
      }
      this.hover.html(text)
      var vector = this.posXY(v3.clone(this.hoverAtom.pos))
      this.hover.move(vector.x, vector.y)
    } else {
      this.hover.hide()
    }
  }

  doubleclick () {
    if (this.hoverAtom !== null) {
      if (this.hoverAtom === this.scene.centered_atom()) {
        this.atomLabelDialog()
      } else {
        this.setTargetFromAtom(this.hoverAtom)
      }
      this.isDraggingCentralAtom = false
    }
  }

  mousedown (event) {
    this.getMouse(event)

    event.preventDefault()

    var now = (new Date()).getTime()

    var isDoubleClick = (now - this.timePressed) < 500

    this.updateHover()

    this.downAtom = this.getHoverAtom()

    if (isDoubleClick) {
      this.doubleclick()
    } else {
      this.isDraggingCentralAtom = false

      if (this.downAtom !== null) {
        this.isDraggingCentralAtom = true
      }
    }

    this.timePressed = now

    this.saveMouse()
    this.mousePressed = true
  }

  mousemove (event) {
    this.getMouse(event)

    event.preventDefault()

    if (this.isGesture) {
      return
    }

    this.updateHover()

    if (this.isDraggingCentralAtom) {
      var mainDivPos = this.mainDiv.position()
      var v = this.posXY(v3.clone(this.downAtom.pos))

      this.distancePartnerPointer.move(this.mouseX, this.mouseY,
        v.x,
        v.y)
    } else {
      var shiftDown = (event.shiftKey === 1)

      var rightMouse =
        (event.button === 2) || (event.which === 3)

      if (this.mousePressed) {
        var zoomRatio = 1.0
        var zRotationAngle = 0
        var yRotationAngle = 0
        var xRotationAngle = 0

        if (rightMouse || shiftDown) {
          zRotationAngle = this.mouseT - this.saveMouseT

          if (this.mouseR > 0.0) {
            zoomRatio = this.saveMouseR / this.mouseR
          }
        } else {
          yRotationAngle = degToRad(this.mouseX - this.saveMouseX)
          xRotationAngle = degToRad(this.mouseY - this.saveMouseY)
        }

        this.adjustCamera(
          xRotationAngle,
          yRotationAngle,
          zRotationAngle,
          zoomRatio)

        this.saveMouse()
      }
    }
  }

  mousewheel (event) {
    event.preventDefault()

    var wheel
    if (exists(event.wheelDelta)) {
      wheel = event.wheelDelta / 120
    } else {
      // for Firefox
      wheel = -event.detail / 12
    }
    let zoom = Math.pow(1 + Math.abs(wheel) / 2, wheel > 0 ? 1 : -1)

    this.adjustCamera(0, 0, 0, zoom)
  }

  mouseup (event) {
    this.getMouse(event)

    event.preventDefault()

    if (this.isDraggingCentralAtom) {
      if (this.hoverAtom !== null) {
        var centralAtom = this.scene.centered_atom()

        if (this.hoverAtom !== this.downAtom) {
          this.controller.make_dist(
            this.hoverAtom, this.downAtom)
        }
      }

      this.distancePartnerPointer.hide()

      this.isDraggingCentralAtom = false
    }

    if (exists(event.touches)) {
      this.hover.hide()
      this.mouseX = null
      this.mouseY = null
    }

    this.downAtom = null

    this.mousePressed = false
  }

  gesturestart (event) {
    event.preventDefault()
    this.isGesture = true
    this.lastPinchRotation = 0
    this.lastScale = event.scale * event.scale
  }

  gesturechange (event) {
    event.preventDefault()
    this.adjustCamera(
      0,
      0,
      degToRad(event.rotation * 2 - this.lastPinchRotation),
      this.lastScale / (event.scale * event.scale))

    this.lastPinchRotation = event.rotation * 2
    this.lastScale = event.scale * event.scale
  }

  gestureend (event) {
    event.preventDefault()
    this.isGesture = false
    this.downAtom = null
    this.mousePressed = false
  }

}

export {ProteinDisplay}
