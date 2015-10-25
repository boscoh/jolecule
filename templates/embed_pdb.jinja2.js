<!-- jolecule widget will be inserted, style this yourself -->
<div id="jolecule-embed"></div> 

<link rel="stylesheet" type="text/css" href="{{css_dir}}/embed-jolecule.css" />
<script type="text/javascript" src="{{js_dir}}/jquery-2.0.3.js"></script>
<script type="text/javascript" src="{{js_dir}}/three.min.js"></script> 
<script type="text/javascript" src="{{js_dir}}/underscore-min.js"></script> 
<script type="text/javascript" src="{{js_dir}}/jolecule.js"></script> 
<script type="text/javascript" src="{{data_server_url}}"></script> 

<script>
  $(document).ready(
    function() {
      register_global_animation_loop(
        new EmbedJolecule({
          div_tag: '#jolecule-embed', 
          data_server: {{data_server}},
          loading_html: 'Loading PDB from RCSB web-site...', 
          loading_failure_html: 'Failed to load PDB.', 
          view_id: '{{view_id}}',  
          view_height: 60, 
          is_view_text_shown: false,
          is_loop: {{is_loop}},
          is_editable: {{is_editable}},
        })
      );
    }
  );
</script>