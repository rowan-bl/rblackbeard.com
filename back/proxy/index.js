const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const ITF_BASE_URL = 'https://www.itftennis.com/tennis/api';
const FAST_FETCH_TIMEOUT_MS = 3000;

let browser = null;

async function getBrowser() {
  if (browser && browser.connected) return browser;
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
    ],
  });
  browser.on('disconnected', () => { browser = null; });
  return browser;
}

function isBlocked(body) {
  return body.trimStart().startsWith('<');
}

async function fetchFast(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FAST_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://www.itftennis.com/',
        'Cache-Control': 'no-cache',
      },
    });
    const body = await response.text();
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithPuppeteer(url) {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const body = await page.evaluate(() => document.body.innerText);
    return { status: 200, body };
  } finally {
    await page.close();
  }
}

async function fetchFromITF(endpoint, params) {
  const qs = params && Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';
  const url = `${ITF_BASE_URL}/${endpoint}${qs}`;

  try {
    const result = await fetchFast(url);
    if (!isBlocked(result.body)) return result;
    console.log(`[blocked] ${endpoint} — retrying with Puppeteer`);
  } catch (err) {
    console.log(`[fast-fetch failed] ${endpoint}: ${err.message} — retrying with Puppeteer`);
  }

  return fetchWithPuppeteer(url);
}

app.get('/api/itf/*path', async (req, res) => {
  try {
    const pathParam = req.params.path;
    const endpoint = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
    const { status, body } = await fetchFromITF(endpoint, req.query);
    res.status(status).set('Content-Type', 'application/json').send(body);
  } catch (err) {
    console.error('[error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Warm up browser at startup so first Puppeteer fallback isn't cold
getBrowser()
  .then(() => console.log('Browser ready'))
  .catch(err => console.error('Browser init failed:', err.message));

app.listen(3000, () => console.log('ITF proxy running on port 3000'));
