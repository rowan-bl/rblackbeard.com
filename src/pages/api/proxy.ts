import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path, ...queryParams } = req.query;

  if (!path) {
    return res.status(400).json({ error: 'Path is required' });
  }

  const targetUrl = `https://www.itftennis.com/tennis/api/${path}`;
  const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

  try {
    const clientUA = req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': clientUA,
        'Referer': 'https://www.itftennis.com/',
      },
    });

    const text = await response.text();

    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      res.status(response.status).json(data);
    } catch {
      // ITF returned non-JSON (e.g. HTML error page)
      console.error(`Proxy: ITF returned non-JSON (status ${response.status}):`, text.substring(0, 500));
      res.status(502).json({
        error: 'ITF API returned non-JSON response',
        upstreamStatus: response.status,
        preview: text.substring(0, 200),
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Failed to fetch data from ITF API',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
