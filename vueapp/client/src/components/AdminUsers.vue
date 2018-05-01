<template>
  <div style="padding: 10px">

    <h2 class="md-display-2">
      Users
    </h2>

    <md-list>
      <md-list-item
        v-for="user of users"
        :key="user.id">
        {{ user.name }} - {{user.email}}
        <md-button
          @click="deleteUser(user.id)">
          <md-icon
            md-mini>
            delete
          </md-icon>
        </md-button>
      </md-list-item>
    </md-list>

  </div>
</template>

<script>
import rpc from '../modules/rpc'

export default {
  name: 'AdminUser',
  data () {
    return {
      users: []
    }
  },
  async mounted () {
    let response = await rpc.rpcRun('adminGetUsers')
    if (response.result) {
      console.log('> AdminUsers.mounted users', response.result.users)
      this.users = response.result.users
    }
  },
  methods: {
    async deleteUser (userId) {
      let response = await rpc.rpcRun('adminDeleteUser', userId)
      if (response.result) {
        console.log('> AdminUsers.deleteUser remaining', response.result.users)
        this.users = response.result.users
      }
    }
  }
}
</script>
