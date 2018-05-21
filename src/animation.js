/**
 * This is a separate file to allow multiple jolecule
 * widgets to be animated in the same global event loop.
 * the interface to a widget is:
 *
 * class Widget {
 *   animate() {}
 *   isChanged: boolean
 *   draw() {}
 * }
 *
 * Global storage
 * - window.globalWidgets
 * - window.lastTime
 */

const MS_PER_STEP = 17

function loop () {
  requestAnimationFrame(loop)

  if (window.globalWidgets === []) {
    return
  }
  let currTime = (new Date()).getTime()
  let elapsedTime = currTime - window.lastTime

  for (let widget of window.globalWidgets) {
    widget.animate(elapsedTime)
  }

  for (let widget of window.globalWidgets) {
    if (widget.isChanged()) {
      widget.draw()
    }
  }

  window.lastTime = currTime
}

/**
 * run loop() as a singleton by using the global
 * window space to lock one single copy of loop
 */
function registerGlobalAnimationLoop (widget) {
  if (typeof window.globalWidgets === 'undefined') {
    window.globalWidgets = []
    loop()
    window.lastTime = (new Date()).getTime()
  }
  window.globalWidgets.push(widget)
}

export { registerGlobalAnimationLoop }
