<template>
  <div id='app'>
    <md-toolbar>
      <h3
        class="md-title">
        {{  title  }}
      </h3>
    </md-toolbar>
    <router-view></router-view>
  </div>
</template>

<style>
  @import "../node_modules/vue-material/dist/vue-material.css";
  @import "http://fonts.googleapis.com/css?family=Roboto:300,400,500,700,400italic";
  @import "http://fonts.googleapis.com/icon?family=Material+Icons";
</style>

<script>
import config from './config'
export default {
  name: 'app',
  data () {
    return {
      title: config.title
    }
  }
}
</script>
