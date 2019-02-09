/**
 * Widget interface
 *
 * Widgets - abstact data structures for decorators to
 * be displayed on the DOM to support the main
 * embeddged widget of Jolecule.
 *
 * The structure of a Widget takes a Display object
 * in the constructor, which allows access to a full
 * SoupView object, with its attendant Controller.
 *
 * props:
 *   div: a Jquery DOM element where the Widget is attached
 *        could be a Canvas or a Div etc.
 *
 * methods
 *   resize (): called when the browser window changes
 *   rebuild (): called when underlying Soup is modified
 *   update (): called when SoupWidget goes through a rendering change
 *   drawFrame (): called every animation frame
 */

import $ from 'jquery'
import * as THREE from 'three'
import _ from 'lodash'

// to support cross-browser styled drop-down selectors
import 'select2' // eslint-disable-line no-alert
import '../dist/select2.css' // eslint-disable-line no-alert

import * as data from './data'
import * as util from './util'

/**
 * LineElement
 * - instantiates a DOM object is to draw a line between (x1, y1) and
 *   (x2, y2) within a jquery div
 * - used to display the mouse tool for making distance labels
 */
class LineElement {
  constructor(soupWidget, color) {
    this.color = color

    this.div = $('<canvas>').css({
      position: 'absolute',
      'z-index': '1',
      display: 'none',
      'pointer-events': 'none'
    })

    this.canvas = this.div[0]
    this.context2d = this.canvas.getContext('2d')

    this.parentDiv = $(soupWidget.divTag)
    this.parentDiv.append(this.div)
  }

  hide() {
    this.div.css('display', 'none')
  }

