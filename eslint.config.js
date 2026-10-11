import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { ignores: ['dist/', 'node_modules/', 'artefatos/', 'coverage/'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
  },
  {
    // Service worker (ADR-0010): JS puro, que o build copia para o sw.js sem empacotar.
    files: ['src/offline/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.serviceworker },
  },
  {
    files: ['scripts/**/*.mjs', 'vite.config.ts', 'eslint.config.js'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.node },
  },
]);
