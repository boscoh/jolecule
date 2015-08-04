


window.keyboard_lock = false;


// This is a separate file to allow multiple jolecule
// widgets to be animated in the same global event loop.

window.register_global_animation_loop = function (new_display) {
  var ms_per_step = 20;

  var loop = function() {
    if (global_displays == []) {
      return;
    }
    var curr_time = (new Date).getTime();
    var n_step = (curr_time - last_time)/ms_per_step;
    if (n_step < 1) {
      n_step = 1;
    }
    for (var i=0; i<n_step; i++) {
      for (var j=0; j<global_displays.length; j++) {
        global_displays[j].animate();
      }
    }
    for (var j=0; j<global_displays.length; j++) {
      var display = global_displays[j];
      if (display.is_changed()) {
        display.draw();
      }
    }
    last_time = curr_time;
  }

  if (typeof global_displays == 'undefined') {
    global_displays = []
    var interval_id = setInterval(loop, ms_per_step);
    var last_time = (new Date).getTime();
  }

  global_displays.push(new_display);
}






