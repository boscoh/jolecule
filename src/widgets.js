/**
 * Widget interface
 *
 * decorated graphical objects on top of ProteinDisplay that are a hybrid
 * of HTML DOM elements and WebGL elements such as lines, atom labels,
 * distance measures, sequence bars, z-slab control, grid controls
 *
 * this.reset - called after model rebuild
 * this.draw - called at every draw event
 * this.resize - called after every resize of window
 */

import $ from 'jquery'
import * as THREE from 'three'
import _ from 'lodash'

import * as data from './data'
import * as util from './util'

/**
 * LineElement
 * - instantiates a DOM object is to draw a line between (x1, y1) and
 *   (x2, y2) within a jquery div
 * - used to display the mouse tool for making distance labels
 */

class LineElement {
  constructor (display, color) {
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

    this.parentDiv = $(display.divTag)
    this.parentDiv.append(this.div)
  }

  hide () {
    this.div.css('display', 'none')
  }

  move (x1, y1, x2, y2) {
    let parentDivPos = this.parentDiv.position()

    let width = Math.abs(x1 - x2)
    let height = Math.abs(y1 - y2)

    let left = Math.min(x1, x2)
    let top = Math.min(y1, y2)

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
 */

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
    let parentDivPos = this.parentDiv.position()
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
    let rect = event.target.getBoundingClientRect()
    this.pointerX = event.clientX - rect.left
    this.pointerY = event.clientY - rect.top
  }
}

/**
 * PopupText is a little blob of text with a down
 * arrow that can be displayed in a (x, y) position
 * within a parent div denoted by selector
 */

class PopupText {
  constructor (divTag) {
    this.div = $('<div>')
      .css({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'background': 'white',
        'padding': '5',
        'opacity': 0.7,
        'display': 'none',
        'pointer-events': 'none'
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
        'display': 'none',
        'pointer-events': 'none'
      })

    this.parentDiv = $(divTag)
    this.parentDiv.append(this.div)
    this.parentDiv.append(this.arrow)
  }

