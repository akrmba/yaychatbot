import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/widget.js",
  format: "iife",
  target: "es2020",
  minify: !isWatch,
  sourcemap: isWatch,
  legalComments: "none",
  define: {
    "process.env.NODE_ENV": isWatch ? '"development"' : '"production"',
  },
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("[widget] watching for changes…");
} else {
  await esbuild.build(config);
  const { statSync } = await import("fs");
  const raw = statSync("dist/widget.js").size;
  console.log(`[widget] dist/widget.js — ${(raw / 1024).toFixed(1)}kb raw`);
}
