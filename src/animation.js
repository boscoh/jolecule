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

var MS_PER_STEP = 25

function loop () {
  requestAnimationFrame(loop)

  if (window.globalWidgets === []) {
    return
  }
  var currTime = (new Date()).getTime()
  var elapsedTime = currTime - window.lastTime
  var nStep = (elapsedTime) / MS_PER_STEP
  if (nStep < 1) {
    nStep = 1
  }
  nStep = Math.floor(nStep)

  for (let i = 0; i < nStep; i++) {
    for (let widget of window.globalWidgets) {
      widget.animate()
    }
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
