import THREE from 'three'
import $ from 'jquery'
import _ from 'lodash'
import v3 from './v3'
import {View} from './protein'

import {
  UnitCylinderGeometry,
  BlockArrowGeometry,
  setVisible,
  RaisedShapeGeometry,
  getUnitVectorRotation,
  getFractionRotation,
  setGeometryVerticesColor,
  clearObject3D,
  Trace,
  mergeUnitGeom,
  getSphereMatrix,
  getCylinderMatrix
} from './glgeometry'

import {
  toggleButton,
  exists,
  getDomPosition,
  inArray,
  stickJqueryDivInTopLeft,
  textEntryDialog
} from './util'


let TV3 = THREE.Vector3

// Color constants

const green = new THREE.Color(0x639941)
const blue = new THREE.Color(0x568AB5)
const yellow = new THREE.Color(0xFFC900)
const purple = new THREE.Color(0x9578AA)
const grey = new THREE.Color(0xBBBBBB)
const red = new THREE.Color(0x993333)

const darkGreen = new THREE.Color(0x2E471E)
const darkBlue = new THREE.Color(0x406786)
const darkYellow = new THREE.Color(0xC39900)
const darkPurple = new THREE.Color(0x5E4C6B)
const darkGrey = new THREE.Color(0x555555)
const darkRed = new THREE.Color(0x662222)

