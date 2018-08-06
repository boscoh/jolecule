/**
 * @fileoverview Main entry point of the Vue app
 */

import Vue from 'vue'
import VueMaterial from 'vue-material'

import config from './config.js'
import auth from './modules/auth'
import App from './App'
import router from './router.js'
import store from './store'

Vue.config.productionTip = false
Vue.use(VueMaterial)
Vue.material.registerTheme('default', {
  primary: 'black'
})

document.title = config.title

async function init () {
  if (config.isUser) {
    await auth.restoreLastUser()
  }
  return new Vue({
    el: '#app',
    router,
    store,
    template: '<App/>',
    components: {App}
  })
}

init()
