/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [require.resolve("@yaychatbot/config/eslint/nestjs")],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
