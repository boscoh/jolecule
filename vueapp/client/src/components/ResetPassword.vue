<template>
  <md-layout md-align="center">
    <md-whiteframe style="margin-top: 4em; padding: 3em">
      <md-layout md-flex="50" md-align="center" md-column>

        <h2 class="md-display-2">
          {{ title }}
        </h2>

        <form v-on:submit.prevent="submit">

          <md-input-container>
            <label>New Password</label>
            <md-input
              type='password'
              v-model='rawPassword'
              placeholder='New Password'>
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
            Save
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
export default {
  name: 'ResetPassword',
  data () {
    let tokenId = this.$route.params.tokenId
    console.log(`> ResetPassword tokenId=${tokenId}`)
    return {
      title: 'Reset Password',
      tokenId,
      rawPassword: '',
      rawPasswordConfirm: '',
      error: ''
    }
  },
  methods: {
    async submit () {
      this.error = ''
      let response = await auth.resetPassword(this.tokenId, this.rawPassword)
      if (response.result) {
        this.error = 'Password reset'
      } else {
        console.log('> ResetPassword.submit fail', response)
        this.error = response.error.message
      }
    }
  }
}
</script>
