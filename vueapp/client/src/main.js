/**
 * @fileoverview Main entry point of the Vue app
 */

import Vue from 'vue'
import VueMaterial from 'vue-material'
import Router from 'vue-router'

import config from './config.js'
import Home from './components/Home'
import App from './App'

Vue.use(Router)

let router = new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    }
  ]
})

Vue.config.productionTip = false
Vue.use(VueMaterial)
Vue.material.registerTheme('default', {
  primary: 'white'
})

document.title = config.title

async function init () {
  return new Vue({
    el: '#app',
    router,
    template: '<App/>',
    components: {App}
  })
}

init()
