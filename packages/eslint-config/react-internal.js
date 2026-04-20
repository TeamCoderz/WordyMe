/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import { config as baseConfig } from './base.js';

const reactFiles = ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'];
const nonReactConfigFiles = ['**/*.config.{js,mjs,cjs,ts,mts,cts}'];
const reactVersion = '19.0';

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config[]} */
export const config = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    files: reactFiles,
    ignores: nonReactConfigFiles,
    ...pluginReact.configs.flat.recommended,
  },
  {
    files: reactFiles,
    ignores: nonReactConfigFiles,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    files: reactFiles,
    ignores: nonReactConfigFiles,
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    settings: { react: { version: reactVersion } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
];
