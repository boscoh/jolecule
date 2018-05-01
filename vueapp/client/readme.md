
# A Vue.js project

- vue-cli webpack project [more details](http://vuejs-templates.github.io/webpack/)
- `vue init webpack` [docs for vue-loader](http://vuejs.github.io/vue-loader)
- rpc-json interface to a server
- basic db architecture
- vue material setup
- a basic user management page
- persistent user sessions
- routers setup
- es6 babel compilation 
    - async/await - they're great! 
- eslint standard coding style
- in client handle failure to rpc properly - handle failed rpc and 
  turn into errors

## Build Setup

First install all the libraries:

    npm install

Then build the client to the `dist` directory for production
with minification:

    npm run build

This can then be opened as a static file in `dist/index.html`

During development, a hot-reloading version can be run on port 8030:

    npm run dev

This Vue install

- vue init webpack (version 2.9.3)
​- config.build.assetsPublicPath = './'
- .eslintrc.js parserOptions.ecmaVersion = 7

