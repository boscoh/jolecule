<template>
    <v-app id="app">
        <v-main>
            <v-toolbar dense>
                <v-toolbar-title>{{ title }}</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn text to="/">Home</v-btn>
                <v-btn text to="/about">About</v-btn>
            </v-toolbar>
            <router-view />
        </v-main>
    </v-app>
</template>

<style></style>

<script>
import config from './config'
export default {
    data() {
        return {
            title: config.title,
        }
    },
}
</script>
