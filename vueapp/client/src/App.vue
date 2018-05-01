<template>
  <div id='app'>
    <navbar></navbar>
    <router-view></router-view>
  </div>
</template>

<style>
  @import "../node_modules/vue-material/dist/vue-material.css";
  @import "http://fonts.googleapis.com/css?family=Roboto:300,400,500,700,400italic";
  @import "http://fonts.googleapis.com/icon?family=Material+Icons";
</style>

<script>
import Navbar from './components/Navbar.vue'
export default {
  name: 'app',
  components: {Navbar}
}
</script>
