import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: [
      "dist/**",
      "public/mockServiceWorker.js",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  pluginReact.configs.flat.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    settings: {
      react: {
        version: "detect", // Auto-detect React version from package.json
      },
    },
    rules: {
      // Disable react-in-jsx-scope - not needed with React 17+ new JSX transform
      "react/react-in-jsx-scope": "off",
      // Allow numbers in template literal expressions
      "@typescript-eslint/restrict-template-expressions": ["error", {
        allowNumber: true,
      }],
      // Ignore unused variables starting with underscore
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
    },
  },
)
