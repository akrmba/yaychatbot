/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "./base.js",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    browser: true,
    es2021: true,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
