

// This is a separate file to allow multiple jolecule
// widgets to be animated in the same global event loop.
// the interface to a widget is:
//
// class Widget {
//   animate() {}
//   is_changed: boolean
//   draw() {}
// }
//
// global storage
// - window.global_displays
// - window.last_time

var ms_per_step = 25;

function loop() {
  requestAnimationFrame( loop );

  if (window.global_displays == []) {
    return;
  }
  var curr_time = (new Date).getTime();
  var elapsed_time = curr_time - window.last_time;
  var n_step = (elapsed_time)/ms_per_step;
  if (n_step < 1) {
    n_step = 1;
  }
  n_step = Math.floor(n_step);
  var i, j;
  for (i=0; i<n_step; i++) {
    for (j=0; j<window.global_displays.length; j++) {
      window.global_displays[j].animate();
    }
  }
  for (j=0; j<window.global_displays.length; j++) {
    var display = window.global_displays[j];
    if (display.is_changed()) {
      display.draw();
    }
  }
  window.last_time = curr_time;
}


function register_global_animation_loop(new_display) {
  // run loop() as a singleton by using the global
  // window space to lock one single copy of loop
  if (typeof window.global_displays == 'undefined') {
    window.global_displays = [];
    loop();
    window.last_time = (new Date).getTime();
  }
  window.global_displays.push(new_display);
}


export { register_global_animation_loop }



