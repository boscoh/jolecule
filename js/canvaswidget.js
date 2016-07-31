///////////////////////////////////////////////////
// Wrapper for the 2D canvas for HTML5
///////////////////////////////////////////////////


import {pos_dom} from "./util";


function is_canvas_suppported() {
  return ((!!window.HTMLCanvasElement) &&
        (!!window.CanvasRenderingContext2D));
}


class CanvasWidget {

  constructor(jquery_div, bg_color) {
    this.dom;
    this.x_mouse;
    this.y_mouse;
    this.scale;
    if (!is_canvas_suppported()) {
      jquery_div.append('Sorry, no canvs2d detected in your browser!');
      return;
    }
    this.canvas = $('<canvas>').css('background-color', bg_color);
    this.parent = jquery_div;
    this.parent.append(this.canvas);
    this.dom = this.canvas[0];
    this.draw_context = this.dom.getContext('2d');
    this.update_size();
    this.set_scale();
  }
  
  x() { return pos_dom(this.dom)[0]; }

  y() { return pos_dom(this.dom)[1]; }

  update_size() {
    this.dom.width =  this.parent.width();
    this.dom.height = this.parent.height();
  } 

  set_width(w) { 
    this.dom.width = w;
    this.parent.width(w);
  }

  set_height(h) {
    this.dom.height = h; 
    this.parent.height(h);
  }

  width() { return this.dom.width; }

  height() { return this.dom.height; }

  set_scale() {
    var h = this.height();
    var w = this.width();
    this.scale = Math.sqrt(h*h + w*w);
  }

  extract_mouse_xy(event) {
    this.x_mouse = event.clientX - this.x();
    this.y_mouse = event.clientY - this.y();
    if (event.touches) {
      this.x_mouse = event.touches[0].clientX - this.x();
      this.y_mouse = event.touches[0].clientY - this.y();
    }
  }
  
  line(x1, y1, x2, y2, color, width) {
    this.draw_context.beginPath();
    this.draw_context.moveTo(x1, y1);
    this.draw_context.lineTo(x2, y2);
    this.draw_context.lineWidth = width;
    this.draw_context.strokeStyle = color;
    this.draw_context.stroke();
  };

  solid_circle(x, y, r, color, edgecolor) {
    this.draw_context.beginPath();
    this.draw_context.arc(x, y, r, 0, 2*Math.PI, true);
    this.draw_context.closePath();
    this.draw_context.fillStyle = color;
    this.draw_context.fill();
    this.draw_context.strokeStyle = edgecolor;
    this.draw_context.lineWidth = 1;
    this.draw_context.stroke();
  };

  solid_line(
      x1, y1, x2, y2, th, color, edgecolor) {
    var dx = y1 - y2;
    var dy = x2 - x1;
    var d  = Math.sqrt(dx*dx + dy*dy);
    dx /= d;
    dy /= d;
    this.draw_context.beginPath();
    this.draw_context.moveTo(x1 + dx * th, y1 + dy * th);
    this.draw_context.lineTo(x2 + dx * th, y2 + dy * th);
    this.draw_context.lineTo(x2 - dx * th, y2 - dy * th);
    this.draw_context.lineTo(x1 - dx * th, y1 - dy * th);
    this.draw_context.closePath();
    this.draw_context.fillStyle = color;
    this.draw_context.fill();
    this.draw_context.strokeStyle = edgecolor;
    this.draw_context.linewidth = 1;
    this.draw_context.stroke();
  };

  quad(
      x1, y1, x2, y2, x3, y3, x4, y4, 
      color, edgecolor) {
    this.draw_context.beginPath();
    this.draw_context.moveTo(x1, y1);
    this.draw_context.lineTo(x2, y2);
    this.draw_context.lineTo(x3, y3);
    this.draw_context.lineTo(x4, y4);
    this.draw_context.closePath();
    this.draw_context.fillStyle = color;
    this.draw_context.fill();
    this.draw_context.strokeStyle = edgecolor;
    this.draw_context.lineWidth = 1;
    this.draw_context.stroke();
  };

  text(text, x, y, font, color, align) {
    this.draw_context.fillStyle = color;
    this.draw_context.font = font;
    this.draw_context.textAlign = align;
    this.draw_context.textBaseline = 'middle';
    this.draw_context.fillText(text, x, y);
  }

  get_textwidth(text, font) {
    this.draw_context.font = font;
    this.draw_context.textAlign = 'center';
    return this.draw_context.measureText(text).width;
  }
  
  draw_popup(x, y, text, fillstyle) {
    var h = 20;
    var w = this.get_textwidth(text, '10px sans-serif') + 20;
    var y1 = 30;
    var arrow_w = 5;
    this.draw_context.beginPath();
    this.draw_context.moveTo(x-arrow_w, y-y1);
    this.draw_context.lineTo(x, y);
    this.draw_context.lineTo(x+arrow_w, y-y1);
    this.draw_context.lineTo(x+w/2, y-y1);
    this.draw_context.lineTo(x+w/2, y-h-y1);
    this.draw_context.lineTo(x-w/2, y-h-y1);
    this.draw_context.lineTo(x-w/2, y-y1);
    this.draw_context.closePath();
    this.draw_context.fillStyle = fillstyle;
    this.draw_context.fill();
    this.text(
        text, x, y-h/2-y1, '10px sans-serif', '#000', 'center');
  };

  draw_background() {
    var w = this.width();
    var h = this.height();
    this.half_width = w/2;
    this.half_height = h/2;
    this.set_scale();
    this.draw_context.clearRect(0, 0, w, h); 
    this.line(w/2, 0, w/2, h, "#040", 1);
    this.line(0, h/2, w, h/2, "#040", 1);
  }

}


export {
  CanvasWidget,
  pos_dom,
}
