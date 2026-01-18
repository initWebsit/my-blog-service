module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    // 要求不使用分号，并可以自动修复
    semi: ['error', 'never'],
    'semi-spacing': 'off',
    'no-unused-vars': ['error', { 'varsIgnorePattern': '^React$' }],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
  },
}

