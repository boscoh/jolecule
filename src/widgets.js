/**
 * Widget interface
 *
 * decorated graphical objects on top of ProteinDisplay that are a hybrid
 * of HTML DOM elements and WebGL elements such as lines, atom labels,
 * distance measures, sequence bars, z-slab control, grid controls
 *
 * this.observerReset - called after model rebuild
 * this.draw - called at every draw event
 * this.resize - called after every resize of window
 */

import $ from 'jquery'
import * as THREE from 'three'
import _ from 'lodash'
import select2 from 'select2' // eslint-disable-line no-alert

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
 * CanvasWidget
 *   - abstract class to wrap a canvas2d element
 *   - instantiates an absolute div that fits the $(selector)
 *   - attaches a canvas to this div
 *   - creates methods that redirects mouse commands to that canvas
 */
class CanvasWidget {
  constructor (selector) {
    this.parentDiv = $(selector)

    this.div = $('<div>')
      .css('position', 'absolute')
      .css('position', 'absolute')
      .css('z-index', 100)
      .css('user-select', 'none')

    this.parentDiv.append(this.div)

    this.canvas = $('<canvas>')

    this.div.append(this.canvas)
    this.canvasDom = this.canvas[0]
    this.drawContext = this.canvasDom.getContext('2d')

    this.mousePressed = false
    this.downTimer = null
    const dom = this.canvasDom
    const bind = (ev, fn) => {
      dom.addEventListener(ev, fn)
    }
    bind('mousedown', e => this.mousedown(e))
    bind('mousemove', e => this.mousemove(e))
    bind('mouseup', e => this.mouseup(e))
    bind('mouseout', e => this.mouseout(e))
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

  update () {
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
    this.drawContext.strokeStyle = 'none'
    this.drawContext.fillRect(x, y, w, h)
  }

  line (x1, y1, x2, y2, lineWidth, color) {
    this.drawContext.fillStyle = 'none'
    this.drawContext.strokeStyle = color
    this.drawContext.lineWidth = lineWidth
    this.drawContext.beginPath()
    this.drawContext.moveTo(x1, y1)
    this.drawContext.lineTo(x2, y2)
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

  saveMouse () {
    this.saveMouseX = this.pointerX
    this.saveMouseY = this.pointerY
    this.saveMouseR = this.mouseR
    this.saveMouseT = this.mouseT
  }

  click (event) {
  }

  doubleclick (event) {
  }

  mousedown (event) {
    event.preventDefault()

    this.getPointer(event)
    this.saveMouse()
    this.mousePressed = true

    if (this.downTimer === null) {
      this.downTimer = setTimeout(() => this.click(event), 250)
    } else {
      clearTimeout(this.downTimer)
      this.doubleclick(event)
      this.downTimer = null
    }

    this.mousemove(event)
  }

  mousemove (event) {
  }

  mouseout (event) {
  }

  mouseup (event) {
    event.preventDefault()
    this.mousePressed = false
  }

  getPointer (event) {
    if (util.exists(event.touches) && (event.touches.length > 0)) {
      this.eventX = event.touches[0].clientX
      this.eventY = event.touches[0].clientY
    } else {
      this.eventX = event.clientX
      this.eventY = event.clientY
    }

    let rect = event.target.getBoundingClientRect()
    this.pointerX = this.eventX - rect.left
    this.pointerY = this.eventY - rect.top

    let x = this.pointerX - this.width() / 2
    let y = this.pointerY - this.height() / 2

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
}

/**
 * PopupText is a little blob of text with a down
 * arrow that can be displayed in a (x, y) position
 * within a parent div denoted by selector
 */
class PopupText {
  constructor (divTag, heightArrow) {
    if (_.isUndefined(heightArrow)) {
      this.heightArrow = 30
    } else {
      this.heightArrow = heightArrow
    }

    this.div = $('<div>')
      .css({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'background': 'white',
        'box-sizing': 'border-box',
        'font': '12px Helvetica',
        'color': '#666',
        'padding': '5',
        'opacity': 0.8,
        'display': 'none',
        'z-index': 1000,
        'cursor': 'pointer'
      })

    this.arrow = $('<div>')
      .css({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'width': 0,
        'height': 0,
        'box-sizing': 'border-box',
        'border-left': '5px solid transparent',
        'border-right': '5px solid transparent',
        'border-top': this.heightArrow + 'px solid white',
        'opacity': 0.8,
        'display': 'none',
        'z-index': 1000,
        'pointer-events': 'none'
      })

    this.parentDiv = $(divTag)
    this.parentDiv.append(this.div)
    this.parentDiv.append(this.arrow)
  }

  move (x, y) {
    let parentDivPos = this.parentDiv.position()

    this.div.css({'display': 'block'})
    let rect = this.div[0].getBoundingClientRect()
    let width = rect.width
    let height = rect.height

    this.arrow.css({'display': 'block'})

    if (
      (x < 0) ||
      (x > this.parentDiv.width()) ||
      (y < 0) ||
      (y > this.parentDiv.height())) {
      this.hide()
      return
    }

    this.arrow.css({
      'top': y - this.heightArrow + parentDivPos.top,
      'left': x - 5 + parentDivPos.left,
    })

    this.div.css({
      'top': y - this.heightArrow + parentDivPos.top - height,
      'left': x + parentDivPos.left - width / 2,
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
    this.controller.deleteAtomLabel(i)
    this.popups[i].remove()
    this.popups.splice(i, 1)
  }

  createPopup (i) {
    let popup = new PopupText(this.display.divTag)
    popup.i = i
    popup.div.click(() => { this.removePopup(popup.i) })
    return popup
  }

  drawFrame () {
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
      this.popups[i].i = i

      atom.iAtom = labels[i].i_atom

      this.popups[i].html(labels[i].text)

      let opacity = 0.7 * this.display.opacity(atom.pos) + 0.2
      this.popups[i].div.css('opacity', opacity)
      this.popups[i].arrow.css('opacity', opacity)

      let v = this.display.getPosXY(atom.pos)
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
    this.divs = []
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
    div.i = i
    div.click(() => { this.removeDistance(div.i) })
    this.parentDiv.append(div)

    let geometry = new THREE.Geometry()
    geometry.vertices.push(new THREE.Vector3(0, 0, 0))
    geometry.vertices.push(new THREE.Vector3(1, 1, 1))
    let material = new THREE.LineDashedMaterial({
      color: 0xFF7777,
      dashSize: 3,
      gapSize: 4,
      linewidth: 1
    })
    let line = new THREE.Line(geometry, material)
    line.dontDelete = true
    this.scene.add(line)

    return { line, div }
  }

  drawFrame () {
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
      this.distanceMeasures[i].div.i = i
      let distanceMeasure = this.distanceMeasures[i]

      let p1 = a0.load(distance.i_atom1).pos
      let p2 = a1.load(distance.i_atom2).pos

      let text = p1.distanceTo(p2).toFixed(1)
      distanceMeasure.div.text(text)

      let m = p1.clone().add(p2).multiplyScalar(0.5)
      let opacity = 0.7 * this.display.opacity(m) + 0.3

      let v = this.display.getPosXY(m)
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
class SequenceWidget extends CanvasWidget {
  constructor (selector, display) {
    super(selector)

    this.display = display
    this.soupView = display.soupView
    this.soup = display.soup
    this.controller = display.controller
    this.traces = display.traces
    this.display.addObserver(this)
    this.residue = this.soup.getResidueProxy()

    this.charWidth = 14
    this.charHeight = 15
    this.textXOffset = 0
    this.offsetY = 6
    this.heightStructureBar = 7
    this.spacingY = 12
    this.yTopSequence = this.offsetY + this.heightStructureBar + this.spacingY * 2
    this.yBottom = this.yTopSequence + + this.spacingY*2.7 + this.charHeight
    this.yMidSequence = this.yTopSequence + this.spacingY*1.2 + this.charHeight / 2

    this.backColor = '#CCC'
    this.selectColor = '#FFF'
    this.highlightColor = 'red'
    this.borderColor = '#888'

    this.div.attr('id', 'sequence-widget')
    this.div.css({
      'width': this.parentDiv.width(),
      'height': this.height(),
      'position': 'relative',
      'background-color': '#CCC',
    })

    this.charEntries = []
    this.nChar = null
    this.iChar = null
    this.iCharDisplayStart = null
    this.iCharDisplayEnd = null
    this.nCharDisplay = null

    this.hover = new PopupText('#sequence-widget', 15)
  }

  width () {
    return this.parentDiv.width()
  }

  height () {
    return this.yBottom + 1
  }

  resize () {
    super.resize()
    this.div.css('width', this.parentDiv.width())
  }

  xToI (x) {
    return parseInt((x - this.textXOffset) * this.nChar / this.textWidth())
  }

  iToX (iRes) {
    return parseInt(iRes / this.nChar * this.textWidth()) + this.textXOffset
  }

  textWidth () {
    return this.width() - this.textXOffset
  }

  xToIChar (x) {
    return parseInt((x - this.textXOffset) * this.nCharDisplay / this.textWidth()) + this.iCharDisplayStart
  }

  iCharToX (iRes) {
    return parseInt(
      (iRes - this.iCharDisplayStart) /
        this.nCharDisplay *
      this.textWidth() +
      this.textXOffset)
  }

  rebuild () {
    this.charEntries.length = 0
    let residue = this.soup.getResidueProxy()
    let iChain = -1
    let iStructure = 0
    let nRes = this.soup.getResidueCount()
    let nPadChar = parseInt(0.02 * nRes / this.soup.structureIds.length)
    for (let iRes of _.range(nRes)) {
      residue.iRes = iRes

      if (!residue.isPolymer) {
        continue
      }

      let start = false
      if ((iStructure !== residue.iStructure) || (iChain !== residue.iChain)) {
        start = true
        iChain = residue.iChain
        iStructure = residue.iStructure
        for (let i of _.range(nPadChar)) {
          this.charEntries.push({
            iChain,
            iStructure,
            c: '',
            start: i == 0 ? true : false,
            ss: ''
          })
        }
      }

      let entry = {
        iStructure,
        iChain,
        iRes,
        start,
        ss: residue.ss,
        resId: residue.resId,
        iAtom: residue.iAtom,
        resNum: residue.resNum
      }

      let resType = residue.resType
      if (resType in data.resToAa) {
        entry.c = data.resToAa[resType]
      } else {
        entry.c = '.'
      }

      this.charEntries.push(entry)
    }

    this.nChar = this.charEntries.length
    this.iChar = this.nCharDisplay / 2
    this.iCharDisplayStart = nPadChar
  }

  checkDisplayLimits () {
    this.iCharDisplayStart = Math.max(this.iChar - 0.5 * this.nCharDisplay, 0)
    this.iCharDisplayStart = Math.min(this.iCharDisplayStart, this.nChar - this.nCharDisplay)
    this.iCharDisplayStart = parseInt(this.iCharDisplayStart)
  }

  setIChar (iChar) {
    this.iChar = iChar
    this.checkDisplayLimits()
  }

  getColorStyle (iChar) {
    if (iChar >= this.charEntries.length) {
      return '#000000'
    }
    let iRes = this.charEntries[iChar].iRes
    this.residue.load(iRes)
    if (_.isUndefined(this.residue.activeColor)) {
      return '#000000'
    } else {
      return '#' + this.residue.activeColor.getHexString()
    }
  }

  updateWithoutCheckingCurrent () {
    if (!util.exists(this.soupView)) {
      return
    }

    if (this.charEntries.length === 0) {
      return
    }

    let iAtom = this.soupView.currentView.iAtom
    let iResCurrent = this.soupView.soup.getAtomProxy(iAtom).iRes

    this.nCharDisplay = Math.ceil(this.width() / this.charWidth)

    if (this.iCharDisplayStart + this.nCharDisplay > this.charEntries.length) {
      this.iCharDisplayStart = this.iCharDisplayEnd - this.nCharDisplay
    }
    if (this.iCharDisplayStart < 0) {
      this.iCharDisplayStart = 0
    }
    this.iCharDisplayEnd = this.iCharDisplayStart + this.nCharDisplay

    let yTopStructure = this.offsetY - 2
    let yStructureName = this.offsetY + 7
    let heightStructure = this.yTopSequence - yTopStructure + 2
    let yMidStructure = yTopStructure + heightStructure / 2 + 2
    let heightSequence = this.yBottom - this.yTopSequence

    // draw background
    this.fillRect(
      0, 0, this.width(), this.height(), this.backColor)

    // draw sequence bar background
    this.fillRect(
      0, this.yTopSequence, this.width(), heightSequence, this.selectColor)

    // draw border around sequence bar
    this.line(
      0, this.yTopSequence, this.width(), this.yTopSequence, this.borderColor)
    this.line(
      0, this.yBottom, this.width(), this.yBottom, this.borderColor)

    let x1 = this.iToX(this.iCharDisplayStart)
    let x2 = this.iToX(this.iCharDisplayEnd)

    // draw selected part of structure bar
    this.fillRect(
      x1, yTopStructure, x2 - x1, heightStructure, 1, this.selectColor)

    // draw line through structure bar
    this.line(0, yMidStructure, this.width(), yMidStructure, 1, '#999')

    let colorStyle

    // draw structure color bars
    let ss = this.charEntries[0].ss
    let color = data.getSsColor(ss).getStyle()
    color = this.getColorStyle(0)
    let endColor
    let iStart = 0
    let iEnd = 0
    while (iEnd < this.nChar) {
      iEnd += 1
      endColor = this.getColorStyle(iEnd)
      let isNotEnd =
        (iEnd === this.nChar) ||
        (this.charEntries[iEnd].ss !== ss) ||
        (endColor !== color)
      if (isNotEnd) {
        let x1 = this.iToX(iStart)
        let x2 = this.iToX(iEnd)
        let h = this.heightStructureBar
        let yTop = yMidStructure - h / 2
        if (ss !== '') {
          if (ss !== 'C') {
            yTop -= 2
            h += 2 * 2
          }
          this.fillRect(x1, yTop, x2 - x1, h, color)
        }
        if (iEnd <= this.nChar - 1) {
          iStart = iEnd
          ss = this.charEntries[iEnd].ss
          color = this.getColorStyle(iEnd)
        }
      }
    }

    // draw line through sequence bar
    this.line(0, this.yMidSequence, this.width(), this.yMidSequence, 1, '#999')

    // draw characters for sequence
    for (let iChar = this.iCharDisplayStart; iChar < this.iCharDisplayEnd; iChar += 1) {
      let charEntry = this.charEntries[iChar]
      if (charEntry.c === '') {
        continue
      }
      colorStyle = this.getColorStyle(iChar)

      let xLeft = this.iCharToX(iChar)
      let xRight = this.iCharToX(iChar + 1)
      let width = xRight - xLeft
      let xMid = xLeft + width / 2
      let height = this.charHeight
      let yTop = this.yMidSequence - height / 2
      if (charEntry.ss !== 'C') {
        yTop -= 4
        height += 2*4
      }

      this.fillRect(
        xLeft, yTop, width, height, colorStyle)

      this.text(
        charEntry.c,
        xMid,
        this.yMidSequence,
        '7pt Helvetica',
        'white',
        'center')

      // draw highlight res box
      if ((iResCurrent >= 0) && (iResCurrent === charEntry.iRes)) {
        this.strokeRect(
          xLeft, yTop - 5, width, height + 10, this.highlightColor)
      }

      if ((charEntry.resNum % 20 === 0) || charEntry.start) {
        this.line(
          xLeft, this.yBottom, xLeft, this.yBottom - 6, 1, this.borderColor)
        this.text(
          '' + charEntry.resNum,
          xLeft + 3,
          this.yBottom - 6,
          '7pt Helvetica',
          this.borderColor,
          'left')
      }
    }

    // draw border box around selected region in structure bar
    this.line(
      x1 - 1, yTopStructure, x2 + 1, yTopStructure, 1, this.borderColor)
    this.line(
      x1 - 1, yTopStructure, x1 - 1, this.yTopSequence + 1, 1, this.borderColor)
    this.line(
      x2 + 1, yTopStructure, x2 + 1, this.yTopSequence + 1, 1, this.borderColor)

    // draw structure names
    let iChar = 0
    while (iChar < this.nChar) {
      if (this.charEntries[iChar].start && this.charEntries[iChar].c === '') {
        let x = this.iToX(iChar) + 12
        let res = this.charEntries[iChar]
        let text = this.soup.structureIds[res.iStructure]
        text += ':' + this.soup.chains[res.iChain]
        this.text(text, x, yStructureName, '7pt Helvetica', '#666', 'left')
      }
      iChar += 1
    }
  }

  update () {
    let iAtom = this.soupView.currentView.iAtom
    let iResCurrent = this.soupView.soup.getAtomProxy(iAtom).iRes

    let iCharCurrent = null
    for (let iChar in _.range(this.nChar)) {
      if (this.charEntries[iChar].iRes === iResCurrent) {
        iCharCurrent = iChar
        break
      }
    }

    if (iCharCurrent !== null) {
      if (
        (iCharCurrent < this.iCharDisplayStart) ||
        (iCharCurrent >= (this.iCharDisplayStart + this.nCharDisplay))) {
        this.setIChar(iCharCurrent)
      }
    }

    this.updateWithoutCheckingCurrent()
  }

  getCurrIAtom () {
    return this.charEntries[this.iChar].iAtom
  }

  mousemove (event) {
    this.getPointer(event)
    if (this.pointerY < this.yTopSequence) {
      if (this.mousePressed) {
        // mouse event in structure bar
        this.setIChar(this.xToI(this.pointerX))
        this.updateWithoutCheckingCurrent()
        if (this.charEntries[this.iChar].c !== '') {
          this.controller.setTargetViewByIAtom(this.getCurrIAtom())
        }
      } else {
        this.hover.hide()
        let iChar = this.xToI(this.pointerX)
        let charEntry = this.charEntries[iChar]
        if ('iRes' in charEntry) {
          let res = this.soup.getResidueProxy(charEntry.iRes)
          this.hover.html(res.resId + ':' + res.resType)
          this.hover.move(this.iToX(iChar), 25)
        }
      }
    } else {
      this.hover.hide()
      if (this.pointerY >= this.yTopSequence) {
        let iChar = this.xToIChar(this.pointerX)
        let charEntry = this.charEntries[iChar]
        if ('iRes' in charEntry) {
          let res = this.soup.getResidueProxy(charEntry.iRes)
          this.hover.html(res.resId + ':' + res.resType)
          let x = this.iCharToX(iChar) + this.charWidth / 2
          this.hover.move(x, this.yMidSequence)
        }
      }
      if (this.mousePressed) {
        let iNewChar = this.xToIChar(this.pointerX)
        let iCharDiff = iNewChar - this.iCharPressed
        this.iCharDisplayStart -= iCharDiff
        console.log('SequenceWidget drag', this.iCharPressed, iNewChar, iCharDiff, this.iCharDisplayStart)
        this.updateWithoutCheckingCurrent()
      }
    }
  }

  mouseout () {
    this.hover.hide()
    this.mousePressed = false
  }

  mouseup () {
    this.hover.hide()
    this.mousePressed = false
  }

  doubleclick (event) {
    this.getPointer(event)
    if (this.pointerY >= this.yTopSequence) {
      // mouse event in sequence bar
      this.iChar = this.xToIChar(this.pointerX)
      if (this.iChar === this.iCharPressed) {
        console.log('SequenceWidget.doubleclick', this.iChar)
        if (this.charEntries[this.iChar].c !== '') {
          this.controller.clearSelectedResidues()
          this.controller.setResidueSelect(this.charEntries[this.iChar].iRes, true)
          this.controller.setTargetViewByIAtom(this.getCurrIAtom())
          this.updateWithoutCheckingCurrent()
        }
      }
    }
  }

  click (event) {
    if (this.pointerY >= this.yTopSequence) {
      let iRes = this.charEntries[this.iCharPressed].iRes
      console.log('SequenceWidget.click', this.iChar)
      if (!event.metaKey && !event.shiftKey) {
        this.controller.selectResidue(iRes)
      } else if (event.shiftKey) {
        this.controller.selectAdditionalRangeToResidue(iRes)
      } else {
        this.controller.selectAdditionalResidue(iRes)
      }
      this.updateWithoutCheckingCurrent()
    }
  }

  mousedown (event) {
    event.preventDefault()

    this.getPointer(event)
    this.saveMouse()
    this.mousePressed = true

    this.iChar = this.xToIChar(this.pointerX)

    if ((this.downTimer !== null) && (this.iChar === this.iCharPressed)) {
      clearTimeout(this.downTimer)
      this.doubleclick(event)
      this.downTimer = null
    } else {
      this.downTimer = setTimeout(() => this.click(event), 250)
    }

    this.iCharPressed = this.iChar
    this.mousemove(event)
  }
}

/**
 * ZSlabWidget
 */
class ZSlabWidget extends CanvasWidget {
  constructor (display, selector) {
    super(selector)
    this.soupView = display.soupView
    this.controller = display.controller
    display.addObserver(this)
    this.maxZLength = 0.0
    this.div.css('box-sizing', 'border-box')
    this.zFrontColor = 'rgb(150, 90, 90)'
  }

  resize () {
    this.div.css({
      'width': this.width(),
      'height': this.height(),
    })
    super.resize()
    this.update()
  }

  x () {
    return 0
  }

  y () {
    return 0
  }

  width () {
    let box = this.parentDiv[0].getBoundingClientRect()
    return box.width - 20
  }

  height () {
    return this.parentDiv.height()
  }

  xToZ (x) {
    let fraction = x / this.width()
    return (0.5 - fraction) * this.maxZLength
  }

  zToX (z) {
    let fraction = z / this.maxZLength
    return (0.5 - fraction) * this.width()
  }

  update () {
    let soup = this.soupView.soup
    let cameraParams = this.soupView.currentView.cameraParams
    this.maxZLength = 2 * soup.maxLength

    let xBack = this.zToX(cameraParams.zBack)
    let xFront = this.zToX(cameraParams.zFront)
    let xMid = this.zToX(0)
    let yMid = this.height() / 2

    // background
    this.fillRect(0, 0, this.width(), this.height(), '#999')

    // middle track
    this.fillRect(0, yMid - 3, this.width(), 6, '#AAB')

    this.fillRect(xMid, yMid - 3, xBack - xMid, 6, this.zFrontColor)
    this.fillRect(xBack - 5, 0, 4, this.height(), '#333')

    this.fillRect(xFront, yMid - 3, xMid - xFront, 6, this.zFrontColor)
    this.fillRect(xFront + 1, 0, 4, this.height(), '#333')

    // halfway marker
    this.line(xMid, 0, xMid, this.height(), 1, '#444')

    this.text(
      'back',
      xBack - 30,
      yMid,
      '7pt Helvetica',
      '#333',
      'left')

    this.text(
      'front',
      xFront + 8,
      yMid,
      '7pt Helvetica',
      '#333',
      'left')

  }

  getZ (event) {
    this.getPointer(event)
    this.z = this.xToZ(this.pointerX)
  }

  mousedown (event) {
    console.log('ZSlab.mousedown')
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
    super.mousemove(event)

    console.log('ZSlab.mousemove', this.mousePressed)

    if (!this.mousePressed) {
      return
    }

    this.getZ(event)

    let cameraParams = this.soupView.currentView.cameraParams
    let zBack = cameraParams.zBack
    let zFront = cameraParams.zFront
    if (this.back) {
      this.controller.setZoom(Math.max(2, this.z), zFront)
    } else if (this.front) {
      this.controller.setZoom(zBack, Math.min(-2, this.z))
    }
    this.update()
  }
}

class GridToggleButtonWidget {
  constructor (display, selector, elem, x, y, color) {
    this.soupView = display.soupView
    this.controller = display.controller
    this.elem = elem
    this.color = color
    this.div = $(selector)
      .text(elem)
      .addClass('jolecule-button')
      .css('position', 'absolute')
      .css('top', y + 'px')
      .css('left', x + 'px')
      .css('height', '15px')
      .css('width', '20px')
      .on('click touch', (e) => {
        e.preventDefault()
        this.toggle()
      })
    this.update()
    display.addObserver(this)
  }

  getToggle () {
    return this.soupView.soup.grid.isElem[this.elem]
  }

  toggle () {
    this.controller.toggleGridElem(this.elem)
    this.update()
  }

  update () {
    if (this.getToggle()) {
      if (this.color) {
        this.div.css('background-color', this.color)
      } else {
        this.div.addClass('jolecule-button-toggle-on')
      }
    } else {
      if (this.color) {
        this.div.css('background-color', '')
      } else {
        this.div.removeClass('jolecule-button-toggle-on')
      }
    }
  }
}

/**
 * GridControlWidget
 */
class GridControlWidget extends CanvasWidget {
  constructor (display) {
    super(display.divTag)

    this.display = display
    this.soupView = display.soupView
    this.controller = display.controller
    display.addObserver(this)

    this.backgroundColor = '#999'
    this.buttonHeight = 40
    this.sliderHeight = this.buttonHeight * 6 - 30
    this.isGrid = display.isGrid

    if (!this.isGrid) {
      this.div.css('display', 'none')
    }
    this.div.attr('id', 'grid-control')
    this.div.css('height', this.height())
    this.div.addClass('jolecule-residue-selector')
    this.buttonsDiv = $('<div id="grid-control-buttons">')
    this.div.append(this.buttonsDiv)
  }

  rebuild () {
    if (!this.isGrid) {
      return
    }

    this.buttonsDiv.empty()

    let y = 10
    for (let elem of _.keys(this.soupView.soup.grid.isElem)) {
      this.makeElemButton(elem, y)
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
    let colorHexStr = '#' + color.getHexString()
    let id = 'grid-button-' + elem.toLowerCase()
    let selector = `#${id}`
    this.buttonsDiv.append($(`<div id="${id}">`))
    new GridToggleButtonWidget(
      this.display, selector, elem, 50, y, colorHexStr)
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
    return parentDivPos.left + 5
  }

  y () {
    let parentDivPos = this.parentDiv.position()
    return parentDivPos.top + 20
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

  update () {
    if (!this.isGrid) {
      return
    }

    this.fillRect(0, 0, this.width(), this.height(), this.backgroundColor)

    let xm = 20

    let dark = 'rgb(100, 100, 100)'
    let yTop = this.zToY(this.soupView.soup.grid.bMin)
    let yBottom = this.zToY(this.soupView.soup.grid.bMax)

    // middle track
    this.fillRect(xm - 3, yTop, 6, yBottom - yTop, '#AAB')


    let font = '10px sans-serif'
    let textColor = '#333'

    let y = this.zToY(this.soupView.soup.grid.bCutoff)
    let text = this.soupView.soup.grid.convertB(this.soupView.soup.grid.bCutoff).toFixed(2)

    // fill to bottom
    this.fillRect(xm - 3, y, 6, yBottom - y, 'rgb(150, 90, 90)')

    // slider
    this.fillRect(5, y, 30, 5, textColor)
    this.text(text, xm, y - 8, font, textColor, 'center')

    // bottom marker
    this.line(5, yBottom, 35, yBottom, 1, '#666')

    text = this.soupView.soup.grid.convertB(this.soupView.soup.grid.bMax).toFixed(2)
    this.text(text, xm, yBottom + 6, font, textColor, 'center')

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
    this.controller.setGridCutoff(this.z)
    this.update()

  }

  mouseup (event) {
    event.preventDefault()

    this.mousePressed = false
  }
}

class ResidueSelectorWidget {
  constructor (display, selector) {
    this.scene = display.displayScene
    this.controller = display.controller
    this.soupView = display.soupView
    this.display = display
    this.display.addObserver(this)

    this.div = $(selector)
    this.divTag = '#residue-select'
    let $elem = $('<select id="residue-select">')
    this.div.append($elem)
    $elem.select2()
  }

  change () {
    let iRes = parseInt(this.$elem.select2('val'))
    let residue = this.soupView.soup.getResidueProxy(iRes)
    this.controller.setTargetViewByIAtom(residue.iAtom)
  }

  rebuild () {
    // clear selector
    this.$elem = $(this.divTag)
    this.$elem.empty()

    // rebuild selector
    this.soup = this.soupView.soup
    let residue = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (_.includes(['HOH', 'XXX'], residue.resType)) {
        continue
      }
      let text = residue.resId + '-' + residue.resType
      this.$elem.append(new Option(text, `${iRes}`))
    }

    // observerReset using select2
    this.$elem.select2({width: '150px'})
    this.$elem.on('select2:select', () => { this.change() })
  }

  update () {
    if (this.$elem) {
      let iAtom = this.soupView.currentView.iAtom
      let iRes = this.soupView.soup.getAtomProxy(iAtom).iRes
      this.$elem.val(`${iRes}`).trigger('change')
    }
  }
}

class ToggleButtonWidget {
  constructor (display, selector, option) {
    this.controller = display.controller
    this.display = display
    if (option) {
      this.option = option
    }
    this.div = $(selector)
      .attr('href', '')
      .html(_.capitalize(option))
      .addClass('jolecule-button')
      .on('click touch', (e) => {
        e.preventDefault()
        this.callback()
      })
    this.display.addObserver(this)
  }

  callback () {
    let newOptionVal = !this.controller.getShowOption(this.option)
    this.controller.setShowOption(this.option, newOptionVal)
    if ((this.option === 'sidechains') && (newOptionVal === false)) {
      this.controller.clearSidechainResidues()
    }
    this.update()
  }

  update () {
    if (this.controller.getShowOption(this.option)) {
      if (!this.div.hasClass('jolecule-button-toggle-on')) {
        this.div.addClass('jolecule-button-toggle-on')
      }
    } else {
      if (this.div.hasClass('jolecule-button-toggle-on')) {
        this.div.removeClass('jolecule-button-toggle-on')
      }
    }
  }
}

class TogglePlayButtonWidget {
  constructor (display, selector) {
    this.controller = display.controller
    this.display = display
    this.div = $(selector)
      .attr('href', '')
      .html('Play')
      .addClass('jolecule-button')
      .on('click touch', (e) => { this.callback(e) })
    this.display.addObserver(this)
  }

  callback (e) {
    e.preventDefault()
    this.controller.setLoop(!this.controller.getLoop())
  }

  update () {
    if (this.controller.getLoop()) {
      if (!this.div.hasClass('jolecule-button-toggle-on')) {
        this.div.addClass('jolecule-button-toggle-on')
      }
    } else {
      if (this.div.hasClass('jolecule-button-toggle-on')) {
        this.div.removeClass('jolecule-button-toggle-on')
      }
    }
  }
}

export default {
  LineElement,
  PopupText,
  AtomLabelsWidget,
  DistanceMeasuresWidget,
  SequenceWidget,
  ZSlabWidget,
  GridControlWidget,
  ResidueSelectorWidget,
  ToggleButtonWidget,
  TogglePlayButtonWidget
}
