///////////////////////////////////////////////////
// Objects that will link the object data
// Protein/Scene, the Controller to the drawing
// API CanvasWidget. This will be combined in the View
// of the MVC, or in this case, ProteinDisplay.
// Included will be a ZSlabBar
///////////////////////////////////////////////////



//////////////////////////////////////////////////
//  The Z-Slab sits on the right-hand
//  side of the ProteinDisplay and controls the 
//  viewing slab and depth coloring
//////////////////////////////////////////////////

var ZSlabDisplay = function(canvas_widget, scene, controller) {
  this.canvas_widget = canvas_widget;
  this.controller = controller;
  this.scene = scene;
  this.max_z_length = 0.0;
  this.width = 33;

  this.height = function() { 
    return this.canvas_widget.height() - 6; 
  }
  
  this.x = function() {
    return this.canvas_widget.width() - this.width;
  }

  this.y = function() { return 3; };

  this.inside = function(x, y) {
    if ((x >= this.x()) &&
        (x <= this.x() + this.width) &&
        (y >= this.y()) &&
        (y <= this.y() + this.height())) {
      return true;
    }
    return false;
  }
  
  this.y_to_z = function(y) {
    var z = (0.5 - (y-this.y())/this.height())*this.max_z_length
    return z;
  }

  this.draw_background = function() {
    this.canvas_widget.draw_context.fillStyle = 
        "rgba(40, 40, 40, 0.75)";
    this.canvas_widget.draw_context.fillRect(
      this.x(), this.y(), this.width, this.height());
    this.canvas_widget.text(
        'zslab', this.x() + this.width/2, this.y() + 12,
        '12px sans-serif', "rgb(0, 130, 0)", 'center');
  }

  this.draw_protein_box = function() {
    var protein = this.scene.protein;
    var min_z = protein.min_z;
    var max_z = protein.max_z;
    var fraction = max_z/this.max_z_length;
    var y1 = this.y() + (0.5 - fraction)*this.height();
    fraction = (max_z - min_z)/this.max_z_length
    var height1 = fraction*this.height();
    this.canvas_widget.draw_context.fillStyle = 
        "rgba(60, 60, 60, 0.75)";
    this.canvas_widget.draw_context.fillRect(
        this.x(), y1, this.width, height1);
  }

  this.draw_cutoffs = function() {
    var ym = this.y() + this.height()/2;
    var x1 = this.x();
    var x2 = this.x()+this.width;

    this.canvas_widget.line(x1, ym, x2, ym, "#040", 1);

    var font = '12px sans-serif';
    var camera = this.scene.current_view.camera;
    if (this.controller.is_too_much_atomic_detail()) {
      var color = "rgb(100, 120, 0)";
    } else {
      var color = "rgb(0, 150, 0)";
    }

    var x1 = this.x();
    var x2 = this.x()+this.width;
    var y_mag = this.height() - 5;
    var fraction = camera.z_back/this.max_z_length;
    var y1 = this.y() + (0.5 - fraction)*y_mag;
    this.canvas_widget.line(x1, y1, x2, y1, color, 3);
    var xm = this.x() + this.width/2;
    var y2 = ym - 2;
    this.canvas_widget.line(xm, y1, xm, y2, color, 3);
    this.canvas_widget.text(
        'back', xm, y1-10, font, color, 'center');

    var y1 = ym + 2;
    fraction = camera.z_front/this.max_z_length;
    var y2 = this.y() + (0.5 - fraction)*y_mag + 5;
    this.canvas_widget.line(x1, y2, x2, y2, color, 3);
    this.canvas_widget.line(xm, y1, xm, y2, color, 3);
    this.canvas_widget.text(
        'front', xm, y2+10, font, color, 'center');
  }
  
  this.draw = function() {
    this.max_z_length = 2.0*this.scene.protein.max_length;
    this.draw_background();
    this.draw_protein_box();
    this.draw_cutoffs();
  }
  
  this.mousedown = function(x, y) {
    this.back = this.y_to_z(y) > 0;
    this.front = !this.back;
    this.mousemove_y(y);
  }  

  this.mousemove_y = function(y) {
    var z = this.y_to_z(y);
    var camera = this.scene.current_view.camera;
    if (this.back) {
      camera.z_back = Math.max(2, z);
    } else if (this.front) {
      camera.z_front = Math.min(-2, z);
    }
    this.scene.changed = true;
  }
  
  this.mouseup = function() {
    this.front = false;
    this.back = false;
  }
  
  this.is_mouse_pressed = function() {
    return this.front || this.back;
  }
}



