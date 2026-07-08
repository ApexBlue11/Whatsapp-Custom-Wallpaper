/**
 * Smoke test: IndexedDB video save + blob URL round-trip via extension popup.
 */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_DIR = path.resolve(__dirname, '..');

async function getExtensionId(browser) {
  for (let i = 0; i < 20; i++) {
    const targets = await browser.targets();
    const sw = targets.find(t => {
      const url = t.url();
      return (t.type() === 'service_worker' || t.type() === 'background_page') &&
        url.startsWith('chrome-extension://');
    });
    if (sw) return new URL(sw.url()).host;
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Extension service worker not found');
}

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_DIR}`,
      `--load-extension=${EXT_DIR}`,
      '--no-sandbox',
      '--disable-gpu',
    ],
  });

  try {
    const extId = await getExtensionId(browser);
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extId}/popup.html`);

    const testKey = 'wa_vid_test_' + Date.now();
    const byteArray = Array.from({ length: 8192 }, (_, i) => i & 0xff);

    const result = await page.evaluate(async (key, bytes) => {
      function openVideoDB() {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('wa-themes-videos', 1);
          req.onupgradeneeded = e => e.target.result.createObjectStore('videos');
          req.onsuccess = e => resolve(e.target.result);
          req.onerror = e => reject(e.target.error);
        });
      }
      async function idbSet(k, value) {
        const db = await openVideoDB();
        return new Promise((resolve, reject) => {
          const req = db.transaction('videos', 'readwrite').objectStore('videos').put(value, k);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
      async function idbGet(k) {
        const db = await openVideoDB();
        return new Promise((resolve, reject) => {
          const req = db.transaction('videos', 'readonly').objectStore('videos').get(k);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => reject(req.error);
        });
      }

      try {
        await idbSet(key, new Uint8Array(bytes));
        const data = await idbGet(key);
        if (!data || data.length !== bytes.length) {
          return { ok: false, step: 'idb', got: data?.length };
        }
        const blob = new Blob([data], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        URL.revokeObjectURL(url);
        const db = await openVideoDB();
        await new Promise((resolve, reject) => {
          const req = db.transaction('videos', 'readwrite').objectStore('videos').delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        return { ok: true, length: data.length };
      } catch (e) {
        return { ok: false, step: 'exception', error: String(e) };
      }
    }, testKey, byteArray);

    if (!result.ok) {
      console.error('TEST FAILED:', result);
      process.exitCode = 1;
    } else {
      console.log('TEST PASSED — IndexedDB video storage OK (%d bytes)', result.length);
    }
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
