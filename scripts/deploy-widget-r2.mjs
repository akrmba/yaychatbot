/**
 * Deploy widget.js to Cloudflare R2
 *
 * Uploads two paths per release:
 *   /widget/latest/widget.js          — always points to HEAD
 *   /widget/<sha>/widget.js           — immutable, versioned copy
 *
 * Served via cdn.yaychatbot.com (Cloudflare R2 public bucket / custom domain).
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_R2_ACCESS_KEY_ID
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   WIDGET_VERSION   (git short SHA injected by CI)
 */

import { readFileSync } from "fs";
import { createHash } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  WIDGET_VERSION,
} = process.env;

const required = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "WIDGET_VERSION",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const widgetPath = new URL(
  "../apps/widget/dist/widget.js",
  import.meta.url
).pathname.replace(/^\/([A-Z]:)/, "$1"); // fix Windows drive letter

const body = readFileSync(widgetPath);
const etag = createHash("md5").update(body).digest("hex");

const sharedMeta = {
  Bucket: R2_BUCKET_NAME,
  Body: body,
  ContentType: "application/javascript; charset=utf-8",
  CacheControl: "public, max-age=31536000, immutable",
  Metadata: {
    "widget-version": WIDGET_VERSION,
    "content-md5": etag,
  },
};

async function upload(key, cacheControl) {
  const cmd = new PutObjectCommand({
    ...sharedMeta,
    Key: key,
    CacheControl: cacheControl,
  });
  await client.send(cmd);
  console.log(`  ✓ uploaded → ${key}`);
}

console.log(`\nDeploying widget v${WIDGET_VERSION} to R2 bucket: ${R2_BUCKET_NAME}`);

await upload(
  `widget/${WIDGET_VERSION}/widget.js`,
  "public, max-age=31536000, immutable"
);

// "latest" is mutable — short cache so CDN picks up new releases quickly
await upload(
  "widget/latest/widget.js",
  "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
);

console.log(`\nWidget URLs:`);
console.log(
  `  Versioned : https://cdn.yaychatbot.com/widget/${WIDGET_VERSION}/widget.js`
);
console.log(`  Latest    : https://cdn.yaychatbot.com/widget/latest/widget.js`);
console.log(`\nDone.\n`);
