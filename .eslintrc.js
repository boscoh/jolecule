module.exports = {
  // https://github.com/prettier/eslint-config-prettier
  extends: ["prettier", "prettier/standard"],
  // https://github.com/prettier/eslint-plugin-prettier
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error"
  },
  "scripts": {
    "lint": "eslint --ext .js,.vue src test",
    "lint-autofix": "eslint --ext .js,.vue src test --fix",
    "eslint-check": "eslint --print-config .eslintrc.js | eslint-config-prettier-check"
  }
};