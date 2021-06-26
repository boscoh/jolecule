// https://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 7
  },
  env: {
    browser: true
  },
  extends: ['plugin:vue/recommended', 'prettier/standard'],
  rules: {
    'vue/html-self-closing': [
      'error',
      {
        html: {
          void: 'never',
          normal: 'never',
          component: 'never'
        },
        svg: 'always',
        math: 'always'
      }
    ]
  }
}
