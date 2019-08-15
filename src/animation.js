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
 *
 * typically MS_PER_STEP = 17
 *
 * VR devices provide their own animation loop tied to the refresh rate of the hardware
 * Using three.js animation loop enables a global animation loop for normal widgets while
 * properly supporting VR hardware when required
 */
function loop () {

    if (window.globalWidgets.length === 0) {
      window.requestAnimationFrame(loop); // horrible hack to wait for widgets to register
      return
    }

    for (let widget of window.globalWidgets) {

      let lastTime = 0;

      function widgetRenderLoop () {
        let currTime = new Date().getTime()
        let elapsedTime = currTime - window.lastTime

        widget.animate(elapsedTime)
        widget.drawFrame()

        lastTime = currTime
      }

      widget.initWebglRenderer(); // initialise renderer now
      widget.renderer.setAnimationLoop(() => widgetRenderLoop()); // use the renderer to set loop (account for VR render loops etc)
  }
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
}

export { registerGlobalAnimationLoop }
