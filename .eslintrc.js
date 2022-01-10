module.exports = {
  root: true,
  env: {
    'node': true,
    'browser': false,
    // commonjs: true,
    es6: true,
  },
  parserOptions: {
    // parser: '@babel/eslint-parser',
    'parser': 'babel-eslint',
    requireConfigFile: false,
    ecmaVersion: 'latest'
    // 'ecmaFeatures': {
    //   'experimentalObjectRestSpread': true,
    //   'jsx': false
    // },
    // 'ecmaVersion': 'latest',
    // sourceType: 'module',
  },
  extends: [
    'eslint:recommended'
    // '@nuxtjs',
    // 'plugin:nuxt/recommended',
  ],
  settings: {
    'import/resolver': {
      node: { extensions: ['.js', '.mjs'] }
    }
  },
  plugins: [
  ],
  // add your custom rules here
  rules: {
    'indent': ['error', 2, { 'SwitchCase': 1 }],
    'linebreak-style': ['error', 'unix'],
    'no-console': 0,
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  }
};
