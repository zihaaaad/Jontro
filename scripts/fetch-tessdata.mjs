// One-time setup script: downloads the Tesseract trained language data
// (English + Bengali) used by the OCR tool into public/tessdata/, so the
// app can run OCR fully offline afterwards (langPath points at this folder).
//
// This is a deliberate one-time exception to the "0-cloud" architecture:
// the trained model files are multi-megabyte binaries that cannot be
// committed as source, so they're fetched once during setup instead of
// being downloaded from a CDN on every scan (which is what the app did
// before this fix, via tesseract.js's built-in CDN defaults).
//
// Run with: npm run fetch:tessdata

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'tessdata');

// Mirror maintained by the tesseract.js project, pre-gzipped in the exact
// format the library expects (langPath + gzip: true).
const BASE_URL = 'https://tessdata.projectnaptha.com/4.0.0_fast';
const LANGS = ['eng', 'ben'];

async function download(lang) {
  const dest = path.join(outDir, `${lang}.traineddata.gz`);
  if (existsSync(dest)) {
    console.log(`[skip] ${lang}.traineddata.gz already present`);
    return;
  }

  const url = `${BASE_URL}/${lang}.traineddata.gz`;
  console.log(`[fetch] ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${lang}.traineddata.gz: HTTP ${res.status}`);
  }
  await pipeline(res.body, createWriteStream(dest));
  console.log(`[done] ${lang}.traineddata.gz`);
}

async function main() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  for (const lang of LANGS) {
    await download(lang);
  }
  console.log('\nAll language data downloaded. OCR will now run fully offline.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
