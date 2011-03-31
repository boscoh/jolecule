//////////////////////////////////////////////////////////
// 
// jolecule - the javascript based protein/dna viewer
//
// relies on server jolecule.appspot.com, which, in turn
// relies on the RCSB website http://www.pdb.org.
//
///////////////////////////////////////////////////////////


var keyboard_lock = false;

var protein;
var scene;
var controller;
var canvas;
var protein_display;
var annotations_display;


///////////////////////////////////////////////
// The annotations objects that keeps track of 
// the HTML5 controls on the browswer
///////////////////////////////////////////////

var SingleAnnotationDisplay = function(view_tag, scene, controller) {
  this.scene = scene;
  this.controller = controller;
  this.is_displayed = true;
  this.view_dom = $(view_tag);
  
  this.toggle_text = function() {
    this.is_displayed = !this.is_displayed;
    if (this.is_displayed) {
      $('#text').show();
      $('#imageView')[0].height = 260;
    } else {
      $('#text').hide();
      $('#imageView')[0].height = 380;
    }
    window.scrollTo(0, 1);
    this.scene.changed = true;
  }
  
  this.set_target_by_view_id = function(id) {
    this.controller.set_target_view_by_id(id);
    this.change_text(id);
  }
  
  this.change_text = function(id) {
    var this_item = this;
    var view = this.scene.saved_views_by_id[id];
    var n_view = this.scene.saved_views.length-1;
    var title = '<b>' + view.order + '/' + n_view + ': </b>';
    if (view.order > 0) {
      author_str = '~ ' + view.creator + 
              ' @' + view.time;
    } else {
      author_str = '';
    }
    this.view_dom
        .addClass("annotation_text")
        .html(title + view.text)
        .append($("<div>")
          .addClass("author")
          .html(author_str))
  }

  this.goto_prev_view = function() {
    var scene = this.scene;
    scene.i_last_view -= 1;
    if (scene.i_last_view < 0) {
      scene.i_last_view = scene.saved_views.length - 1;
    }
    var id = scene.saved_views[scene.i_last_view].id;
    this.set_target_by_view_id(id);
  }
  
  this.goto_next_view = function() {
    var scene = this.scene;
    scene.i_last_view += 1;
    if (scene.i_last_view >= scene.saved_views.length) {
      scene.i_last_view = 0;
    }
    var id = scene.saved_views[scene.i_last_view].id;
    this.set_target_by_view_id(id);
  }

  this.load_views_from_server = function(after_success) {
    var scene = this.scene;
    var annotations_display = this;
    var controller = this.controller;
    function success(data, textStatus, XMLHttpRequest) {
      var view_dicts = eval(data);
      controller.load_views_from_flat_views(view_dicts);
      hash_tag = url().split('#')[1];
      if (hash_tag in scene.saved_views_by_id) {
        annotations_display.set_target_by_view_id(hash_tag);
        scene.is_new_view_chosen = true;
      }
      annotations_display.change_text(
          controller.scene.current_view.id);
    }
    var pdb_id = this.scene.protein.pdb_id;
    $.get('/ajax/load_views_of_pdb/' + pdb_id, success);
  }
}


// other initializations


function resize_all_displays_in_window(event) {
}


function get_pdb_id_from_url(loc) {
  var pieces = loc.split('#')[0].split('/');
  var i = pieces.length-1;
  return pieces[i];
}


