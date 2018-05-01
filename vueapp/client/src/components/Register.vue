<template>
  <md-layout md-align="center">
    <md-whiteframe style="margin-top: 4em; padding: 3em">
      <md-layout md-flex="50" md-align="center" md-column>

        <h2 class="md-display-2">
          Register to {{ title }}
        </h2>

        <form v-on:submit.prevent="submit">
          <md-input-container>
            <label>User name</label>
            <md-input
              type='text'
              v-model='name'
              placeholder='User name'>
            </md-input>
          </md-input-container>
          <md-input-container>
            <label>E-mail address</label>
            <md-input
              type='text'
              v-model='email'
              placeholder='E-mail address'>
            </md-input>
          </md-input-container>
          <md-input-container>
            <label>Password</label>
            <md-input
              type='password'
              v-model='rawPassword'
              placeholder='Password'>
            </md-input>
          </md-input-container>
          <md-input-container>
            <label>Confirm Password</label>
            <md-input
              type='password'
              v-model='rawPasswordConfirm'
              placeholder='Confirm Password'>
            </md-input>
          </md-input-container>
          <md-button type="submit" class="md-raised md-primary">
            Register
          </md-button>
          <div v-if="error" style="color: red">
            {{error}}
          </div>
        </form>

      </md-layout>
    </md-whiteframe>
  </md-layout>
</template>

<script>
import auth from '../modules/auth'
import config from '../config'

export default {
  name: 'Register',
  data () {
    return {
      title: config.title,
      name: '',
      email: '',
      rawPassword: '',
      rawPasswordConfirm: '',
      user: auth.user,
      error: ''
    }
  },
  methods: {
    async submit () {
      let payload = {
        name: this.$data.name,
        email: this.$data.email,
        rawPassword: this.$data.rawPassword,
        rawPasswordConfirm: this.$data.rawPasswordConfirm
      }
      let response = await auth.register(payload)

      if (response.result) {
        console.log('> Register.submit register success', response.result)
        response = await auth.login({
          email: payload.email,
          rawPassword: payload.rawPassword
        })
      }

      if (response.result) {
        console.log('> Register.submit login success', response.result)
        this.$router.push('/')
      } else {
        console.log('> Register.submit fail', response.error)
        this.error = response.error.message
      }
    }
  }
}
</script>
