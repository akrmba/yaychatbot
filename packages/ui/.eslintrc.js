/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [require.resolve("@yaychatbot/config/eslint/react")],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