function load_protein_onto_page(header_tag, central_pad_tag, view_tag, pdb_id) {
  var prev_item = $('<a>')
      .attr('id', 'prev_view')
      .attr('class', 'button')
      .attr('href', '')
      .html('&laquo;');
  var next_item = $('<a>')
      .attr('id', 'next_view')
      .attr('class', 'button')
      .attr('href', '')
      .html('&raquo;');
  var toggle_text = $('<a>')
      .attr('id', 'toggle_text')
      .attr('class', 'button')
      .attr('href', '')
      .html('T');
  var loading_dialog;
  var canvas_dom;
  
  function create_header_div(header_tag) {
    $(header_tag)
        .append($('<div>')
          .css('float', 'left')
          .append($('<a>')
              .attr('href', '/')
              .text('jolecule')))
        .append($('<div>')
          .css('float', 'right')
          .append(prev_item)
          .append(' ')
          .append(next_item)
          .append(' &nbsp;&nbsp; ')
          .append(toggle_text))
        .append('<br clear=all>');
  }

  function create_loading_dialog(parent_dom, pdb_id) {
    var c = $(parent_dom);
    var offset = c.position()
    var loading_dialog = $('<div></div>')
      .attr('id', 'loading_message')
      .css({
          'position':'absolute',
          'z-index':9000,
          'top':offset.top + 30,
          'left':offset.left + 30,
          'width': '250px',
      })
      .append('Loading ' + pdb_id + ' from server. ' +
              'If for the first time, the structure needs ' +
              'to be downloaded from rcsb.org, and bonds ' +
              'need to be calculated. This may take several ' +
              'minutes for large structures. ' +
              'After, the structure is cached on the server.')
    loading_dialog.ajaxError(
        function(event, XMLHttpRequest, ajaxOptions) {
            $(this).text('Server timed out.');
        });
    c.append(loading_dialog)
    return loading_dialog;
  }

  function success(data, textStatus, XMLHttpRequest) {
    eval(data);
    if ("// Sorry" == data.substring(0, 8)) {
      loading_dialog.html('PDB file too big.');
      return;
    }
    if (typeof lines == "undefined" || lines.length == 0) {
      loading_dialog.html('Structure not found');
      return;
    }
    loading_dialog.remove();
    if (typeof filename == 'undefined') {
      filename = '';
    }
    protein = new Protein();
    protein.load(pdb_id, lines, bond_pairs, max_length, filename);
    scene = new Scene(protein);
    controller = new Controller(scene)
    canvas = new Canvas(canvas_dom);

    protein_display = new ProteinDisplay(scene, canvas, controller);
    protein_display.min_radius = 10;
    protein_display.zslab_display.width = 40;
    
    annotations_display = new SingleAnnotationDisplay(scene, controller);
    annotations_display.load_views_from_server();

    document.oncontextmenu = do_nothing;
    $(window).resize(function() { 
        resize_all_displays_in_window(); 
        scene.changed = true; 
    });
    window.onorientationchange = function() { 
        resize_all_displays_in_window(); 
        scene.changed = true;
    }
    toggle_text.click(function() {
        annotations_display.toggle_text();
        return false; 
    });  
    prev_item.click(function() {
        annotations_display.goto_prev_view();
        return false; 
    });  
    next_item.click(function() {
        annotations_display.goto_next_view();
        return false;
    });  

    window.scrollTo(0, 1);
  }

  function create_canvas_dom(central_pad_tag) {
    var top_dom = $(central_pad_tag);
    var w = $(central_pad_tag).width();
    var h = $(central_pad_tag).height();
    canvas = $('<canvas>')
      .attr('id', 'imageView')
      .css('background-color', 'black')
    canvas_dom = canvas[0];
    canvas_domwidth = w;
    canvas_dom.height = h;
    top_dom.append(canvas);
    return canvas_dom;
  }
  create_header_div(header_tag);
  canvas_dom = create_canvas_dom(central_pad_tag);
  loading_dialog = create_loading_dialog(central_pad_tag, pdb_id);
  $.get('/pdb/' + pdb_id + '.js', success);
}


function redraw_other_displays() {
  for (i=0; i<protein.residues.length; i+=1) {
    protein.residues[i].selected = false;
  }
  if ('selected' in scene.current_view) {
    if ((typeof scene.current_view.selected !== "undefined") 
        && (scene.current_view.selected != "")) {
      var selected_residues = eval(scene.current_view.selected);
      if (selected_residues !== null) {
        for (i=0; i<selected_residues.length; i+=1) {
          var j = selected_residues[i];
          protein.residues[j].selected = true;
        }
      }
    }
  }
}


function draw() {
  if (scene.changed) {
    if (scene.is_new_view_chosen) {
      redraw_other_displays();
      scene.is_new_view_chosen = false;
    }
    protein_display.draw();
    scene.changed = false;
  }
}
  

function start_loop() {
  ms_per_step = 25;
  last_time = (new Date).getTime();
  loop = function() {
    if (typeof scene === 'undefined') {
      return;
    }
    curr_time = (new Date).getTime();
    n_step = (curr_time - last_time)/ms_per_step;
    if (n_step < 1) {
      n_step = 1;
    }
    for (var i=0; i<n_step; i++) {
      scene.animate();
    }
    draw();
    last_time = curr_time;
  }
  interval_id = setInterval(loop, ms_per_step);
}


function init_after_page_all_loaded() {
  resize_all_displays_in_window();
  var pdb_id = get_pdb_id_from_url(url());
  $('title').html('jolecule - pdb:' + pdb_id);
  load_protein_onto_page('#mobile-header', '#central_pad', '#text', pdb_id);
  start_loop();
}


if (window.addEventListener) {
  window.addEventListener('load', init_after_page_all_loaded, false); 
}
