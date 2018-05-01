import Vue from 'vue'
import Router from 'vue-router'

import Home from './components/Home'
import Login from './components/Login'
import Register from './components/Register'
import EditUser from './components/EditUser'
import AdminUsers from './components/AdminUsers'
import ResetPassword from './components/ResetPassword'

Vue.use(Router)

let router = new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/register',
      name: 'register',
      component: Register
    },
    {
      path: '/edit-user',
      name: 'editUser',
      component: EditUser
    },
    {
      path: '/admin-users',
      name: 'adminUsers',
      component: AdminUsers
    },
    {
      path: '/reset-password/:tokenId',
      name: 'resetPassword',
      component: ResetPassword
    }
  ]
})

export default router
