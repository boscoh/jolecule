<template>
  <md-toolbar
    class="md-dense">

    <h2
      class="md-title"
      style="
        padding-left: 1em;
        cursor: pointer;
        flex: 1"
      @click="home()">
      {{ title }}
    </h2>

    <div v-if="isUser">

      <md-menu v-if="user.authenticated">

        <md-button md-menu-trigger>
          {{user.name}}
        </md-button>

        <md-menu-content>

          <md-menu-item @click="editUser">
            Edit User
          </md-menu-item>

          <md-menu-item @click="logout">
            Logout
          </md-menu-item>

        </md-menu-content>

      </md-menu>

      <router-link
        v-else
        to='/login'
        tag='md-button'>
        Login
      </router-link>

    </div>

  </md-toolbar>
</template>

<script>
import auth from '../modules/auth'
import config from '../config'

export default {
  name: 'navbar',
  data () {
    return {
      title: config.title,
      isUser: config.isUser
    }
  },
  computed: {
    user: function () {
      return this.$store.state.user
    }
  },
  methods: {
    editUser () {
      this.$router.push('/edit-user')
    },
    home () {
      this.$router.push('/')
    },
    async logout () {
      await auth.logout()
      this.$router.push('/login')
    }
  }
}
</script>