  move(x1, y1, x2, y2) {
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
  constructor(selector) {
    this.parentDiv = $(selector)
    this.parentDivId = this.parentDiv.attr('id')

    this.div = $('<div>')
      .css('user-select', 'none')
      .css('position', 'absolute')

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

  width() {
    return this.parentDiv.width()
  }

  height() {
    return this.parentDiv.height()
  }

  x() {
    let parentDivPos = this.parentDiv.position()
    return parentDivPos.left
  }

  y() {
    let parentDivPos = this.parentDiv.position()
    return parentDivPos.top
  }

  inside(x, y) {
    return (
      x >= this.x() &&
      x <= this.x() + this.width() &&
      y >= this.y() &&
      y <= this.y() + this.height()
    )
  }

  update() {}

  resize() {
    this.canvasDom.width = this.width()
    this.canvasDom.height = this.height()
  }

  strokeRect(x, y, w, h, strokeStyle) {
    this.drawContext.strokeStyle = strokeStyle
    this.drawContext.strokeRect(x, y, w, h)
  }

  fillRect(x, y, w, h, fillStyle) {
    this.drawContext.fillStyle = fillStyle
    this.drawContext.strokeStyle = 'none'
    this.drawContext.fillRect(x, y, w, h)
  }

  line(x1, y1, x2, y2, lineWidth, color) {
    this.drawContext.fillStyle = color
    this.drawContext.strokeStyle = color
    this.drawContext.beginPath()
    this.drawContext.lineWidth = lineWidth
    this.drawContext.moveTo(x1, y1)
    this.drawContext.lineTo(x2, y2)
    this.drawContext.stroke()
  }

  text(text, x, y, font, color, align) {
    this.drawContext.fillStyle = color
    this.drawContext.font = font
    this.drawContext.textAlign = align
    this.drawContext.textBaseline = 'middle'
    this.drawContext.fillText(text, x, y)
  }

  textWidth(text, font) {
    this.drawContext.font = font
    this.drawContext.textAlign = 'center'
    return this.drawContext.measureText(text).width
  }

  saveMouse() {
    this.saveMouseX = this.pointerX
    this.saveMouseY = this.pointerY
    this.saveMouseR = this.mouseR
    this.saveMouseT = this.mouseT
  }

  click(event) {}

  doubleclick(event) {}

  mousedown(event) {
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

  mousemove(event) {}

  mouseout(event) {}

  mouseup(event) {
    event.preventDefault()
    this.mousePressed = false
  }

  getPointer(event) {
    if (util.exists(event.touches) && event.touches.length > 0) {
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
  constructor(divTag, heightArrow) {
    if (_.isUndefined(heightArrow)) {
      this.heightArrow = 30
    } else {
      this.heightArrow = heightArrow
    }

    this.div = $('<div>').css({
      position: 'absolute',
      top: 0,
      left: 0,
      background: 'white',
      'box-sizing': 'border-box',
      font: '12px Helvetica',
      color: '#666',
      padding: '5',
      opacity: 0.8,
      display: 'none',
      'z-index': 1,
      cursor: 'pointer',
      'user-select': 'none',
      'pointer-events': 'none'
    })

    this.arrow = $('<div>').css({
      position: 'absolute',
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      'box-sizing': 'border-box',
      'border-left': '5px solid transparent',
      'border-right': '5px solid transparent',
      'border-top': this.heightArrow + 'px solid white',
      opacity: 0.8,
      display: 'none',
      'z-index': 1,
      'pointer-events': 'none',
      'user-select': 'none'
    })

    this.parentDiv = $(divTag)
    this.parentDiv.append(this.div)
    this.parentDiv.append(this.arrow)
  }

  move(x, y) {
    let parentDivPos = this.parentDiv.position()

    this.div.css({ display: 'block' })
    let rect = this.div[0].getBoundingClientRect()
    let width = rect.width
    let height = rect.height

    this.arrow.css({ display: 'block' })

    if (
      x < 0 ||
      x > this.parentDiv.width() ||
      y < 0 ||
      y > this.parentDiv.height()
    ) {
      this.hide()
      return
    }

    this.arrow.css({
      top: y - this.heightArrow + parentDivPos.top,
      left: x - 5 + parentDivPos.left
    })

    this.div.css({
      top: y - this.heightArrow + parentDivPos.top - height,
      left: x + parentDivPos.left - width / 2
    })
  }

  hide() {
    this.div.css('display', 'none')
    this.arrow.css('display', 'none')
  }

  html(text) {
    this.div.html(text)
  }

  remove() {
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
  constructor(soupWidget) {
    this.soupWidget = soupWidget
    this.soupView = soupWidget.soupView
    this.controller = soupWidget.controller
    this.popups = []
  }

  removePopup(i) {
    this.controller.deleteAtomLabel(i)
    this.popups[i].remove()
    this.popups.splice(i, 1)
  }

  createPopup(i) {
    let popup = new PopupText(this.soupWidget.divTag)
    popup.i = i
    popup.div.css('pointer-events', 'auto')
    popup.div.click(() => {
      this.removePopup(popup.i)
    })
    return popup
  }

  drawFrame() {
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

      let opacity = 0.7 * this.soupWidget.opacity(atom.pos) + 0.2
      this.popups[i].div.css('opacity', opacity)
      this.popups[i].arrow.css('opacity', opacity)

      let v = this.soupWidget.getPosXY(atom.pos)
      this.popups[i].move(v.x, v.y)

      if (!this.soupWidget.inZlab(atom.pos)) {
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
  constructor(soupWidget) {
    this.distanceMeasures = []
    this.scene = soupWidget.displayScene
    this.soupView = soupWidget.soupView
    this.controller = soupWidget.controller
    this.soupWidget = soupWidget
    this.parentDiv = $(this.soupWidget.divTag)
    this.divs = []
  }

  removeDistance(i) {
    this.scene.remove(this.distanceMeasures[i].line)
    this.distanceMeasures[i].div.remove()
    this.controller.deleteDistance(i)
    this.distanceMeasures.splice(i, 1)
  }

  createDistanceMeasure(i) {
    let div = $('<div>').css({
      position: 'absolute',
      top: 0,
      left: 0,
      'background-color': '#FFDDDD',
      padding: '5',
      opacity: 0.7,
      'font-family': 'sans-serif'
    })
    div.i = i
    div.click(() => {
      this.removeDistance(div.i)
    })
    this.parentDiv.append(div)

    let geometry = new THREE.Geometry()
    geometry.vertices.push(new THREE.Vector3(0, 0, 0))
    geometry.vertices.push(new THREE.Vector3(1, 1, 1))
    let material = new THREE.LineDashedMaterial({
      color: 0xff7777,
      dashSize: 3,
      gapSize: 4,
      linewidth: 1
    })
    let line = new THREE.Line(geometry, material)
    line.dontDelete = true
    this.scene.add(line)

    return { line, div }
  }

  drawFrame() {
    let distances = this.soupView.currentView.distances

    if (distances.length > this.distanceMeasures.length) {
      for (let i = this.distanceMeasures.length; i < distances.length; i += 1) {
        this.distanceMeasures.push(this.createDistanceMeasure(i))
      }
    }

    if (this.distanceMeasures.length > distances.length) {
      for (
        let i = this.distanceMeasures.length - 1;
        i >= distances.length;
        i -= 1
      ) {
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

      let m = p1
        .clone()
        .add(p2)
        .multiplyScalar(0.5)
      let opacity = 0.7 * this.soupWidget.opacity(m) + 0.3

      let v = this.soupWidget.getPosXY(m)
      let x = v.x
      let y = v.y

      if (
        x < 0 ||
        x > this.parentDiv.width() ||
        y < 0 ||
        y > this.parentDiv.height()
      ) {
        distanceMeasure.div.hide()
        continue
      }

      let width = distanceMeasure.div.innerHeight()
      let height = distanceMeasure.div.innerWidth()
      distanceMeasure.div.css({
        top: y - width / 2 + parentDivPos.top,
        left: x - height / 2 + parentDivPos.left,
        display: 'block',
        cursor: 'pointer',
        opacity: opacity
      })

      distanceMeasure.line.geometry.vertices[0].copy(p1)
      distanceMeasure.line.geometry.vertices[1].copy(p2)

      if (!this.soupWidget.inZlab(m)) {
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
  constructor(selector, soupWidget) {
    super(selector)

    this.soupWidget = soupWidget
    this.soupView = soupWidget.soupView
    this.soup = soupWidget.soup
    this.controller = soupWidget.controller
    this.soupWidget.addObserver(this)
    this.residue = this.soup.getResidueProxy()

    this.charWidth = 14
    this.charHeight = 15
    this.offsetY = 6
    this.heightStructureBar = 7
    this.spacingY = 12
    this.yTopSequence =
      this.offsetY + this.heightStructureBar + this.spacingY * 2
    this.yBottom = this.yTopSequence + +this.spacingY * 2.7 + this.charHeight
    this.yMidSequence =
      this.yTopSequence + this.spacingY * 1.2 + this.charHeight / 2

    this.unclickableColor = '#AAA'
    this.structBarBgroundColor = '#CCC'
    this.seqBarBgroundColor = '#FFF'
    this.highlightColor = 'red'
    this.borderColor = '#999'

    this.div.attr('id', `${this.parentDivId}-inner`)
    this.div.css({
      width: this.parentDiv.width(),
      height: this.height(),
      position: 'relative',
      'background-color': '#CCC'
    })

    this.isWaitForDoubleClick = false
    this.charEntries = []
    this.nChar = null

    this.iCharSeqStart = null
    this.iCharSeqEnd = null
    this.nCharSeq = null

    this.iCharStructStart = null
    this.iCharStructEnd = null
    this.nCharStruct = null

    this.nPadChar = 0 // number of padding entries to delineate chains

    this.hover = new PopupText(`#${this.parentDivId}`, 15)

    this.pressSection = 'none'
  }

  width() {
    return this.parentDiv.width()
  }

  height() {
    return this.yBottom + 1
  }

  resize() {
    super.resize()
    this.div.css('width', this.parentDiv.width())
  }

  iCharFromXStruct(x) {
    return (
      parseInt((x * this.nCharStruct) / this.textWidth()) +
      this.iCharStructStart
    )
  }

  xStructFromIChar(iRes) {
    return parseInt(
      ((iRes - this.iCharStructStart) / this.nCharStruct) * this.textWidth()
    )
  }

  textWidth() {
    return this.width()
  }

  iCharFromXSeq(x) {
    return parseInt((x * this.nCharSeq) / this.textWidth()) + this.iCharSeqStart
  }

  xSeqFromIChar(iRes) {
    return parseInt(
      ((iRes - this.iCharSeqStart) / this.nCharSeq) * this.textWidth()
    )
  }

  calcNPad() {
    let polymerLengths = []
    for (let i of _.range(this.soup.structureIds.length)) {
      polymerLengths.push(0)
    }
    let residue = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.isPolymer) {
        polymerLengths[residue.iStructure] += 1
      }
    }
    polymerLengths = _.filter(polymerLengths, l => l > 0)
    let averageLength = _.mean(polymerLengths)
    this.nPadChar = parseInt(0.02 * averageLength)
  }

  rebuild() {
    this.charEntries.length = 0
    this.calcNPad()

    let iChain = -1
    let iStructure = 0

    let residue = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes

      if (!residue.isPolymer) {
        continue
      }

      if (iStructure !== residue.iStructure || iChain !== residue.iChain) {
        iChain = residue.iChain
        iStructure = residue.iStructure
        for (let i of _.range(this.nPadChar)) {
          let startLabel = null
          if (i === 0) {
            startLabel = this.soup.structureIds[iStructure]
            startLabel += ':' + this.soup.chains[iChain]
          }
          this.charEntries.push({
            chain: residue.chain,
            iStructure,
            c: '',
            startLabel,
            iRes: null,
            ss: ''
          })
        }
      }

      let entry = {
        iStructure,
        chain: residue.chain,
        iRes,
        startLabel: null,
        ss: residue.ss,
        label: residue.resId + ':' + residue.resType,
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
    this.iCharSeqStart = this.nPadChar
    this.iCharStructStart = 0
    this.nCharStruct = this.nChar
    this.iCharStructEnd = this.nChar
  }

  centerSeqOnIChar(iChar) {
    this.iCharSeqStart = Math.max(iChar - 0.5 * this.nCharSeq, 0)
    this.iCharSeqStart = Math.min(
      this.iCharSeqStart,
      this.nChar - this.nCharSeq
    )
    this.iCharSeqStart = parseInt(this.iCharSeqStart)
    this.iCharSeqEnd = this.iCharSeqStart + this.nCharSeq
  }

  getColorStyle(iChar) {
    if (iChar >= this.charEntries.length) {
      return this.unclickableColor
    }
    let iRes = this.charEntries[iChar].iRes
    if (_.isNil(iRes)) {
      return this.unclickableColor
    }
    this.residue.load(iRes)
    if (_.isNil(this.residue.activeColor)) {
      return this.unclickableColor
    } else {
      return '#' + this.residue.activeColor.getHexString()
    }
  }

  findFirstResidue(iCharStart) {
    for (let iChar = iCharStart; iChar < this.nChar - 1; iChar += 1) {
      let charEntry = this.charEntries[iChar + 1]
      if (!_.isNil(charEntry.iRes)) {
        return iChar
      }
    }
    return null
  }

  checkChain() {
    this.nCharSeq = Math.ceil(this.width() / this.charWidth)

    let nCharStructOld = this.nCharStruct
    let oldChain = this.chain

    // Set structure bar to full length
    this.iCharStructStart = 0
    this.nCharStruct = this.charEntries.length
    this.iCharStructEnd = this.iCharStructStart + this.nCharStruct

    if (this.soupView.getMode() === 'chain') {
      let chainEntry = this.soup.getIStructureAndChain()

      if (_.isNil(chainEntry)) {
        this.chain = null
      } else {
        this.iCharStructStart = null
        for (let iChar of _.range(this.charEntries.length)) {
          let charEntry = this.charEntries[iChar]
          if (
            charEntry.iStructure === chainEntry.iStructure &&
            charEntry.chain === chainEntry.chain
          ) {
            if (_.isNil(this.iCharStructStart)) {
              this.iCharStructStart = iChar
              this.chain = charEntry.chain
            }
            this.iCharStructEnd = iChar + 1
          }
        }
        this.nCharStruct = this.iCharStructEnd - this.iCharStructStart

        if (_.isNil(oldChain) && !_.isNil(this.chain)) {
          for (
            let iChar = this.iCharStructStart;
            iChar < this.iCharStructEnd;
            iChar += 1
          ) {
            if (_.has(this.charEntries[iChar], 'iRes')) {
              this.iCharSeqStart = iChar
              this.iCharSeqEnd = this.iCharSeqStart + this.nCharSeq
              break
            }
          }
        } else {
          if (
            this.iCharSeqStart < this.iCharStructStart ||
            this.iCharSeqStart >= this.iCharStructEnd
          ) {
            let iCharSeqStart = this.findFirstResidue(this.iCharStructStart)
            if (_.isNil(iCharSeqStart)) {
              this.iCharSeqStart = this.iCharStructStart
            } else {
              this.iCharSeqStart = iCharSeqStart
            }
            this.iCharSeqEnd = this.iCharSeqStart + this.nCharSeq
          }
        }
      }
    }

    // Sanity checks for sequence bar to stay within the sequence
    if (this.iCharSeqStart + this.nCharSeq > this.charEntries.length) {
      this.iCharSeqStart = this.iCharSeqEnd - this.nCharSeq
    }
    if (this.iCharSeqStart < 0) {
      this.iCharSeqStart = 0
    }
    this.iCharSeqEnd = this.iCharSeqStart + this.nCharSeq
  }

  /**
   * Draw when updated from 3D display or mouse activity
   */
  draw() {
    this.checkChain()

    let yTopStructure = this.offsetY - 2
    let yStructureName = this.offsetY + 7
    let heightStructure = this.yTopSequence - yTopStructure + 2
    let yMidStructure = yTopStructure + heightStructure / 2 + 2
    let heightSequence = this.yBottom - this.yTopSequence

    // draw background
    this.fillRect(0, 0, this.width(), this.height(), this.structBarBgroundColor)

    // draw sequence bar background
    this.fillRect(
      0,
      this.yTopSequence,
      this.width(),
      heightSequence,
      this.seqBarBgroundColor
    )

    // draw border around sequence bar
    this.line(
      0,
      this.yTopSequence,
      this.width(),
      this.yTopSequence,
      1,
      this.borderColor
    )
    this.line(0, this.yBottom, this.width(), this.yBottom, 1, this.borderColor)

    if (!util.exists(this.soupView)) {
      return
    }

    if (this.charEntries.length === 0) {
      return
    }

    let iAtom = this.soupView.currentView.iAtom
    let iResCurrent = this.soupView.soup.getAtomProxy(iAtom).iRes

    let x1 = this.xStructFromIChar(this.iCharSeqStart)
    let x2 = this.xStructFromIChar(this.iCharSeqEnd)

    // draw background of selected part of structure bar
    this.fillRect(
      x1,
      yTopStructure,
      x2 - x1,
      heightStructure,
      this.seqBarBgroundColor
    )

    // draw line through structure bar
    this.line(
      0,
      yMidStructure,
      this.width(),
      yMidStructure,
      1,
      this.borderColor
    )

    let colorStyle

    // draw structure color bars
    let ss = this.charEntries[0].ss
    let c = this.charEntries[0].c
    let color = this.getColorStyle(0)
    let endColor
    let iStart = 0
    let iEnd = 0
    while (iEnd < this.nChar) {
      iEnd += 1
      endColor = this.getColorStyle(iEnd)
      let charEntry = this.charEntries[iEnd]
      let isEndOfSegment =
        _.isNil(charEntry) ||
        iEnd === this.nChar ||
        charEntry.ss !== ss ||
        endColor !== color
      if (isEndOfSegment) {
        let x1 = this.xStructFromIChar(iStart)
        let x2 = this.xStructFromIChar(iEnd)
        let h = this.heightStructureBar
        let yTop = yMidStructure - h / 2
        if (c !== '') {
          if (ss !== 'C' && ss !== '.') {
            yTop -= 2
            h += 2 * 2
          }
          this.fillRect(x1, yTop, x2 - x1, h, color)
        }
        if (iEnd <= this.nChar - 1) {
          iStart = iEnd
          ss = charEntry.ss
          c = charEntry.c
          color = endColor
        }
      }
    }

    // draw line through sequence bar
    this.line(
      0,
      this.yMidSequence,
      this.width(),
      this.yMidSequence,
      1,
      this.borderColor
    )

    // draw characters for sequence
    for (let iChar = this.iCharSeqStart; iChar < this.iCharSeqEnd; iChar += 1) {
      let charEntry = this.charEntries[iChar]
      if (_.isUndefined(charEntry) || charEntry.c === '') {
        continue
      }

      colorStyle = this.getColorStyle(iChar)

      let xLeft = this.xSeqFromIChar(iChar)
      let xRight = this.xSeqFromIChar(iChar + 1)
      let width = xRight - xLeft
      let xMid = xLeft + width / 2
      let height = this.charHeight
      let yTop = this.yMidSequence - height / 2
      if (charEntry.ss !== 'C' && charEntry.ss !== '.') {
        yTop -= 4
        height += 2 * 4
      }

      this.fillRect(xLeft, yTop, width, height, colorStyle)

      this.text(
        charEntry.c,
        xMid,
        this.yMidSequence,
        '7pt Helvetica',
        'white',
        'center'
      )

      // draw highlight res box
      if (this.soupWidget.isCrossHairs) {
        if (iResCurrent >= 0 && iResCurrent === charEntry.iRes) {
          this.strokeRect(
            xLeft,
            yTop - 5,
            width,
            height + 10,
            this.highlightColor
          )
        }
      }

      // draw numbered ticks
      if (charEntry.resNum % 20 === 0 || charEntry.resNum === 1) {
        this.line(
          xLeft,
          this.yBottom,
          xLeft,
          this.yBottom - 6,
          1,
          this.borderColor
        )
        this.text(
          '' + charEntry.resNum,
          xLeft + 3,
          this.yBottom - 6,
          '7pt Helvetica',
          this.borderColor,
          'left'
        )
      }
    }

    // draw border box around selected region in structure bar
    this.line(x1 - 1, yTopStructure, x2 + 1, yTopStructure, 1, this.borderColor)
    this.line(
      x1 - 1,
      yTopStructure,
      x1 - 1,
      this.yTopSequence + 1,
      1,
      this.borderColor
    )
    this.line(
      x2 + 1,
      yTopStructure,
      x2 + 1,
      this.yTopSequence + 1,
      1,
      this.borderColor
    )

    // draw structure names
    let iChar = 0
    while (iChar < this.nChar) {
      if (this.charEntries[iChar].startLabel) {
        let x = this.xStructFromIChar(iChar) + 12
        this.text(
          this.charEntries[iChar].startLabel,
          x,
          yStructureName,
          '7pt Helvetica',
          '#666',
          'left'
        )
      }
      iChar += 1
    }
  }

  update() {
    let iAtom = _.get(this.soupView, 'targetView.iAtom')
    let iResCurrent = this.soupView.soup.getAtomProxy(iAtom).iRes

    if (!_.isNil(iResCurrent)) {
      for (let iChar in _.range(this.nChar)) {
        if (this.charEntries[iChar].iRes === iResCurrent) {
          if (
            iChar < this.iCharSeqStart ||
            iChar >= this.iCharSeqStart + this.nCharSeq
          ) {
            this.centerSeqOnIChar(iChar)
          }
          break
        }
      }
    }

    this.draw()
  }

  mousemove(event) {
    this.getPointer(event)

    if (this.pointerY < this.yTopSequence) {
      this.hover.hide()
      let iChar = this.iCharFromXStruct(this.pointerX)
      let charEntry = this.charEntries[iChar]
      if (_.get(charEntry, 'c', '') !== '') {
        this.hover.html(charEntry.label)
        this.hover.move(this.xStructFromIChar(iChar), 25)
      }
    } else {
      this.hover.hide()
      let iChar = this.iCharFromXSeq(this.pointerX)
      let charEntry = this.charEntries[iChar]
      if (_.get(charEntry, 'c', '') !== '') {
        this.hover.html(charEntry.label)
        let x = this.xSeqFromIChar(iChar) + this.charWidth / 2
        this.hover.move(x, this.yMidSequence)
      }
    }
    if (this.mousePressed === 'top') {
      this.centerSeqOnIChar(this.iCharFromXStruct(this.pointerX))
      this.draw()
    } else if (this.mousePressed === 'bottom') {
      let iNewChar = this.iCharFromXSeq(this.pointerX)
      let iCharDiff = iNewChar - this.iCharPressed
      this.iCharSeqStart -= iCharDiff
      this.draw()
    }
  }

  mouseout() {
    this.hover.hide()
    this.mousePressed = ''
  }

  mouseup() {
    if (this.isWaitForDoubleClick) {
      this.click(event)
    }
    this.hover.hide()
    this.mousePressed = ''
  }

  doubleclick(event) {
    console.log(
      'SequenceWidget.doubleclick',
      this.pressSection,
      this.iCharPressed
    )
    this.getPointer(event)
    let iChar = null
    if (this.pressSection === 'bottom') {
      // mouse event in sequence bar
      iChar = this.iCharFromXSeq(this.pointerX)
    } else {
      iChar = this.iCharFromXStruct(this.pointerX)
    }
    let charEntry = this.charEntries[iChar]
    if (!_.isNil(charEntry.iRes)) {
      if (this.pressSection === 'top') {
        this.controller.selectSecondaryStructure(charEntry.iRes)
      } else {
        this.controller.setResidueSelect(charEntry.iRes, true)
      }
      let residue = this.soup.getResidueProxy(charEntry.iRes)
      this.controller.triggerAtom(residue.iAtom)
    }
  }

  click(event) {
    let iChar = null
    if (this.pressSection === 'bottom') {
      // mouse event in sequence bar
      iChar = this.iCharFromXSeq(this.pointerX)
    } else {
      iChar = this.iCharFromXStruct(this.pointerX)
    }

    if (iChar !== this.iCharPressed) {
      return
    }

    if (this.pressSection === 'top') {
      let charEntry = this.charEntries[this.iCharPressed]
      if (!_.isNil(charEntry.iRes)) {
        let iRes = charEntry.iRes
        this.controller.toggleSecondaryStructure(iRes)
      }
    } else if (this.pressSection === 'bottom') {
      let charEntry = this.charEntries[this.iCharPressed]
      if (!_.isNil(charEntry.iRes)) {
        let iRes = charEntry.iRes
        if (!event.metaKey && !event.shiftKey) {
          this.controller.selectResidue(iRes)
        } else if (event.shiftKey) {
          this.controller.selectAdditionalRangeToResidue(iRes)
        } else {
          this.controller.selectAdditionalResidue(iRes)
        }
      }
    }
  }

  mousedown(event) {
    event.preventDefault()

    this.getPointer(event)
    this.saveMouse()

    if (this.pointerY < this.yTopSequence) {
      this.mousePressed = 'top'
    } else {
      this.mousePressed = 'bottom'
    }

    let now = new Date().getTime()
    let elapsedTime = this.timePressed ? now - this.timePressed : 0

    if (elapsedTime > 600) {
      this.isWaitForDoubleClick = false
    }

    if (!this.isWaitForDoubleClick) {
      this.pressSection = this.mousePressed
      if (this.pressSection === 'bottom') {
        this.iCharPressed = this.iCharFromXSeq(this.pointerX)
      } else {
        this.iCharPressed = this.iCharFromXStruct(this.pointerX)
      }
      this.isWaitForDoubleClick = true
    } else if (elapsedTime < 600) {
      this.doubleclick(event)
      this.isWaitForDoubleClick = false
    }

    this.timePressed = new Date().getTime()
    this.mousemove(event)
  }
}

/**
 * ClippingPlaneWidget
 */
class ClippingPlaneWidget extends CanvasWidget {
  constructor(soupWidget, selector) {
    super(selector)
    this.div.css('position', 'relative')
    this.soupView = soupWidget.soupView
    this.controller = soupWidget.controller
    soupWidget.addObserver(this)
    this.maxZLength = 0.0
    this.div.css('box-sizing', 'border-box')
    this.zFrontColor = 'rgb(150, 90, 90)'
  }

  resize() {
    this.div.css({
      width: this.width(),
      height: this.height()
    })
    super.resize()
    this.update()
  }

  x() {
    return 0
  }

  y() {
    return 0
  }

  width() {
    let box = this.parentDiv[0].getBoundingClientRect()
    return box.width - 20
  }

  height() {
    return this.parentDiv.height()
  }

  xToZ(x) {
    let fraction = x / this.width()
    return (0.5 - fraction) * this.maxZLength
  }

  zToX(z) {
    let fraction = z / this.maxZLength
    return (0.5 - fraction) * this.width()
  }

  update() {
    let soup = this.soupView.soup
    let cameraParams = this.soupView.currentView.cameraParams
    this.maxZLength = 2 * soup.maxLength

    let xBack = this.zToX(cameraParams.zBack)
    let xFront = this.zToX(cameraParams.zFront)
    let xMid = this.zToX(0)
    let yMid = this.height() / 2
    let font = '9pt Helvetica'

    // background
    this.fillRect(0, 0, this.width(), this.height(), '#999')

    // middle track
    this.fillRect(0, yMid - 3, this.width(), 6, '#AAB')

    // filled track to back
    this.fillRect(xMid, yMid - 3, xBack - xMid, 6, this.zFrontColor)

    // back control
    let widthBackText = this.textWidth('back', font)
    this.fillRect(
      xBack - 6 - widthBackText,
      0,
      widthBackText + 6,
      this.height(),
      '#666'
    )
    this.text('back', xBack - 3 - widthBackText, yMid, font, '#AAA', 'left')

    // filled track to front
    this.fillRect(xFront, yMid - 3, xMid - xFront, 6, this.zFrontColor)

    // front control
    let widthFrontText = this.textWidth('front', font)
    this.fillRect(xFront, 0, widthFrontText + 6, this.height(), '#666')
    this.text('front', xFront + 3, yMid, font, '#AAA', 'left')

    // halfway marker
    this.line(xMid, 0, xMid, this.height(), 1, '#995555')
  }

  getZ(event) {
    this.getPointer(event)
    this.z = this.xToZ(this.pointerX)
  }

  mousedown(event) {
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

  mousemove(event) {
    event.preventDefault()
    super.mousemove(event)

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
  constructor(soupWidget, selector, elem, x, y, color) {
    this.soupView = soupWidget.soupView
    this.controller = soupWidget.controller
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
      .on('click touch', e => {
        e.preventDefault()
        this.toggle()
      })
    this.update()
    soupWidget.addObserver(this)
  }

  getToggle() {
    return this.soupView.soup.grid.isElem[this.elem]
  }

  toggle() {
    this.controller.toggleGridElem(this.elem)
    this.update()
  }

  update() {
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
  constructor(soupWidget) {
    super(soupWidget.divTag)

    this.soupWidget = soupWidget
    this.soupView = soupWidget.soupView
    this.controller = soupWidget.controller
    soupWidget.addObserver(this)

    this.backgroundColor = '#999'
    this.buttonHeight = 40
    this.sliderHeight = this.buttonHeight * 6 - 30
    this.isGrid = soupWidget.isGrid

    this.div.css('display', 'none')
    this.div.attr('id', 'grid-control')
    this.div.css('height', this.height())
    this.div.addClass('jolecule-button')

    this.buttonsDiv = $('<div id="grid-control-buttons">')
    this.div.append(this.buttonsDiv)
  }

  rebuild() {
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

  makeElemButton(elem, y) {
    let color = data.ElementColors[elem]
    let colorHexStr = '#' + color.getHexString()
    let id = 'grid-button-' + elem.toLowerCase()
    let selector = `#${id}`
    this.buttonsDiv.append($(`<div id="${id}">`))
    new GridToggleButtonWidget(
      this.soupWidget,
      selector,
      elem,
      50,
      y,
      colorHexStr
    )
  }

  resize() {
    if (!this.isGrid) {
      return
    }
    this.div.css({
      width: this.width(),
      height: this.height(),
      top: this.y(),
      left: this.x()
    })
    this.canvasDom.width = this.width()
    this.canvasDom.height = this.height()
  }

  width() {
    return 84
  }

  height() {
    return this.buttonHeight * 6 + 10
  }

  x() {
    let parentDivPos = this.parentDiv.position()
    return parentDivPos.left + 5
  }

  y() {
    let parentDivPos = this.parentDiv.position()
    return parentDivPos.top + 50
  }

  yToZ(y) {
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

  zToY(z) {
    let grid = this.soupView.soup.grid
    let diff = grid.bMax - grid.bMin
    return ((z - grid.bMin) / diff) * this.sliderHeight + 20
  }

  update() {
    if (!this.isGrid) {
      return
    }

    this.fillRect(0, 0, this.width(), this.height(), this.backgroundColor)

    let xm = 20

    let yTop = this.zToY(this.soupView.soup.grid.bMin)
    let yBottom = this.zToY(this.soupView.soup.grid.bMax)

    // middle track
    this.fillRect(xm - 3, yTop, 6, yBottom - yTop, '#AAB')

    let font = '10px sans-serif'
    let textColor = '#333'

    let y = this.zToY(this.soupView.soup.grid.bCutoff)
    let text = this.soupView.soup.grid
      .convertB(this.soupView.soup.grid.bCutoff)
      .toFixed(2)

    // fill to bottom
    this.fillRect(xm - 3, y, 6, yBottom - y, 'rgb(150, 90, 90)')

    // slider
    this.fillRect(5, y, 30, 5, textColor)
    this.text(text, xm, y - 8, font, textColor, 'center')

    // bottom marker
    this.line(5, yBottom, 35, yBottom, 1, '#666')

    text = this.soupView.soup.grid
      .convertB(this.soupView.soup.grid.bMax)
      .toFixed(2)
    this.text(text, xm, yBottom + 6, font, textColor, 'center')
  }

  getZ(event) {
    this.getPointer(event)

    this.z = this.yToZ(this.pointerY)
  }

  mousedown(event) {
    event.preventDefault()

    this.getZ(event)

    this.mousePressed = true

    this.mousemove(event)
  }

  mousemove(event) {
    event.preventDefault()

    if (!this.mousePressed) {
      return
    }

    this.getZ(event)
    this.controller.setGridCutoff(this.z)
    this.update()
  }

  mouseup(event) {
    event.preventDefault()

    this.mousePressed = false
  }
}

/**
 * ColorLegendWidget
 */
class ColorLegendWidget extends CanvasWidget {
  constructor(soupWidget) {
    super(soupWidget.divTag)
    this.offset = { x: 5, y: 5 }

    this.canvas.hide()

    this.default()

    this.div.css('display', 'block')
    this.div.attr('id', 'color-legend')
    this.div.addClass('jolecule-button')
    this.div.css({
      padding: '8px',
      'box-sizing': 'border-box',
      height: 'auto',
      width: 'auto'
    })

    this.buttonsDiv = $('<div>')
      .attr('id', 'color-legend-buttons')
      .css('text-align', 'left')
    this.div.append(this.buttonsDiv)

    this.isShow = true

    soupWidget.addObserver(this)

    this.rebuild()
  }

  default() {
    let getSSColor = ss => '#' + data.getSsColor(ss).getHexString()
    this.title = 'Secondary Structure'
    this.colorEntries = [
      { color: getSSColor('E'), label: 'Strand' },
      { color: getSSColor('H'), label: 'Helix' },
      { color: getSSColor('C'), label: 'Coil' },
      { color: getSSColor('D'), label: 'DNA/RNA' }
    ]
  }

  rebuild() {
    this.buttonsDiv.empty()

    if (this.title) {
      this.buttonsDiv.append(
        $('<div>')
          .text(this.title)
          .css({
            'font-size': '0.8em',
            'font-style': 'italic'
          })
      )
    }

    for (let [i, entry] of this.colorEntries.entries()) {
      let id = 'color-legend-' + i
      let buttonDiv = $(`<div>`)
        .attr('id', id)
        .css({
          'font-size': '0.8em',
          'line-height': '1.5em',
          display: 'block'
        })
      let colorDiv = $(`<div>`)
        .html('&block;')
        .css({
          color: entry.color,
          display: 'inline',
          'font-size': '1em',
          'margin-right': '0.7em'
        })
      buttonDiv.append(colorDiv)
      buttonDiv.append(entry.label)
      this.buttonsDiv.append(buttonDiv)
    }

    this.resize()
    this.update()
  }

  resize() {
    this.div.css({
      top: this.y(),
      left: this.x()
    })
  }

  width() {
    return 80
  }

  height() {
    return this.buttonsDiv.height()
  }

  x() {
    let parentDivPos = this.parentDiv.position()
    return parentDivPos.left + this.offset.x
  }

  y() {
    let parentDivPos = this.parentDiv.position()
    return (
      parentDivPos.top +
      this.parentDiv.height() -
      this.div.outerHeight() -
      this.offset.y
    )
  }

  update() {
    if (this.isShow) {
      this.div.show()
    } else {
      this.div.hide()
    }
  }
}

/**
 * SelectionWidget
 */
class SelectionWidget extends CanvasWidget {
  constructor(soupWidget) {
    super(soupWidget.divTag)
    this.soupWidget = soupWidget
    this.offset = {x:5, y:5}
    this.canvas.hide()

    this.div.css('display', 'block')
    this.div.attr('id', 'selection')
    this.div.addClass('jolecule-button')
    this.div.css({
      padding: '8px',
      position: 'absolute',
      'max-width': '180px',
      'max-height': '200px',
      'font-size': '0.8em',
      height: 'auto',
      width: 'auto',
      'box-sizing': 'border-box',
      'text-align': 'left'
    })

    this.isShow = false

    soupWidget.addObserver(this)
  }

  resize() {
    this.div.css({
      top: this.y(),
      left: this.x()
    })
  }

  x() {
    let parentDivPos = this.parentDiv.position()
    return (
      parentDivPos.left + this.parentDiv.width() - this.div.outerWidth() - this.offset.x
    )
  }

  y() {
    let parentDivPos = this.parentDiv.position()
    return (
      parentDivPos.top + this.parentDiv.height() - this.div.outerHeight() - this.offset.y
    )
  }

  getText() {
    let soup = this.soupWidget.soup
    let residue = soup.getResidueProxy()

    let text = ''
    let first = null
    let last = null
    let chain = null
    let isDrawComma = false
    for (let i = 0; i < soup.getResidueCount(); i += 1) {
      residue.iRes = i
      if (residue.selected) {
        if (chain === null || chain !== residue.chain) {
          if (chain !== null) {
            text += '<br>'
          }
          chain = residue.chain
          text += soup.structureIds[residue.iStructure] + '-' + chain + ': '
          isDrawComma = false
        }
        if (first === null) {
          first = residue.resNum
          last = residue.resNum
        } else {
          last = residue.resNum
        }
      } else {
        if (first !== null) {
          if (isDrawComma) {
            text += ', '
          } else {
            isDrawComma = true
          }
          if (first === last) {
            text += first
          } else {
            text += first + '-' + last
          }
          first = null
          last = null
        }
      }
    }
    if (!text) {
      if (this.soupWidget.soupView.getMode() === 'chain') {
        if (soup.selectedTraces.length > 0) {
          let iTrace = soup.selectedTraces[0]
          let iRes = soup.traces[iTrace].indices[0]
          let residue = soup.getResidueProxy(iRes)
          let structureId = soup.structureIds[residue.iStructure]
          text += `${structureId}-${residue.chain}`
        }
      }
    }
    return text
  }

  update() {
    let s = this.getText()
    if (!s) {
      this.div.hide()
    } else {
      this.div.html(s)
      this.div.show()
      this.resize()
    }
  }
}

class ResidueSelectorWidget {
  constructor(soupWidget, selector) {
    this.controller = soupWidget.controller
    this.soupView = soupWidget.soupView
    this.soupWidget = soupWidget
    this.soupWidget.addObserver(this)

    this.div = $(selector).css('z-index', 2)
    this.divId = this.div.attr('id')
    this.selectId = `${this.divId}-residue-select`
    this.$select = $('<select>').attr('id', this.selectId)
    this.div.append(this.$select)
    this.$select.change(() => this.change())
    this.$select.select2({ width: '150px' })
  }

  change() {
    let iRes = parseInt(this.$select.val())
    let residue = this.soupView.soup.getResidueProxy(iRes)
    this.controller.clearSelectedResidues()
    this.controller.setResidueSelect(iRes, true)
    this.controller.setTargetViewByIAtom(residue.iAtom)
  }

  rebuild() {
    this.$select.empty()
    // rebuild selector
    this.soup = this.soupView.soup
    let residue = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.resType === 'XXX') {
        continue
      }
      let text = residue.resId + '-' + residue.resType
      this.$select.append(new Option(text, `${iRes}`))
    }
  }

  update() {
    if (this.$select) {
      let iAtom = this.soupView.currentView.iAtom
      let iRes = this.soupView.soup.getAtomProxy(iAtom).iRes
      let newValue = _.isNil(iRes) ? null : `${iRes}`
      let oldValue = this.$select.val()
      if (oldValue !== newValue) {
        let startTime = new Date()
        this.$select.val(newValue).trigger('change.select2')
        let s = (new Date() - startTime) / 1000
        console.log(
          `ResidueSelectorWidget.update ${oldValue} -> ${newValue}` +
            ` in ${s.toFixed(3)}s`
        )
      }
    }
  }
}

class MenuWidget {
  constructor(soupWidget, selector, isPopAbove = true) {
    this.soupWidget = soupWidget
    this.controller = soupWidget.controller
    this.isShowPanel = false
    this.isPopAbove = isPopAbove

    this.div = $(selector)
      .html('&#9776;')
      .addClass('jolecule-button')
      .on('click touch', e => {
        this.isShowPanel = !this.isShowPanel
        this.update()
        e.preventDefault()
      })
    this.divId = this.div.attr('id')

    this.panelDiv = $('<div>').addClass('jolecule-embed-view')
    this.panelDiv.css({
      position: 'absolute',
      'z-index': 1,
      padding: '4px 5px'
    })
    this.div.parent().append(this.panelDiv)

    this.widget = {}

    this.panelDiv.append($(`<div id="${this.divId}-transparent">`))
    this.widget.transparent = new ToggleOptionWidget(
      soupWidget,
      `#${this.divId}-transparent`,
      'transparent'
    )

    this.panelDiv.append($(`<div id="${this.divId}-sphere">`))
    this.widget.sphere = new ToggleOptionWidget(
      soupWidget,
      `#${this.divId}-sphere`,
      'sphere'
    )

    this.panelDiv.append($(`<div id="${this.divId}-backbone">`))
    this.widget.backbone = new ToggleOptionWidget(
      soupWidget,
      `#${this.divId}-backbone`,
      'backbone'
    )

    this.panelDiv.append($(`<div id="${this.divId}-water">`))
    this.widget.water = new ToggleOptionWidget(
      soupWidget,
      `#${this.divId}-water`,
      'water'
    )

    this.panelDiv.append($(`<div id="${this.divId}-ribbon">`))
    this.widget.ribbon = new ToggleOptionWidget(
      soupWidget,
      `#${this.divId}-ribbon`,
      'ribbon'
    )

    this.panelDiv.append($(`<div id="${this.divId}-ligand">`))
    this.widget.ligand = new ToggleOptionWidget(
      soupWidget,
      `#${this.divId}-ligand`,
      'ligands'
    )

    this.soupWidget.addObserver(this)
    this.update()
  }

  update() {
    this.panelDiv.css('display', this.isShowPanel ? 'block' : 'none')
    if (this.isShowPanel) {
      this.div.addClass('jolecule-button-toggle-on')
    } else {
      this.div.removeClass('jolecule-button-toggle-on')
    }
    let position = this.div.position()
    if (this.isPopAbove) {
      this.panelDiv.css({
        top: position.top - this.panelDiv.outerHeight() - 4,
        left: position.left - 7
      })
    } else {
      this.panelDiv.css({
        top: position.top + this.div.outerHeight() + 4,
        left: position.left - 7
      })
    }
    let xRight = this.panelDiv.position().left + this.panelDiv.width()
    if (xRight > position.left + this.div.width()) {
      this.panelDiv.css(
        'left',
        position.left + this.div.width() - this.panelDiv.width()
      )
    }
  }
}

class ToggleWidget {
  constructor(soupWidget, selector) {
    this.soupWidget = soupWidget
    this.controller = soupWidget.controller
    this.div = $(selector)
      .html(this.html())
      .addClass('jolecule-button')
      .on('click touch', e => {
        this.set(!this.get())
        this.update()
        e.preventDefault()
      })
    this.soupWidget.addObserver(this)
  }

  html() {}

  get() {}

  set(val) {}

  update() {
    if (this.get()) {
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

class ToggleOptionWidget extends ToggleWidget {
  constructor(soupWidget, selector, option) {
    super(soupWidget, selector)
    this.option = option
    this.div.html(this.html())
  }

  html() {
    return _.capitalize(this.option)
  }

  get() {
    return this.controller.getShowOption(this.option)
  }

  set(val) {
    this.controller.setShowOption(this.option, val)
  }
}

class ToggleAnimateWidget extends ToggleWidget {
  constructor(soupWidget, selector, state, text) {
    super(soupWidget, selector)
    this.state = state
    this.text = text
    this.div.html(this.html())
  }

  html() {
    return this.text
  }

  get() {
    return this.controller.getAnimateState() === this.state
  }

  set(val) {
    if (val) {
      this.controller.setAnimateState(this.state)
    } else {
      this.controller.setAnimateState('none')
    }
  }
}

class HudTextWidget extends ToggleWidget {
  constructor(soupWidget, selector) {
    super(soupWidget, selector)
    this.selector = selector
    this.soupView = this.soupWidget.soupView
    this.isText = true
  }

  html() {
    return 'Text'
  }

  get() {
    return this.isText
  }

  set(val) {
    this.isText = val
  }

  async update() {
    super.update()
    if (this.isText && this.soupWidget) {
      let text
      let n = this.soupView.savedViews.length
      if (n === 0) {
        text = ''
      } else {
        let i = this.soupView.currentView.order + 1
        text = `${i}/${n}: ${this.soupView.currentView.text}`
      }
      await this.soupWidget.asyncSetMesssage(text)
    } else {
      this.soupWidget.cleanupMessage()
    }
  }
}

class ToggleToolbarWidget {
  constructor(soupWidget, selector, isOn = true, isAbove = true) {
    this.soupWidget = soupWidget
    this.on = !isOn
    this.isChange = true
    this.isAbove = isAbove
    this.div = $(selector)
    this.offset = {x: 0, y: 5}
    if (!this.isAbove) {
      this.offset.y = 0
    }

    this.wrapperDiv = $('<div>')
    this.div.append(this.wrapperDiv)

    this.toolbarDiv = $('<div id="jolecule-toggle-toolbar">')
      .css({
        display: 'flex',
        'flex-wrap': 'nowrap',
        'flex-direction': 'row',
        overflow: 'hidden'
      })
      .addClass('jolecule-embed-toolbar')
    this.wrapperDiv.append(this.toolbarDiv)

    this.buttonDiv = $('<div id="toggle-toolbar-button">')
      .html('J')
      .addClass('jolecule-button')
      .css({ 'margin': '5px'})
      .on('click touch', e => {
        this.isChange = true
        this.update()
        e.preventDefault()
      })
    this.wrapperDiv.append(this.buttonDiv)

    this.buttonDiv2 = $('<div id="toggle-toolbar-button2">')
      .html('J')
      .addClass('jolecule-button')
      .addClass('jolecule-button-toggle-on')
      .on('click touch', e => {
        this.isChange = true
        this.update()
        e.preventDefault()
      })
    this.toolbarDiv.append(this.buttonDiv2)

    this.soupWidget.addObserver(this)
    this.resize()
  }

  resize() {
    this.toolbarDiv.width(this.div.width() - 10)
    if (this.isAbove) {
      util.stickJqueryDivInTopLeft(this.div, this.wrapperDiv, this.offset.x, this.offset.y)
    } else {
      util.stickJqueryDivInBottomLeft(this.div, this.wrapperDiv, this.offset.x, this.offset.y)
    }
  }

  update() {
    if (this.isChange) {
      this.on = !this.on
      this.isChange = false
      if (this.on) {
        this.buttonDiv.hide()
        this.toolbarDiv.show()
      } else {
        this.buttonDiv.show()
        this.toolbarDiv.hide()
      }
      this.resize()
      if (this.isAbove) {
        if (this.on) {
          this.soupWidget.messageOffset.x = 15
          this.soupWidget.messageOffset.y = 70
        } else {
          this.soupWidget.messageOffset.x = 35
          this.soupWidget.messageOffset.y = 10
        }
      } else {
        this.soupWidget.messageOffset.x = 10
        this.soupWidget.messageOffset.y = 10
      }
      this.soupWidget.resize()
    }
  }
}

export default {
  LineElement,
  PopupText,
  AtomLabelsWidget,
  DistanceMeasuresWidget,
  SequenceWidget,
  ClippingPlaneWidget,
  ColorLegendWidget,
  SelectionWidget,
  GridControlWidget,
  ResidueSelectorWidget,
  ToggleOptionWidget,
  ToggleAnimateWidget,
  MenuWidget,
  HudTextWidget,
  ToggleToolbarWidget
}
