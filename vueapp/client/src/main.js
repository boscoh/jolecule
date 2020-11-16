import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import 'font-awesome/css/font-awesome.min.css' // Ensure you are using css-loader

Vue.config.productionTip = false
Vue.use(Vuetify)
new Vue({
    router,
    store,
    vuetify: new Vuetify({ icons: { iconfont: 'fa4' }, theme: { light: true } }),
    render: h => h(App),
}).$mount('#app')