  move (x, y) {
    let parentDivPos = this.parentDiv.position()
    let width = this.div.innerWidth()
    let height = this.div.innerHeight()

    if (
      (x < 0) ||
      (x > this.parentDiv.width()) ||
      (y < 0) ||
      (y > this.parentDiv.height())) {
      this.hide()
      return
    }

    this.div.css({
      'top': y - height - 50 + 10 + parentDivPos.top,
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
 * A set of pop-up text labels over specified atoms, rendered as
 * DIV text on the DOM on top of Display but using opacity
 * of the given z position of the associated atoms
 */
class AtomLabelsWidget {
  constructor (display) {
    this.display = display
    this.soupView = display.soupView
    this.controller = display.controller
    this.popups = []
  }

  removePopup (i) {
    this.popups[i].remove()
    this.popups.splice(i, 1)
    this.controller.deleteAtomLabel(i)
  }

  createPopup (i) {
    let popup = new PopupText(this.display.divTag)
    popup.div.click(() => { this.removePopup(i) })
    return popup
  }

  draw () {
    let labels = this.soupView.currentView.labels

    if (labels.length > this.popups.length) {
      for (let i = this.popups.length; i < labels.length; i += 1) {
        this.popups.push(this.createPopup(i))
      }
    }

    if (this.popups.length > labels.length) {
      for (let i = this.popups.length - 1; i >= labels.length; i -= 1) {
        this.removePopup(i)
      }
    }

    let atom = this.soupView.soup.getAtomProxy()
    for (let i = 0; i < labels.length; i += 1) {
      atom.iAtom = labels[i].i_atom

      this.popups[i].html(labels[i].text)

      let opacity = 0.7 * this.display.opacity(atom.pos) + 0.2
      this.popups[i].div.css('opacity', opacity)
      this.popups[i].arrow.css('opacity', opacity)

      let v = this.display.posXY(atom.pos)
      this.popups[i].move(v.x, v.y)

      if (!this.display.inZlab(atom.pos)) {
        this.popups[i].div.css('display', 'none')
        this.popups[i].arrow.css('display', 'none')
      }
    }
  }
}

/**
 * Collection of inter-atomic distances to be displayed
 * using a combination of opaque canvas lines and text div
 * tags
 */
class DistanceMeasuresWidget {
  constructor (display) {
    this.distanceMeasures = []
    this.scene = display.displayScene
    this.soupView = display.soupView
    this.controller = display.controller
    this.display = display
    this.parentDiv = $(this.display.divTag)
  }

  removeDistance (i) {
    this.scene.remove(this.distanceMeasures[i].line)
    this.distanceMeasures[i].div.remove()
    this.controller.deleteDistance(i)
    this.distanceMeasures.splice(i, 1)
  }

  createDistanceMeasure (i) {
    let div = $('<div>')
      .css({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'background-color': '#FFDDDD',
        'padding': '5',
        'opacity': 0.7,
        'font-family': 'sans-serif'
      })
    div.click(() => { this.removeDistance(i) })
    this.parentDiv.append(div)

    let geometry = new THREE.Geometry()
    geometry.vertices.push(new THREE.Vector3(0, 0, 0))
    geometry.vertices.push(new THREE.Vector3(1, 1, 1))
    let material = new THREE.LineDashedMaterial({
      color: 0xFF7777,
      dashSize: 3,
      gapSize: 4,
      linewidth: 2
    })
    let line = new THREE.Line(geometry, material)
    this.scene.add(line)

    return { line, div }
  }

  draw () {
    let distances = this.soupView.currentView.distances

    if (distances.length > this.distanceMeasures.length) {
      for (let i = this.distanceMeasures.length; i < distances.length; i += 1) {
        this.distanceMeasures.push(this.createDistanceMeasure(i))
      }
    }

    if (this.distanceMeasures.length > distances.length) {
      for (let i = this.distanceMeasures.length - 1; i >= distances.length; i -= 1) {
        this.removeDistance(i)
      }
    }

    let parentDivPos = this.parentDiv.position()

    let a0 = this.soupView.soup.getAtomProxy()
    let a1 = this.soupView.soup.getAtomProxy()

    for (let i = 0; i < distances.length; i += 1) {
      let distance = distances[i]
      let distanceMeasure = this.distanceMeasures[i]

      let p1 = a0.load(distance.i_atom1).pos
      let p2 = a1.load(distance.i_atom2).pos

      let text = p1.distanceTo(p2).toFixed(1)
      distanceMeasure.div.text(text)

      let m = p1.clone().add(p2).multiplyScalar(0.5)
      let opacity = 0.7 * this.display.opacity(m) + 0.3

      let v = this.display.posXY(m)
      let x = v.x
      let y = v.y

      if ((x < 0) || (x > this.parentDiv.width()) || (y < 0) ||
        (y > this.parentDiv.height())) {
        distanceMeasure.div.hide()
        continue
      }

      let width = distanceMeasure.div.innerHeight()
      let height = distanceMeasure.div.innerWidth()
      distanceMeasure.div.css({
        'top': y - width / 2 + parentDivPos.top,
        'left': x - height / 2 + parentDivPos.left,
        'display': 'block',
        'cursor': 'pointer',
        'opacity': opacity
      })

      distanceMeasure.line.geometry.vertices[0].copy(p1)
      distanceMeasure.line.geometry.vertices[1].copy(p2)

      if (!this.display.inZlab(m)) {
        distanceMeasure.div.css('display', 'none')
      }
    }
  }
}

/**
 * SequenceWidget
 *   - creates a dual band across the top of the selected div
 *     for glProteinDisplay
 *   - the first band is a sequence bar widget
 *   - the second band is a sequence text widget
 *   - these two are integrated so that they share state
 */

class SequenceWidget extends CanvasWrapper {
  constructor (display) {
    super(display.divTag)

    this.display = display
    this.soupView = display.soupView
    this.traces = display.traces

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

    this.residues = []
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
    this.residues.length = 0
    for (let trace of this.traces) {
      for (let i of _.range(trace.points.length)) {
        let iRes = trace.indices[i]
        let residue = trace.getReference(i)

        let entry = {
          iRes,
          ss: residue.ss,
          resId: residue.resId,
          iAtom: residue.iAtom
        }

        let resType = residue.resType
        if (resType in data.resToAa) {
          entry.c = data.resToAa[resType]
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
    if (!util.exists(this.soupView)) {
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
        let color = data.getSsColor(ss).getStyle()
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
    for (let iChar = this.iStartChar; iChar < this.iEndChar; iChar += 1) {
      let residue = this.residues[iChar]
      let x1 = this.iCharToX(iChar)
      let colorStyle = data.getSsColor(residue.ss).getStyle()
      this.fillRect(
        x1, y, this.charWidth, this.charHeight, colorStyle)
      this.text(
        residue.c,
        x1 + this.charWidth / 2, y + this.charHeight / 2,
        '8pt Monospace', 'black', 'center')
    }

    let atom = this.soupView.soup.getAtomProxy(this.soupView.currentView.iAtom)
    for (let iRes = this.iStartChar; iRes < this.iEndChar; iRes++) {
      if (iRes === atom.iRes) {
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

      this.display.setTargetViewFromAtom(this.getCurrIAtom())
      this.draw()
    } else {
      this.iRes = this.xToIChar(this.pointerX)
      this.display.setTargetViewFromAtom(this.getCurrIAtom())
      this.draw()
    }
  }
}

/**
 * ZSlabWidget
 */

class ZSlabWidget extends CanvasWrapper {
  constructor (display) {
    super(display.divTag)
    this.soupView = display.soupView
    this.maxZLength = 0.0
    this.yOffset = 60
    this.div.attr('id', 'zslab')

    this.backColor = 'rgb(150, 150, 150)'
    this.zBackColor = 'rgb(100, 70, 70)'
    this.zFrontColor = 'rgb(150, 90, 90)'
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
    let parentDivPos = this.parentDiv.position()
    let result = parentDivPos.top + this.yOffset
    return result
  }

  height () {
    return this.parentDiv.height() - this.yOffset
  }

  x () {
    let parentDivPos = this.parentDiv.position()
    return this.parentDiv.width() - this.width() + parentDivPos.left
  }

  yToZ (y) {
    let fraction = y / this.height()
    return (0.5 - fraction) * this.maxZLength
  }

  zToY (z) {
    let fraction = z / this.maxZLength
    return (0.5 - fraction) * this.height()
  }

  draw () {
    let protein = this.soupView.soup
    let cameraParams = this.soupView.currentView.cameraParams
    this.maxZLength = 2.0 * protein.maxLength

    let yBack = this.zToY(cameraParams.zBack)
    let yFront = this.zToY(cameraParams.zFront)
    let yMid = this.zToY(0)

    this.fillRect(
      0, 0, this.width(), this.height(), this.backColor)

    this.fillRect(
      0, yBack, this.width(), yMid - yBack, this.zBackColor)

    this.fillRect(
      0, yMid, this.width(), yFront - yMid, this.zFrontColor)

    let font = '12px sans-serif'
    let xm = this.width() / 2

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

    let cameraParams = this.soupView.currentView.cameraParams

    if (this.back) {
      cameraParams.zBack = Math.max(2, this.z)
    } else if (this.front) {
      cameraParams.zFront = Math.min(-2, this.z)
    }
    this.soupView.changed = true
    this.draw()
  }
}

/**
 * GridControlWidget
 */

class GridControlWidget extends CanvasWrapper {
  constructor (display) {
    super(display.divTag)
    this.isGrid = display.isGrid
    this.soupView = display.soupView
    this.buttonHeight = 40
    this.sliderHeight = this.buttonHeight * 6 - 50
    this.div.attr('id', 'grid-control')
    if (!this.isGrid) {
      this.div.css('display', 'none')
    }
    this.div.css('height', this.height())
    this.backgroundColor = '#AAA'
    this.buttonsDiv = $('<div id="grid-control-buttons">')
    this.div.append(this.buttonsDiv)
  }

  reset () {
    if (!this.isGrid) {
      return
    }

    this.buttonsDiv.empty()

    let y = 10
    for (let elem of _.keys(this.soupView.soup.grid.isElem)) {
      this.buttonsDiv.append(this.makeElemButton(elem, y))
      y += this.buttonHeight
    }

    if (_.keys(this.soupView.soup.grid.isElem).length === 0) {
      this.div.hide()
    } else {
      this.div.show()
    }
  }

  makeElemButton (elem, y) {
    let color = data.ElementColors[elem]
    let colorHexStr = color.getHexString()
    let textButton = util.toggleButton(
      'toggle_text',
      elem,
      'jolecule-button',
      () => this.soupView.soup.grid.isElem[elem],
      (b) => {
        this.soupView.soup.grid.isElem[elem] = b
        this.soupView.soup.grid.changed = true
        this.soupView.changed = true
      },
      colorHexStr)
    textButton.css('position', 'absolute')
    textButton.css('top', y + 'px')
    textButton.css('left', '40px')
    textButton.css('width', '20px')
    return textButton
  }

  resize () {
    if (!this.isGrid) {
      return
    }
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
    let grid = this.soupView.soup.grid
    let diff = grid.bMax - grid.bMin
    let z = fraction * diff + grid.bMin
    if (z < this.soupView.soup.grid.bMin) {
      z = this.soupView.soup.grid.bMin
    }
    if (z > this.soupView.soup.grid.bMax) {
      z = this.soupView.soup.grid.bMax
    }
    return z
  }

  zToY (z) {
    let grid = this.soupView.soup.grid
    let diff = grid.bMax - grid.bMin
    return (z - grid.bMin) / diff * this.sliderHeight + 20
  }

  draw () {
    if (!this.isGrid) {
      return
    }

    this.fillRect(0, 0, this.width(), this.height(), this.backgroundColor)

    let xm = 20

    let dark = 'rgb(100, 100, 100)'
    let yTop = this.zToY(this.soupView.soup.grid.bMin)
    let yBottom = this.zToY(this.soupView.soup.grid.bMax)
    this.line(xm, yTop, xm, yBottom, 1, dark)
    this.line(5, yTop, 35, yTop, 1, dark)

    let font = '12px sans-serif'
    let textColor = '#666'
    let y = this.zToY(this.soupView.soup.grid.bCutoff)
    this.fillRect(5, y, 30, 5, textColor)
    this.text(-this.soupView.soup.grid.bCutoff.toFixed(2), xm, y + 15, font, textColor, 'center')
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

    this.soupView.soup.grid.bCutoff = this.z
    this.soupView.soup.grid.changed = true
    this.draw()

    this.soupView.changed = true
  }

  mouseup (event) {
    event.preventDefault()

    this.mousePressed = false
  }
}

export default {
  LineElement,
  PopupText,
  AtomLabelsWidget,
  DistanceMeasuresWidget,
  SequenceWidget,
  ZSlabWidget,
  GridControlWidget
}
