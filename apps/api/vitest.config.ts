import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "./src",
    globals: true,
    include: ["**/*.test.ts", "**/*.spec.ts"],
    testTimeout: 30_000,
  },
});