///////////////////////////////////////////////////////
// 
// ProteinDisplay draws the Protein in the
// current View of the Scene onto the CanvasWidget.
// ProteinDisplay then collects user input and
// sends that to the Controller to change the
// Scene.
//
///////////////////////////////////////////////////////


function fraction_rgb(rgb, f) {
  return [ 
      Math.round(f*rgb[0]), 
      Math.round(f*rgb[1]),
      Math.round(f*rgb[2])];
}


function rgb_to_string(rgb) {
  return 'rgb(' + 
     Math.round(rgb[0]) + ', ' + 
     Math.round(rgb[1]) + ', ' + 
     Math.round(rgb[2]) + ')';
}


function z_compare(a, b) { 
  return b.z - a.z; 
}


function max_z_of_list(v_list) {
  var z = v_list[0].z;
  for (var i=1; i<v_list.length; i+=1) {
    if (v_list[i].z > z) {
      z = v_list[i].z;
    }
  }
  return z;
}


function z_rgb(z, rgb, camera) {
  var z_diff = camera.z_back - z;
  var z_fraction = z_diff/camera.z_back;
  if (z_fraction < 0.1) {
    z_fraction = 0.1;
  } else if (z_fraction > 1) {
    z_fraction = 1;
  }
  return fraction_rgb(rgb, z_fraction);
}


