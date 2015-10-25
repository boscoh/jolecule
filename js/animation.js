


window.keyboard_lock = false;
window.last_time;

// This is a separate file to allow multiple jolecule
// widgets to be animated in the same global event loop.

window.register_global_animation_loop = function (new_display) {

  var ms_per_step = 25;

  var loop = function() {

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
    for (var i=0; i<n_step; i++) {
      for (var j=0; j<window.global_displays.length; j++) {
        window.global_displays[j].animate();
      }
    }
    for (var j=0; j<window.global_displays.length; j++) {
      var display = window.global_displays[j];
      if (display.is_changed()) {
        display.draw();
      }
    }
    window.last_time = curr_time;
  }

  if (typeof window.global_displays == 'undefined') {
    window.global_displays = []
    loop();
    window.last_time = (new Date).getTime();
  }

  window.global_displays.push(new_display);
}






