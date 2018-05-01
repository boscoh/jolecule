/**
 * @fileOverview Authentication module. Provides routines
 * to authenticate with the server, as well as a central
 * location to access the user credentials.
 *
 * Note: did not put in Vuex.store as the user login should
 * be queried before Vue starts up, so make it a global
 * outside Vue
 */

import _ from 'lodash'
import sha224 from 'crypto-js/sha224'
import util from '../modules/util'
import rpc from '../modules/rpc'
import store from '../store'

/**
 * Converts user.rawPassword to hashed user.password
 */
function hashUserPassword (user) {
  let result = _.cloneDeep(user)
  if (!result.password && result.rawPassword) {
    result.password = sha224(result.rawPassword).toString()
    delete result.rawPassword
  }
  if (result.rawPasswordConfirm) {
    delete result.rawPasswordConfirm
  }
  return result
}

export default {

  /**
   * Queries server for user login with newUser. If
   * newUser.rawPassword is given, will hash with SHA244
   * to user.password. Then saves the user to localStorage
   *
   * @param {Object} newUser - {email, password, rawPassword}
   */
  async login (newUser) {
    let payload = hashUserPassword(newUser)
    console.log('> auth.login', payload)
    let response = await rpc.rpcRun('publicLoginUser', payload)
    console.log('> auth.login response', response)
    if (response.result) {
      let user = _.cloneDeep(store.state.user)
      _.assign(user, response.result.user)
      user.authenticated = true
      user.password = payload.password
      localStorage.setItem('user', util.jstr(user))
      store.commit('setUser', user)
    }
    return response
  },

  register (newUser) {
    let payload = hashUserPassword(newUser)
    console.log('> auth.register', payload)
    return rpc.rpcRun('publicRegisterUser', payload)
  },

  async update (editUser) {
    let payload = hashUserPassword(editUser)
    console.log('> auth.update', util.jstr(payload))
    let response = await rpc.rpcRun('loginUpdateUser', payload)
    if (response.result) {
      let user = _.cloneDeep(store.state.user)
      _.assign(user, payload)
      localStorage.setItem('user', JSON.stringify(user))
      store.commit('setUser', user)
    }
    return response
  },

  async resetPassword (tokenId, rawPassword) {
    let password = sha224(rawPassword).toString()
    console.log('> auth.resetPassword', tokenId, password)
    return rpc.rpcRun('publicForceUpdatePassword', tokenId, password)
  },

  async restoreLastUser () {
    let lastUser = JSON.parse(localStorage.getItem('user'))
    console.log('> auth.restoreLastUser from localStorage', lastUser)
    if (lastUser) {
      return this.login(lastUser)
    }
  },

  logout () {
    localStorage.removeItem('user')
    store.commit('setUser', {authenticated: false})
    return rpc.rpcRun('publicLogoutUser')
  }
}