var ProteinDisplay = function(scene, canvas_widget, controller) {
  this.controller = controller;
  this.scene = scene;
  this.protein = scene.protein;
  this.canvas_widget = canvas_widget;
  
  this.z_list = [];

  this.hover_atom = null;
  this.hover_i_distance = null;
  this.hover_i_label = null;
  this.pressed_atom = null;
  this.is_measuring_distance = false;
  this.is_mouse_pressed = false;
  this.pinch_reference_zoom = -1;
  this.min_radius = 5;
  
  this.zslab_display = new ZSlabDisplay(
      canvas_widget, scene, controller);

  if (is_ipad()) {
    this.min_radius = 10;
    this.zslab_display.width = 45;
  }

  backbone_atoms = [
    'N', 'C', 'O', 'H', 'HA', 
    'P', 'OP1', "O5'", 'OP2', "C5'", "O5'", "O3'", "C4'"];

  this.atom_filter = function(a) {
    var show = this.scene.current_view.show;
    if (a.elem == "H" && !show.hydrogen) {
      return false;
    }

    var res_id = a.res_id;
    var residue = this.protein.res_by_id[res_id];

    if (a.is_water) {
      return show.water;
    }

    if (a.is_ligands) {
      if (show.ligands) {
        return true;
      } else {
        return residue.selected;
      }
    }    

    // leave one atom for aa and dna, always
    if (a.type == "CA" || a.type == "C3'") {
      return true;
    }
    if (in_array(a.type, backbone_atoms)) {
      return show.all_atom;
    }
    if (show.sidechain) {
      return true;
    } else {
      return residue.selected;
    }
  }

  this.is_visible = function(pos) {
    return this.scene.current_view.camera.is_visible_z(pos.z);
  }
  
  this.make_z_list = function() {
    this.z_list = [];
    for (i=0; i<this.protein.atoms.length; i+=1) {
      var a = this.protein.atoms[i];
      if (this.protein.atoms[i] === this.pressed_atom) {
          this.protein.atoms[i].is_atom = true;
          this.protein.atoms[i].is_bond = false;
          this.protein.atoms[i].is_dist = false;
          this.z_list.push(this.protein.atoms[i]);
      } else if (this.atom_filter(a)) {
        if (this.is_visible(this.protein.atoms[i])) {
          this.protein.atoms[i].is_atom = true;
          this.protein.atoms[i].is_bond = false;
          this.protein.atoms[i].is_dist = false;
          this.z_list.push(this.protein.atoms[i]);
        }  
      }
    }
    for (j=0; j<this.protein.bonds.length; j+=1) {
      var bond = this.protein.bonds[j];
      if (this.atom_filter(bond.atom1) && 
          this.atom_filter(bond.atom2)) {
          if (this.is_visible(bond.atom1.pos) &&
              this.is_visible(bond.atom2.pos)) {
            bond.is_atom = false;
            bond.is_bond = true;
            bond.is_dist = false;
            bond.r = atom_radius/2;
            this.z_list.push(bond);
          }
      }
    }
    if (this.scene.current_view.show.trace) {
      for (var j=0; j<this.protein.trace.length; j+=1) {
        var trace = this.protein.trace[j];
        if (this.is_visible(trace.atom1.pos) &&
            this.is_visible(trace.atom2.pos)) {
          trace.is_atom = false;
          trace.is_bond = true;
          trace.is_dist = false;
          trace.i_chain = trace.atom1.i_chain;
          trace.r = 1*atom_radius;
          this.z_list.push(trace);
        }
      }
    }
    if (this.scene.current_view.show.ribbon) {
      for (i=0; i<this.protein.ribbons.length; i+=1) {
        var ribbon = this.protein.ribbons[i];
        if (this.is_visible(ribbon.bond[0].pos) &&
            this.is_visible(ribbon.bond[1].pos)) {
          ribbon.is_atom = false;
          ribbon.is_bond = false;
          ribbon.is_quad = true;
          ribbon.is_dist = false;
          this.z_list.push(ribbon);
        }
      }
    }
    var distances = this.scene.current_view.distances;
    for (var i=0; i<distances.length; i+=1) {
      var atom1 = this.protein.atoms[distances[i].i_atom1];
      var atom2 = this.protein.atoms[distances[i].i_atom2];
      if (this.atom_filter(atom1) && 
          this.atom_filter(atom2)) {
        if (this.is_visible(atom1.pos) &&
            this.is_visible(atom2.pos)) {
          var dist = {}
          dist.atom1 = atom1;
          dist.atom2 = atom2;
          dist.i = i;
          dist.z = distances[i].z;
          dist.is_atom = false;
          dist.is_bond = false;
          dist.is_quad = false;
          dist.is_dist = true;
          this.z_list.push(dist);
        }
      }
    }
    
    this.z_list.sort(z_compare);
  }

  this.project_to_canvas = function(pos) {
    var z = pos.z + this.scene.current_view.camera.zoom;
    return v3.create(
      this.canvas_widget.scale*pos.x/z + this.canvas_widget.half_width,
      this.canvas_widget.scale*pos.y/z + this.canvas_widget.half_height,
      z);
  }

  this.scan_for_hover_atom = function(x, y) {
    this.hover_atom = null;
    this.hover_i_distance = null;
    this.hover_i_label = null;
    for (var i=0; i<this.z_list.length; i+=1) {
      if (this.z_list[i].is_atom) {
        a = this.z_list[i];
        proj = this.project_to_canvas(a.pos);
        i_atom = a.i;
        for (var m=0; m<this.scene.current_view.labels.length; m+=1) {
          var i_atom_label = this.scene.current_view.labels[m].i_atom;
          if (i_atom == i_atom_label) {
            var w = 100;
            var h = 20;
            var y1 = 30;
            if (x >= (proj.x-w/2) && x <= (proj.x+w/2) && 
                y >= (proj.y-h-y1) && y <= (proj.y-y1)) {
              this.hover_i_label = m;
            }
          }
        }
        r = this.canvas_widget.scale*atom_radius/proj.z;
        if (r < this.min_radius) {
          r = this.min_radius;
        }
        y_diff = proj.y - y;
        x_diff = proj.x - x;
        r_sq = y_diff*y_diff + x_diff*x_diff;
        if (r_sq < r*r) {
          this.hover_atom = a;
        }
      } else if (this.z_list[i].is_dist) {
        d = this.z_list[i];
        if (this.is_visible(d.atom1.pos) &&
            this.is_visible(d.atom2.pos)) {
          var w = 40;
          var h = 14;
          proj1 = this.project_to_canvas(d.atom1.pos);
          proj2 = this.project_to_canvas(d.atom2.pos);
          xm = (proj1.x + proj2.x)/2;
          ym = (proj1.y + proj2.y)/2;
          if (x >= xm-w/2 && x <= xm+w/2 &&
              y >= ym-h/2 && y <= ym+h/2) {
              this.hover_i_distance = d.i;
          }
        }
      } 
    }
  }

  element_rgb = {
    "C": [180, 180, 180],
    "N": [100, 100, 255],
    "O": [255, 100, 100],
    "H": [200, 200, 180],
    "S": [255, 255, 100],
  }

  this.rgb_from_z_obj = function(z_obj) {
    if (z_obj.is_atom) {
      if (this.hover_atom === z_obj) {
        return [0, 255, 0];
      }
      atom_elem = z_obj.elem;
      if (atom_elem in element_rgb) {
        return element_rgb[atom_elem];
      } else {
        return [224, 74, 202];
      }      
    } else if (z_obj.i_chain == -1) {
      return [100, 110, 100];
    } else {
      var j = z_obj.i_chain % 5;
      if (j == 0) {
        return [115, 85, 100];
      } else if (j == 1) {
          return [95, 111, 87];
      } else if (j == 2) {
          return [95, 95, 111];
      } else if (j == 3) {
          return [110, 100, 70];
      } else {
          return [100, 90, 100];
      }
    }
  }

  this.i_atom_of_label = function(z_obj) {
    for (var i=0; i<this.scene.current_view.labels.length; i+=1) {
      var i_atom = this.scene.current_view.labels[i].i_atom;
      if (i_atom == z_obj.i) {
        return i;
      }
    }
    return -1;
  }
  
  this.draw_distance = function(pos1, pos2, fill_style) { 
    var width = 40;
    var height = 14;
    var text = v3.distance(pos1, pos2).toFixed(2);
    proj1 = this.project_to_canvas(pos1);
    proj2 = this.project_to_canvas(pos2);
    xm = (proj1.x + proj2.x)/2;
    ym = (proj1.y + proj2.y)/2;
    this.canvas_widget.draw_context.fillStyle = fill_style;
    this.canvas_widget.draw_context.fillRect(
        xm-width/2, ym-height/2, width, height);
    this.canvas_widget.line(
        proj1.x, proj1.y, proj2.x, proj2.y, fill_style, 2);
    this.canvas_widget.text(
        text, xm, ym, '10px sans-serif', '#000', 'center');
  }
  
  this.draw_z_list = function() {
    for (var k=0; k<this.z_list.length; k+=1) {
      var z_obj = this.z_list[k];
      var z = z_obj.z;
      rgb = z_rgb(
          z_obj.z, this.rgb_from_z_obj(z_obj), 
          this.scene.current_view.camera);
      var color = rgb_to_string(rgb);
      var edge_color = rgb_to_string(fraction_rgb(rgb, 0.5));
      var z_disp = z+this.scene.current_view.camera.zoom;
      if (z_obj.is_atom) {
        r = this.canvas_widget.scale*atom_radius/z_disp;
        proj = this.project_to_canvas(z_obj.pos);
        this.canvas_widget.solid_circle(
            proj.x, proj.y, r, color, edge_color);
        var m = this.i_atom_of_label(z_obj);
        if (m >= 0) {
          if (m == this.hover_i_label) {
            var in_rgb = [180, 100, 100];
          } else {
            var in_rgb = [180, 180, 180];
          }
          rgb = z_rgb(z_obj.z, in_rgb, this.scene.current_view.camera);
          this.canvas_widget.draw_popup(
             proj.x, proj.y, '' + this.scene.current_view.labels[m].text,
             rgb_to_string(rgb));
        }   
      } else if (z_obj.is_bond) {
        r = this.canvas_widget.scale*z_obj.r/z_disp;
        proj2 = this.project_to_canvas(z_obj.atom1.pos);
        proj3 = this.project_to_canvas(z_obj.atom2.pos);
        this.canvas_widget.solid_line(
            proj2.x, proj2.y, proj3.x, proj3.y, 
            r, color, edge_color);
      } else if (z_obj.is_quad) {
        proj1 = this.project_to_canvas(z_obj.quad_coords[0]);
        proj2 = this.project_to_canvas(z_obj.quad_coords[1]);
        proj3 = this.project_to_canvas(z_obj.quad_coords[2]);
        proj4 = this.project_to_canvas(z_obj.quad_coords[3]);
        this.canvas_widget.quad(
            proj1.x, proj1.y, proj2.x, proj2.y,
            proj3.x, proj3.y, proj4.x, proj4.y, 
            color, edge_color);
      } else if (z_obj.is_dist) {
        if (z_obj.i == this.hover_i_distance) {
          var in_rgb = [180, 100, 100];
        } else {
          var in_rgb = [100, 180, 100];
        }
        rgb = z_rgb(z_obj.z, in_rgb, this.scene.current_view.camera);
        this.draw_distance(
            z_obj.atom1.pos, z_obj.atom2.pos, rgb_to_string(rgb));
      }
    }
  }
  
  this.draw_hover_popup = function() {
    if (this.hover_atom != null) {
      if (this.is_visible(this.hover_atom.pos)) {
        proj = this.project_to_canvas(this.hover_atom.pos);
        this.canvas_widget.draw_popup(
            proj.x, proj.y, '' + this.hover_atom.label,
            "rgba(255, 255, 255, 0.7)");
      }
    }
  }
  
  this.draw_distance_measure = function() {
    if (this.is_measuring_distance) {
      var centered_atom = this.scene.centered_atom();
      if (this.hover_atom == centered_atom) {
      } else if (this.hover_atom == null) {
        this.canvas_widget.line(
            this.canvas_widget.half_width, this.canvas_widget.half_height,
            this.canvas_widget.x_mouse, this.canvas_widget.y_mouse, 
            'green', 2);
      } else {
        this.draw_distance(
            this.hover_atom.pos, centered_atom.pos, 
            "rgba(100, 180, 100, 0.7)");
      }
    }
  }
  
  this.draw = function() {
    this.canvas_widget.update_size();
    this.canvas_widget.draw_background();
    this.make_z_list();
    this.draw_z_list();
    this.scan_for_hover_atom(
      this.canvas_widget.x_mouse, this.canvas_widget.y_mouse)
    this.draw_hover_popup();
    this.draw_distance_measure();
    this.zslab_display.draw();
    if (this.pop_text) {
      this.canvas_widget.text(
          this.pop_text, 50, 10, 
          '20px sans-serif', 'grey', 'center');
      this.pop_text = '';
    }
  }

  this.gesturestart = function(event) {
    event.preventDefault();
    this.pinch_reference_zoom = this.scene.current_view.camera.zoom;
    this.last_pinch_rotation = 0;
    return false;
  }
  
  this.gesturechange = function(event) {
    event.preventDefault();
    var camera = this.scene.current_view.camera;
    var zoom_dif = this.pinch_reference_zoom/event.scale - camera.zoom;
    this.controller.adjust_zoom(zoom_dif);
    var delta_rotation = event.rotation - this.last_pinch_rotation;
    this.controller.rotate_z(delta_rotation/360*2*Math.PI);
    this.last_pinch_rotation = event.rotation;
    return false;
  }
  
  this.gestureend = function(event) {
    this.pinch_reference_zoom = -1;
    return false;
  }

  this.get_polar = function(in_x, in_y) {
    var x = in_x - this.canvas_widget.half_width;
    var y = in_y - this.canvas_widget.half_height;
    var r = Math.sqrt(x*x + y*y);
    var theta = Math.atan(y/x);
    if (x<0) {
      if (y>0) {
        theta += Math.PI;
      } else {
        theta -= Math.PI;
      }
    }
    return [r, theta];
  }
  
  this.atom_label_dialog = function() {
    var i_atom = this.scene.current_view.i_atom;
    var parent = this.canvas_widget.parent;
    var controller = this.controller;

    var dialog = $('<div>')
      .addClass('jolecule-dialog')
      .css({'width':parent.width()-100});

    var got_text = function(text) { controller.make_label(i_atom, text); }
    var cleanup = function() { dialog.remove(); }

    if (i_atom < 0) {
      label = 'Click on atom before adding label.';
      dialog.append(create_message_div(label, "100%", cleanup))
    } else {
      var label = 'Label atom : ' + this.protein.atoms[i_atom].label;
      var editbox = create_edit_box_div('', "100%", got_text, cleanup, label);
      dialog.append(editbox);
    }
    console.log(this.canvas_widget.parent);
    stick_in_center(this.canvas_widget.parent, dialog, 0, 70);
    if (i_atom > 0) {
      var textarea = editbox.find('textarea')
      setTimeout(function() { textarea.focus(); }, 100)
    }
  }

  this.mousedown = function(event) {
    this.canvas_widget.extract_mouse_xy(event);
    var x = this.canvas_widget.x_mouse;
    var y = this.canvas_widget.y_mouse;
    this.scan_for_hover_atom(x, y);
    
    if (this.zslab_display.inside(x, y)) {
      this.zslab_display.mousedown(x, y);
      this.scene.changed = true;
      return false;
    }

    var now = (new Date).getTime();

    this.x_mouse_pressed = this.canvas_widget.x_mouse;
    this.y_mouse_pressed = this.canvas_widget.y_mouse;
    var result = this.get_polar(x, y);
    this.r_ref = result[0];
    this.zoom_ref = this.scene.current_view.camera.zoom;
    this.theta_mouse_pressed = result[1];
    this.pressed_atom = this.hover_atom;
    this.is_mouse_pressed = true;

    var centre_pressed = false;

    if (this.hover_i_distance != null) {
      this.controller.delete_dist(this.hover_i_distance);
    } else if (this.hover_i_label != null) {
      this.controller.delete_label(this.hover_i_label);
    } else if (this.pressed_atom != null &&
        this.scene.centered_atom() == this.pressed_atom) {
      if (this.centre_pressed) {
        var time_elapsed = (now - this.time_pressed);
        if (time_elapsed < 500) {
          // we've double-clicked
          this.atom_label_dialog();
        } 
      }
      this.is_measuring_distance = true;
      centre_pressed = true;
    } else {
      this.controller.hide_atomic_details_for_move();
    }

    this.centre_pressed = centre_pressed;
    this.time_pressed = now;

    this.scene.changed = true;
    return false;
  }
  
  this.mousemove = function(event) {
    this.canvas_widget.extract_mouse_xy(event);
    var x = this.canvas_widget.x_mouse;
    var y = this.canvas_widget.y_mouse;
    this.scan_for_hover_atom(x, y);
    this.scene.changed = true;

    if (this.zslab_display.is_mouse_pressed()) {
      this.zslab_display.mousemove_y(y);
      return false;
    }
    
    if ((this.pinch_reference_zoom > 0) || 
        (!this.is_mouse_pressed) ||
        (this.is_measuring_distance)) {
      return false;
    }

    var shift_down = (event.shiftKey==1);
    
    var right_mouse_button = (event.button == 2) || 
                             (event.which==3);
    x_diff = x - this.x_mouse_pressed;
    y_diff = y - this.y_mouse_pressed;
    
    var result = this.get_polar(x, y);
    var r = result[0];
    var theta = result[1];
    if (r == 0.0) {
      var zoom_new = 0;
    } else {
      var zoom_new = this.r_ref/r*this.zoom_ref;
    }
    var zoom_diff = 
        zoom_new - this.scene.current_view.camera.zoom; 
    var theta_diff = this.theta_mouse_pressed - theta;

    if (shift_down || right_mouse_button) {
      this.controller.adjust_zoom(zoom_diff);
      this.controller.rotate_z(-theta_diff);
    } else {
      this.controller.rotate_xy(0.025*y_diff, -0.025*x_diff);
    }
    this.x_mouse_pressed = x;
    this.y_mouse_pressed = y;
    this.theta_mouse_pressed = theta;

    this.scene.changed = true;
    
    return false;
  }
  
  this.mouseup = function(event) {
    if (this.zslab_display.is_mouse_pressed()) {
      this.zslab_display.mouseup();
      return false;
    } 
    if (this.is_measuring_distance) {
      if (this.hover_atom !== null &&
          this.hover_atom !== this.scene.centered_atom()) {
        this.controller.make_dist(
          scene.centered_atom(), this.hover_atom);
      }
      this.is_measuring_distance = false;
    } else {
      this.controller.restore_atomic_details_after_move();
      var time_released = (new Date).getTime();
      var time_elapsed = (time_released - this.time_pressed);
      var click_time_in_ms = 500;
      var is_click_on_atom = 
          ((time_elapsed < click_time_in_ms) && 
          (this.pressed_atom != null));
      if (is_click_on_atom) {
        this.make_z_list();
        var x = this.canvas_widget.x_mouse;
        var y = this.canvas_widget.y_mouse;
        this.scan_for_hover_atom(x, y);
        if (this.pressed_atom == this.hover_atom) {
          if (event.ctrlKey) {
            var res_id = this.hover_atom.res_id;
            var i_res = this.protein.get_i_res_from_res_id(res_id);
            var b = this.protein.residues[i_res].selected;
            this.controller.select_residue(i_res, !b);
          } else {
            this.controller.set_target_view_by_atom(this.hover_atom);
          }
        }
      }
    }
    this.is_mouse_pressed = false;
    return false;
  }

  this.register_callbacks = function() {
    this.canvas_widget.dom.onselectstart = do_nothing;
    this.canvas_widget.dom.unselectable = "on";

    var _this = this;
    this.canvas_widget.dom.addEventListener(
      'mousedown', 
      function(e) { _this.mousedown(e); }, 
      false);
    this.canvas_widget.dom.addEventListener(
      'mousemove',
      function(e) { _this.mousemove(e); }, 
      false);
    this.canvas_widget.dom.addEventListener(
      'mouseup', 
      function(e) { 
          _this.mouseup(e); 
      }, 
      false);
    this.canvas_widget.dom.addEventListener(
      'touchstart', 
      function(e) { 
        e.preventDefault();
        _this.mousedown(e); 
      }, 
      false);
    this.canvas_widget.dom.addEventListener(
      'touchmove',
      function(e) { 
        e.preventDefault();
        _this.mousemove(e); 
      }, 
      false);
    this.canvas_widget.dom.addEventListener(
      'touchend', 
      function(e) { 
        e.preventDefault();
        _this.mouseup(e); 
        _this.canvas_widget.x_mouse = -1;
        _this.canvas_widget.y_mouse = -1;
      }, 
      false);
    this.canvas_widget.dom.addEventListener(
      'touchcancel', 
      function(e) { 
        e.preventDefault();
        _this.mouseup(e); 
      }, 
      false);
    this.canvas_widget.dom.addEventListener(
      'gesturestart',
      function(e) { 
        e.preventDefault();
        _this.gesturestart(e);
      }, 
      false);
    this.canvas_widget.dom.addEventListener(
      'gesturechange',
      function(e) { 
        e.preventDefault();
        _this.gesturechange(e); 
      }, 
      false);
    this.canvas_widget.dom.addEventListener(
      'gestureend',
      function(e) { 
        e.preventDefault();
        _this.gestureend(e); 
      }, 
      false);
    
  }
  
  this.register_callbacks();
}





