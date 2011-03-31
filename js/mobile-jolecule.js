//////////////////////////////////////////////////////////
// 
// jolecule - the javascript based protein/dna viewer
//
// relies on server jolecule.appspot.com, which, in turn
// relies on the RCSB website http://www.pdb.org.
//
///////////////////////////////////////////////////////////


function get_pdb_id_from_url(loc) {
  var pieces = loc.split('#')[0].split('/');
  var i = pieces.length-1;
  return pieces[i];
}


function load_protein_onto_page(
    header_tag, central_pad_tag, view_tag, pdb_id) {
  
  var view_dom; 
  var canvas_dom;
  var loading_dialog;
  var is_view_displayed = true;
  var protein;
  var scene;
  var controller;
  var protein_display;

  toggle_text_state = function() {
    is_view_displayed = !is_view_displayed;
    if (is_view_displayed) {
      view_dom.show();
      canvas_dom.height = 260;
    } else {
      view_dom.hide();
      canvas_dom.height = 380;
    }
    window.scrollTo(0, 1);
    scene.changed = true;
  }
  
  change_text = function(id) {
    view = scene.saved_views_by_id[id];
    var n_view = scene.saved_views.length-1;
    var title = '<b>' + view.order + '/' + n_view + ': </b>';
    if (view.order > 0) {
      author_str = '~ ' + view.creator + 
              ' @' + view.time;
    } else {
      author_str = '';
    }
    view_dom
        .addClass("annotation_text")
        .html(title + view.text)
        .append($("<div>")
          .addClass("author")
          .html(author_str))
  }

  set_target_by_view_id = function(id) {
    controller.set_target_view_by_id(id);
    change_text(id);
  }
  
  goto_prev_view = function() {
    scene.i_last_view -= 1;
    if (scene.i_last_view < 0) {
      scene.i_last_view = scene.saved_views.length - 1;
    }
    var id = scene.saved_views[scene.i_last_view].id;
    set_target_by_view_id(id);
  }
  
  goto_next_view = function() {
    scene.i_last_view += 1;
    if (scene.i_last_view >= scene.saved_views.length) {
      scene.i_last_view = 0;
    }
    var id = scene.saved_views[scene.i_last_view].id;
    set_target_by_view_id(id);
  }

  load_views_from_server = function() {

    function success(data, textStatus, XMLHttpRequest) {
      var view_dicts = eval(data);
      controller.load_views_from_flat_views(view_dicts);
      hash_tag = url().split('#')[1];
      if (hash_tag in scene.saved_views_by_id) {
        set_target_by_view_id(hash_tag);
        scene.is_new_view_chosen = true;
      }
      change_text(controller.scene.current_view.id);
    }
    var pdb_id = scene.protein.pdb_id;

    $.get('/ajax/load_views_of_pdb/' + pdb_id, success);
  }

  var prev_item = $('<a>')
      .attr('id', 'prev_view')
      .attr('class', 'button')
      .attr('href', '')
      .html('&laquo;')
      .click(function() { goto_prev_view(); return false; });

  var next_item = $('<a>')
      .attr('id', 'next_view')
      .attr('class', 'button')
      .attr('href', '')
      .html('&raquo;')
      .click(function() { goto_next_view(); return false; }); 

  var toggle_text = $('<a>')
      .attr('id', 'toggle_text')
      .attr('class', 'button')
      .attr('href', '')
      .html('T')
      .click(function() { toggle_text_state();  return false; });  

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
      .ajaxError(
        function(event, XMLHttpRequest, ajaxOptions) {
            $(this).text('Server timed out.');
        });
    c.append(loading_dialog)
    return loading_dialog;
  }

  function process_server_pdb_data(data) {
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
    
    load_views_from_server();

    document.oncontextmenu = do_nothing;
    window.scrollTo(0, 1);
  }

  function create_canvas_dom(central_pad_tag) {
    var top_dom = $(central_pad_tag);
    var w = top_dom.width();
    var h = top_dom.height();
    var canvas = $('<canvas>')
      .css('background-color', 'black')
    canvas_dom = canvas[0];
    canvas_dom.width = w;
    canvas_dom.height = h;
    top_dom.append(canvas);
    return canvas_dom;
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
      if (scene.changed) {
        protein_display.draw();
        scene.changed = false;
      }
      last_time = curr_time;
    }
    interval_id = setInterval(loop, ms_per_step);
  }

  view_dom = $(view_tag);
  create_header_div(header_tag);
  canvas_dom = create_canvas_dom(central_pad_tag);
  loading_dialog = create_loading_dialog(
      central_pad_tag, pdb_id);

  $.get('/pdb/' + pdb_id + '.js', process_server_pdb_data);
  
  return start_loop;
}


function init_after_page_loaded() {
  var pdb_id = get_pdb_id_from_url(url());
  $('title').html('jolecule - pdb:' + pdb_id);
  start_loop = load_protein_onto_page(
      '#mobile-header', '#central-pad', 
      '#mobile-view', pdb_id);
  start_loop();
}


if (window.addEventListener) {
  window.addEventListener('load', init_after_page_loaded, false); 
}
