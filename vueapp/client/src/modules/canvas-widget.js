import $ from 'jquery'
import * as util from '../../../../src/util'

/**
 * CanvasWidget
 *   - abstract class to wrap a canvas element
 *   - instantiates an absolute div that fits the $(selector)
 *   - attaches a canvas to this div
 *   - creates methods that redirects mouse commands to that canvas
 */

class CanvasWidget {
  constructor (selector) {
    this.parentDiv = $(selector)

    this.div = $('<div>')
    this.parentDiv.append(this.div)

    this.canvas = $('<canvas>')
    this.canvas.attr('width', this.parentDiv.innerWidth())
    this.canvas.attr('height', this.parentDiv.innerHeight())
    this.div.append(this.canvas)

    this.canvasDom = this.canvas[0]
    this.drawContext = this.canvasDom.getContext('2d')

    this.pointerX = 0
    this.pointerY = 0
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
    let parentDivPos = this.parentDiv.offset()
    return parentDivPos.left
  }

  y () {
    let parentDivPos = this.parentDiv.offset()
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
    this.drawContext.strokeStyle = 'red'
    this.drawContext.lineStyle = 'blue'
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
    this.getPointer(event)
  }

  mouseup (event) {
    event.preventDefault()
    this.mousePressed = false
  }

  getPointer (event) {
    let rect = event.target.getBoundingClientRect()
    this.pointerX = event.clientX - rect.left
    this.pointerY = event.clientY - rect.top
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

export default CanvasWidget
