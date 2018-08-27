/**
 * This is a separate file to allow multiple jolecule
 * widgets to be animated in the same global event loop.
 * the interface to a widget is:
 *
 * class Widget {
 *   animate(elapsedTime) - calculates any changes due to animation
 *   isChanged() -> Boolean - check if needs to be drawn
 *   drawFrame() -> draws the actue frame
 * }
 *
 * The widgets are stored on the global window object so that
 * potentially multiple different instances will hit the 
 * same copy of the function
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
  let currTime = new Date().getTime()
  let elapsedTime = currTime - window.lastTime

  for (let widget of window.globalWidgets) {
    widget.animate(elapsedTime)
  }

  for (let widget of window.globalWidgets) {
    if (widget.isChanged()) {
      widget.drawFrame()
    }
  }

  window.lastTime = currTime
}

/**
 * run loop() as a singleton by using the global
 * window space to lock one single copy of loop
 */
function registerGlobalAnimationLoop (widget) {
  // only set once by checking the global window variable

  if (typeof window.globalWidgets === 'undefined') {
    window.globalWidgets = []
    loop()
    window.lastTime = new Date().getTime()
  }
  window.globalWidgets.push(widget)
  console.log('> registerGlobalAnimationLoop', widget, window.globalWidgets)
}

export { registerGlobalAnimationLoop }