let ElementColors = {
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

function getIndexColor (i) {
  return new THREE.Color().setHex(i)
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

const resToAa = {
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

// Backbone atom names

const backboneAtoms = [
  'N', 'C', 'O', 'H', 'HA', 'CA', 'OXT',
  'C3\'', 'P', 'OP1', 'O5\'', 'OP2',
  'C5\'', 'O5\'', 'O3\'', 'C4\'', 'O4\'', 'C1\'', 'C2\'', 'O2\'',
  'H2\'', 'H2\'\'', 'H3\'', 'H4\'', 'H5\'', 'H5\'\'', 'HO3\''
]

// Cartoon cross-sections
const ribbonFace = new THREE.Shape([
  new THREE.Vector2(-1.5, -0.2),
  new THREE.Vector2(-1.5, +0.2),
  new THREE.Vector2(+1.5, +0.2),
  new THREE.Vector2(+1.5, -0.2)
])
const coilFace = new THREE.Shape([
  new THREE.Vector2(-0.2, -0.2),
  new THREE.Vector2(-0.2, +0.2),
  new THREE.Vector2(+0.2, +0.2),
  new THREE.Vector2(+0.2, -0.2)
])
// Tube cross-sections
const fatCoilFace = new THREE.Shape([
  new THREE.Vector2(-0.25, -0.25),
  new THREE.Vector2(-0.25, +0.25),
  new THREE.Vector2(+0.25, +0.25),
  new THREE.Vector2(+0.25, -0.25)
])

function getSsFace (ss) {
  if (ss === 'C' || ss === '-') {
    return coilFace
  }
  return ribbonFace
}

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

class AtomLabelsWidget {

  constructor(proteinDisplay) {
    this.atomlabels = []
    this.threeJsScene = proteinDisplay.displayScene
    this.scene = proteinDisplay.scene
    this.controller = proteinDisplay.controller
    this.webglDivTag = proteinDisplay.webglDivTag
    this.proteinDisplay = proteinDisplay
  }

  draw() {
    var labels = this.scene.current_view.labels

    for (let i = this.atomlabels.length; i < labels.length; i += 1) {
      var atomLabel = new AtomLabel(
        this.webglDivTag, this.controller, this.atomlabels)
      this.atomlabels.push(atomLabel)
    }

    for (let i = this.atomlabels.length - 1; i >= 0; i -= 1) {
      if (i >= labels.length) {
        this.atomlabels[i].remove()
      }
    }

    var atoms = this.scene.protein.atoms

    for (let i = 0; i < labels.length; i += 1) {
      var atom = atoms[labels[i].i_atom]
      var pos = atom.pos
      var v = this.proteinDisplay.posXY(pos)
      var opacity = 0.7 * this.proteinDisplay.opacity(pos) + 0.2

      this.atomlabels[i].update(
        i, labels[i].text, v.x, v.y, opacity)

      if (!this.proteinDisplay.inZlab(pos)) {
        this.atomlabels[i].hide()
      }
    }
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

class DistanceMeasuresWidget {

  constructor(proteinDisplay) {
    this.distanceMeasures = []
    this.threeJsScene = proteinDisplay.displayScene
    this.scene = proteinDisplay.scene
    this.controller = proteinDisplay.controller
    this.webglDivTag = proteinDisplay.webglDivTag
    this.proteinDisplay = proteinDisplay
  }

  draw() {
    let distances = this.scene.current_view.distances
    let atoms = this.scene.protein.atoms

    for (let i = 0; i < distances.length; i += 1) {
      let distance = distances[i]
      let p1 = atoms[distance.i_atom1].pos
      let p2 = atoms[distance.i_atom2].pos
      let m = p1.clone().add(p2).multiplyScalar(0.5)

      let opacity = 0.7 * this.proteinDisplay.opacity(m) + 0.3

      let v = this.proteinDisplay.posXY(m)

      let text = p1.distanceTo(p2).toFixed(1)

      if (i >= this.distanceMeasures.length) {
        this.distanceMeasures.push(
          new DistanceMeasure(
            this.webglDivTag, this.threeJsScene,
            this.controller, this.distanceMeasures))
      }

      this.distanceMeasures[i].update(i, text, v.x, v.y, p1, p2, opacity)

      if (!this.proteinDisplay.inZlab(m)) {
        this.distanceMeasures[i].hide()
      }
    }

    for (let i = this.distanceMeasures.length - 1; i >= 0; i -= 1) {
      if (i >= distances.length) {
        this.distanceMeasures[i].remove()
      }
    }
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
 * Widget interface
 *
 * this.reset - called after model rebuild
 * this.draw - called at every draw draw
 * this.resize - called after every resize of window
 */

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
    let parentDivPos = this.parentDiv.position()
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

/**
 * SequenceWidget
 *   - creates a dual band across the top of the selected div
 *     for glProteinDisplay
 *   - the first band is a sequence bar widget
 *   - the second band is a sequence text widget
 *   - these two are integrated so that they share state
 **/

class SequenceWidget extends CanvasWrapper {
  constructor (selector, proteinDisplay) {
    super(selector)

    this.proteinDisplay = proteinDisplay
    this.scene = proteinDisplay.scene
    this.traces = proteinDisplay.traces

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

  reset () {
    this.residues = []
    for (let trace of this.traces) {
      for (let i of _.range(trace.points.length)) {
        let iRes = trace.indices[i]
        let residue = trace.getReferenceObject(i)

        let entry = {
          iRes,
          ss: residue.ss,
          resId: residue.id,
          iAtom: residue.central_atom.i
        }

        let resType = residue.type
        if (resType in resToAa) {
          entry.c = resToAa[resType]
        } else {
          entry.c = '.'
        }

        this.residues.push(entry)
      }
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

  getCurrIAtom () {
    return this.residues[this.iRes].iAtom
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

      this.proteinDisplay.setTargetFromAtom(this.getCurrIAtom())

    } else {
      this.iRes = this.xToIChar(this.pointerX)
      this.proteinDisplay.setTargetFromAtom(this.getCurrIAtom())
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

  /**
   * Searches autodock grid atoms for B-factor limits
   */
  findLimits () {
    this.scene.grid_atoms = {}

    for (let residue of this.scene.protein.residues) {
      if (residue.is_grid) {
        for (let atom of _.values(residue.atoms)) {
          if (!(atom.elem in this.scene.grid_atoms)) {
            this.scene.grid_atoms[atom.elem] = true
          }

          if (this.minB === null) {
            this.minB = atom.bfactor
            this.maxB = atom.bfactor
          } else {
            if (atom.bfactor > this.maxB) {
              this.maxB = atom.bfactor
            }
            if (atom.bfactor < this.minB) {
              this.minB = atom.bfactor
            }
          }
        }
      }
    }

    if (this.minB === null) {
      this.minB = 0
    }
    if (this.maxB === null) {
      this.minB = 0
    }
    this.diffB = this.maxB - this.minB
    this.scene.grid = this.minB
    console.log('> GridControlWidget.findLimits', this.scene.grid_atoms)
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

    this.findLimits()

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
    this.controller.calculate_current_abs_camera = function() {}

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
    this.webglDiv.contextmenu(() => false)

    this.mainDiv.append(this.webglDiv)
    this.mainDiv.css('background-color', '#CCC')

    this.cameraTarget = new THREE.Vector3(0, 0, 0)
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.width() / this.height(),
      this.zFront + this.zoom,
      this.zBack + this.zoom)

    this.traces = []

    this.displayMeshes = {}
    this.displayScene = new THREE.Scene()
    this.displayScene.background = new THREE.Color(this.backgroundColor)
    this.displayScene.fog = new THREE.Fog(this.backgroundColor, 1, 100)
    this.displayScene.fog.near = this.zoom + 1
    this.displayScene.fog.far = this.zoom + this.zBack
    this.displayMaterial = new THREE.MeshLambertMaterial(
      {vertexColors: THREE.VertexColors})

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

    this.distanceMeasuresWidgets = new DistanceMeasuresWidget(this)
    this.atomLabelsWidget = new AtomLabelsWidget(this)
    this.sequenceWidget = new SequenceWidget(this.divTag, this)
    this.zSlabWidget = new ZSlabWidget(this.divTag, this.scene)
    if (this.isGrid) {
      this.gridControlWidget = new GridControlWidget(this.divTag, this.scene)
    }

    this.lineElement = new LineElement(this.webglDivTag, '#FF7777')
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
  displayMessageBeforeCompute (message, computeHeavyFn) {
    this.setProcessingMesssage(message)
    // this pause allows the DOM to draw before compute
    setTimeout(computeHeavyFn, 0)
  }

  buildAfterDataLoad (defaultHtml) {

    for (let res of this.protein.residues) {
      res.color = getSsColor(res.ss)
    }

    this.buildScene()

    this.sequenceWidget.reset()

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
    this.buildScene()
    this.scene.changed = true
    this.sequenceWidget.reset()
    this.gridControlWidget.reset()
  }

  isPeptideConnected (iRes0, iRes1) {
    var res0 = this.protein.residues[iRes0]
    var res1 = this.protein.residues[iRes1]

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

  isSugarPhosphateConnected (iRes0, iRes1) {
    var res0 = this.protein.residues[iRes0]
    var res1 = this.protein.residues[iRes1]

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

  getNormalOfNuc (iRes) {
    let atoms = this.protein.residues[iRes].atoms
    let forward = v3.diff(atoms['C3\''].pos, atoms['C5\''].pos)
    let up = v3.diff(atoms['C1\''].pos, atoms['C3\''].pos)
    return v3.crossProduct(forward, up)
  }

  findContinuousTraces () {
    this.traces.splice(0, this.traces.length)

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
            residue.normal = this.getNormalOfNuc(iResidue)
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
        let normal = null
        if (residues[iResidue].normal) {
          normal = residues[iResidue].normal
        }
        this.trace.normals.push(normal)
      }
    }

    // flip normals so that they are all pointing in same direction
    // within the same piece of chain
    for (let trace of this.traces) {
      for (let i of _.range(1, trace.indices.length)) {
        if (trace.getReferenceObject(i).ss !== 'D' &&
            trace.getReferenceObject(i - 1).ss !== 'D') {
          let normal = trace.normals[i]
          let prevNormal = trace.normals[i - 1]
          if (normal !== null && prevNormal !== null)
            if (normal.dot(prevNormal) < 0) {
              trace.normals[i].negate()
            }
        }
      }
    }

    for (let trace of this.traces) {
      trace.expand()
    }
  }

  getAtomColor (iAtom) {
    let atom = this.protein.atoms[iAtom]
    if (atom.elem === 'C' || atom.elem === 'H') {
      var res = this.protein.res_by_id[atom.res_id]
      return res.color
    } else if (atom.elem in ElementColors) {
      return ElementColors[atom.elem]
    }
    return darkGrey
  }

  assignBondsToResidues () {
    for (let res of this.protein.residues) {
      res.bonds = []
    }

    for (let bond of this.protein.bonds) {
      var atom1 = bond.atom1
      var atom2 = bond.atom2

      if (atom1.is_alt || atom2.is_alt) {
        continue
      }

      let res1 = this.protein.res_by_id[atom1.res_id]
      let res2 = this.protein.res_by_id[atom2.res_id]

      res1.bonds.push(bond)

      if (res1 !== res2) {
        res2.bonds.push(bond)
      }
    }
  }

  buildLights () {
    let directionalLight = new THREE.DirectionalLight(0xFFFFFF)
    directionalLight.position.copy(
      new TV3(0.2, 0.2, 100).normalize())
    directionalLight.dontDelete = true
    this.lights.push(directionalLight)

    let directionalLight2 = new THREE.DirectionalLight(0xFFFFFF)
    directionalLight2.position.copy(
      new TV3(0.2, 0.2, -100).normalize())
    directionalLight2.dontDelete = true
    this.lights.push(directionalLight2)

    let ambientLight = new THREE.AmbientLight(0x202020)
    ambientLight.dontDelete = true
    this.lights.push(ambientLight)

    for (let i = 0; i < this.lights.length; i += 1) {
      this.displayScene.add(this.lights[i])
    }
  }

  /**
   **********************************************************
   * Mesh-building methods
   *
   * Routines to build meshes that will be incorporated into
   * scenes, and to be used for gpu-picking.
   *
   * Meshes are stored in a dictionary: this.displayMeshes &
   * this.pickingMeshes
   **********************************************************
   */

  buildScene () {

    // calculate protein parameters
    this.assignBondsToResidues()

    // generate the Trace for ribbons and tubes
    this.findContinuousTraces()

    // create default Meshes
    this.buildMeshOfRibbons()
    this.buildMeshOfGrid()
    // this.buildMeshOfNucleotides()
    this.buildMeshOfArrows()
    this.clearMesh('sidechains')

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

    this.updateMeshesInScene = false

    let show = this.scene.current_view.show
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
        let iRes = trace.indices[i]
        let residue = trace.getReferenceObject(i)
        let residueShow = show.sidechain || residue.selected
        if (residueShow && !exists(residue.mesh)) {
          this.buildMeshOfSidechain(iRes)
          this.updateMeshesInScene = true
          residue.mesh = true
        }
      }
    }

    if (exists(this.displayMeshes.sidechains)) {
      for (let mesh of [this.displayMeshes.sidechains, this.pickingMeshes.sidechains]) {
        mesh.traverse(child => {
          if (exists(child.i)) {
            let residue = this.protein.residues[child.i]
            child.visible = show.sidechain || residue.selected
          }
        })
      }
    }

    if (this.updateMeshesInScene) {
      this.rebuildSceneWithMeshes()
    }
  }

  mergeAtomToGeom (geom, pickGeom, iAtom) {
    let atom = this.protein.atoms[iAtom]
    let matrix = getSphereMatrix(atom.pos, this.radius)
    let unitGeom = this.unitSphereGeom
    mergeUnitGeom(geom, unitGeom, this.getAtomColor(iAtom), matrix)
    mergeUnitGeom(pickGeom, unitGeom, getIndexColor(iAtom), matrix)
  }

  mergeBondsInResidue (geom, iRes, bondFilterFn) {
    let residue = this.protein.residues[iRes]
    let unitGeom = new UnitCylinderGeometry()
    let color = residue.color
    let p1, p2
    for (let bond of residue.bonds) {
      if (bondFilterFn && !bondFilterFn(bond)) {
        continue
      }
      p1 = bond.atom1.pos
      p2 = bond.atom2.pos
      if (bond.atom1.res_id !== bond.atom2.res_id) {
        let midpoint = p2.clone().add(p1).multiplyScalar(0.5)
        if (bond.atom1.res_id === residue.id) {
          p2 = midpoint
        } else if (bond.atom2.res_id === residue.id) {
          p1 = midpoint
        }
      }
      mergeUnitGeom(geom, unitGeom, color, getCylinderMatrix(p1, p2, 0.2))
    }
  }

  addGeomToDisplayMesh (meshName, geom) {
    if (geom.vertices === 0) {
      return
    }
    this.displayMeshes[meshName].add(
      new THREE.Mesh(geom, this.displayMaterial)
    )
  }

  addGeomToPickingMesh (meshName, geom) {
    if (geom.vertices === 0) {
      return
    }
    this.pickingMeshes[meshName].add(
      new THREE.Mesh(geom, this.pickingMaterial)
    )
  }

  buildMeshOfRibbons () {
    this.clearMesh('ribbons')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let res = trace.getReferenceObject(i)
        let face = getSsFace(res.ss)
        let color = res.color
        let isRound = res.ss === 'C'
        let isFront = ((i === 0) ||
          (res.ss !== trace.getReferenceObject(i - 1).ss))
        let isBack = ((i === n - 1) ||
          (res.ss !== trace.getReferenceObject(i + 1).ss))
        let resGeom = trace.getSegmentGeometry(
          i, face, isRound, isFront, isBack, color)
        displayGeom.merge(resGeom)
        let atom = res.central_atom
        setGeometryVerticesColor(resGeom, getIndexColor(atom.i))
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

  buildMeshOfTube () {
    this.clearMesh('tube')
    let geom = new THREE.Geometry()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let res = trace.getReferenceObject(i)
        let color = res.color
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

  buildMeshOfSidechain (iRes) {
    let residue = this.protein.residues[iRes]
    if (!residue.is_protein_or_nuc) {
      return
    }

    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()

    this.mergeBondsInResidue(
      displayGeom, iRes, bond => {
        return !_.includes(backboneAtoms, bond.atom1.type) ||
               !_.includes(backboneAtoms, bond.atom2.type)
      })

    for (let atom of _.values(residue.atoms)) {
      if (!inArray(atom.type, backboneAtoms)) {
        atom.is_sidechain = true
        let matrix = getSphereMatrix(atom.pos, this.radius)
        mergeUnitGeom(
          displayGeom, this.unitSphereGeom, this.getAtomColor(atom.i), matrix)
        mergeUnitGeom(
          pickingGeom, this.unitSphereGeom, getIndexColor(atom.i), matrix)
      }
    }

    let displayMesh = new THREE.Mesh(displayGeom, this.displayMaterial)
    displayMesh.i = iRes
    this.displayMeshes.sidechains.add(displayMesh)

    let pickingMesh = new THREE.Mesh(pickingGeom, this.pickingMaterial)
    pickingMesh.i = iRes
    this.pickingMeshes.sidechains.add(pickingMesh)
  }

  buildMeshOfBackbone () {
    this.clearMesh('backbone')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let [iRes, residue] of this.protein.residues.entries()) {
      if (residue.is_protein_or_nuc) {
        for (let bond of residue.bonds) {
          this.mergeBondsInResidue(
            displayGeom, iRes, bond => {
              return _.includes(backboneAtoms, bond.atom1.type) &&
                     _.includes(backboneAtoms, bond.atom2.type)
            })
        }
        for (let atom of _.values(residue.atoms)) {
          if (inArray(atom.type, backboneAtoms)) {
            this.mergeAtomToGeom(displayGeom, pickingGeom, atom.i)
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
    for (let [iRes, residue] of this.protein.residues.entries()) {
      if (residue.is_ligands) {
        this.mergeBondsInResidue(displayGeom, iRes)
        for (let atom of _.values(residue.atoms)) {
          this.mergeAtomToGeom(displayGeom, pickingGeom, atom.i)
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
    for (let [iRes, residue] of this.protein.residues.entries()) {
      if (residue.is_water) {
        this.mergeBondsInResidue(displayGeom, iRes)
        for (let atom of _.values(residue.atoms)) {
          this.mergeAtomToGeom(displayGeom, pickingGeom, atom.i)
        }
      }
    }
    this.addGeomToDisplayMesh('water', displayGeom)
    this.addGeomToPickingMesh('water', pickingGeom)
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
        for (let atom of _.values(residue.atoms)) {
          if ((atom.bfactor > this.scene.grid) &&
            (this.scene.grid_atoms[atom.elem])) {
            let radius = 0.35

            let material = new THREE.MeshLambertMaterial({
              color: this.getAtomColor(atom.i)
            })
            let mesh = new THREE.Mesh(this.unitSphereGeom, material)
            mesh.scale.set(radius, radius, radius)
            mesh.position.copy(atom.pos)
            mesh.i = atom.i
            this.displayMeshes.grid.add(mesh)

            let indexMaterial = new THREE.MeshBasicMaterial({
              color: getIndexColor(atom.i)
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
        basepairGeom.merge(cylinderGeom, getCylinderMatrix(vertices[0], vertices[1], radius))
      }

      basepairGeom.computeFaceNormals()

      setGeometryVerticesColor(basepairGeom, residue.color)
      displayGeom.merge(basepairGeom)

      setGeometryVerticesColor(basepairGeom, getIndexColor(residue.central_atom.i))
      pickingGeom.merge(basepairGeom)
    }

    this.addGeomToDisplayMesh('basepairs', displayGeom)
    this.addGeomToPickingMesh('basepairs', pickingGeom)
  }

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

  /**
   ******************************************
   * Draw/Animate Graphical objects
   ******************************************
   */

  isChanged () {
    return this.scene.changed
  }

  updateCrossHairs () {
    this.crossHairs.position.copy(this.cameraTarget)
    this.crossHairs.lookAt(this.camera.position)
    this.crossHairs.updateMatrix()
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

    this.updateCrossHairs()

    this.distanceMeasuresWidgets.draw()

    this.zSlabWidget.draw()

    if (this.isGrid) {
      this.gridControlWidget.draw()
    }
    this.sequenceWidget.draw()

    // leave this to the very last moment
    // to avoid the dreaded black canvas
    if (!exists(this.renderer)) {
      this.initWebglRenderer()
    }
    this.renderer.render(this.displayScene, this.camera)

    this.atomLabelsWidget.draw()

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

  /**
   ******************************************
   * Handle camera
   ******************************************
   */

  setTargetFromResId (resId) {
    var atom = this.protein.res_by_id[resId].central_atom
    this.setTargetFromAtom(atom.i)
  }

  setTargetFromAtom (iAtom) {
    let atom = this.protein.atoms[iAtom]
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

  getIAtomHover () {
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
      return i
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
    if (this.getIAtomHover() !== null) {
      this.iHoverAtom = this.getIAtomHover()
    } else {
      this.iHoverAtom = null
    }

    if (this.iHoverAtom) {
      let atom = this.protein.atoms[this.iHoverAtom]
      var text = atom.label
      if (atom === this.scene.centered_atom()) {
        text = '<div style="text-align: center">'
        text += '<br>[drag distances]<br>'
        text += '[double-click labels]'
        text += '</div>'
      }
      this.hover.html(text)
      var vector = this.posXY(v3.clone(atom.pos))
      this.hover.move(vector.x, vector.y)
    } else {
      this.hover.hide()
    }
  }

  doubleclick () {
    if (this.iHoverAtom !== null) {
      if (this.iHoverAtom === this.scene.centered_atom().i) {
        this.atomLabelDialog()
      } else {
        this.setTargetFromAtom(this.iHoverAtom)
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

    this.iDownAtom = this.getIAtomHover()

    if (isDoubleClick) {
      this.doubleclick()
    } else {
      this.isDraggingCentralAtom = false

      if (this.iDownAtom !== null) {
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
      var v = this.posXY(this.protein.atoms[this.iDownAtom].pos)

      this.lineElement.move(this.mouseX, this.mouseY, v.x, v.y)
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
      if (this.iHoverAtom !== null) {
        if (this.iHoverAtom !== this.iDownAtom) {
          this.controller.make_dist(
            this.protein.atoms[this.iHoverAtom],
            this.protein.atoms[this.iDownAtom])
        }
      }

      this.lineElement.hide()

      this.isDraggingCentralAtom = false
    }

    if (exists(event.touches)) {
      this.hover.hide()
      this.mouseX = null
      this.mouseY = null
    }

    this.iDownAtom = null

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
    this.iDownAtom = null
    this.mousePressed = false
  }

}

export {ProteinDisplay}
