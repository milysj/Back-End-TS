const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const prettier = require("eslint-config-prettier");

module.exports = [
  { ignores: ["dist", "node_modules", "coverage", "**/*.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
    },
  },
];
