import js from '@eslint/js';
import globals from 'globals';
import html from 'eslint-plugin-html';

export default [
  { ignores: ['dist/', 'node_modules/', '.playwright-mcp/'] },
  js.configs.recommended,
  {
    // index.html 안의 <script>도 검사한다
    files: ['**/*.html'],
    plugins: { html },
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    // 브라우저와 Node(테스트) 양쪽에서 쓰는 UMD 스크립트
    files: ['roulette.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, ...globals.commonjs } },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
