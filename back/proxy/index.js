const express = require('express');
const initCycleTLS = require('cycletls');

const app = express();
const ITF_BASE_URL = 'https://www.itftennis.com/tennis/api';

let cycleTLS = null;
initCycleTLS().then(c => {
  cycleTLS = c;
  console.log('CycleTLS ready');
}).catch(err => console.error('CycleTLS init failed:', err.message));

function isBlocked(body) {
  return !body || body.trimStart().startsWith('<');
}

async function fetchWithCycleTLS(url) {
  if (!cycleTLS) throw new Error('CycleTLS not ready');
  const response = await cycleTLS(url, {
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.itftennis.com/',
      'Cache-Control': 'no-cache',
    },
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-21,29-23-24,0',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    timeout: 10,
  }, 'get');
  const body = await response.text();
  return { status: response.status, body };
}

async function fetchFromITF(endpoint, params) {
  const qs = params && Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';
  const url = `${ITF_BASE_URL}/${endpoint}${qs}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await fetchWithCycleTLS(url);
      if (!isBlocked(result.body)) return result;
      console.log(`[blocked] ${endpoint} — attempt ${attempt}/3`);
    } catch (err) {
      console.log(`[cycletls failed] ${endpoint}: ${err.message} — attempt ${attempt}/3`);
    }
  }

  console.error(`[failed] ${endpoint} — all 3 attempts blocked`);
  return { status: 502, body: JSON.stringify({ error: 'blocked after 3 attempts' }) };
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

app.listen(3000, () => console.log('ITF proxy running on port 3000'));
