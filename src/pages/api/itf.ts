import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: rawPath, ...queryParams } = req.query;

  const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;

  if (!path) {
    return res.status(400).json({ error: 'Path is required' });
  }

  const targetUrl = `https://www.itftennis.com/tennis/api/${path}`;
  const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

  try {
    // Log the request attempt (visible in Vercel logs)
    console.log(`Proxying request to: ${fullUrl}`);

    // Use a high-quality browser User-Agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': userAgent,
        'Referer': 'https://www.itftennis.com/',
        'Origin': 'https://www.itftennis.com',
      },
      // Short timeout (10s) to avoid Vercel killing the function without a response
      signal: AbortSignal.timeout(9000) as any,
    });

    const text = await response.text();

    if (!response.ok) {
      console.warn(`ITF API returned error status ${response.status}:`, text.substring(0, 500));
    }

    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      // Forward the upstream status, but ensure we return 200/400/etc.
      res.status(response.status).json(data);
    } catch {
      // If not JSON, it might be an HTML error page or block page
      console.error(`Proxy: ITF returned non-JSON (status ${response.status}). Preview:`, text.substring(0, 500));

      // Return 502 with the preview so the developer can see it in the Network tab
      res.status(502).json({
        error: 'ITF API returned non-JSON response (likely blocked)',
        upstreamStatus: response.status,
        preview: text.substring(0, 500),
      });
    }
  } catch (error: any) {
    console.error('Proxy error:', error);

    if (error.name === 'TimeoutError') {
      return res.status(504).json({ error: 'ITF API request timed out' });
    }

    res.status(500).json({
      error: 'Failed to fetch data from ITF API',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
