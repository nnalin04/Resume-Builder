/**
 * Vercel serverless proxy — forwards /api/* to the Oracle backend.
 *
 * Two secrets kept out of source code (set in Vercel env vars):
 *   ORACLE_BACKEND_URL  — e.g. http://80.225.223.142:8000
 *   BACKEND_SECRET      — random token shared with FastAPI middleware
 *
 * The Oracle backend rejects requests that lack the X-Backend-Secret header,
 * so direct access to the Oracle IP returns 403.
 */

export const config = {
  api: {
    bodyParser: false,        // stream the raw body — needed for multipart file uploads
    responseLimit: '50mb',    // allow PDF / file responses
  },
};

const ORACLE_URL = process.env.ORACLE_BACKEND_URL;
const SECRET     = process.env.BACKEND_SECRET ?? '';

export default async function handler(req, res) {
  if (!ORACLE_URL) {
    res.status(503).json({ detail: 'Backend not configured' });
    return;
  }

  // Reconstruct the target URL (path + query string)
  const pathParts = Array.isArray(req.query.path) ? req.query.path : [req.query.path ?? ''];
  const qs        = req.url?.split('?')[1];
  const target    = `${ORACLE_URL}/api/${pathParts.join('/')}${qs ? '?' + qs : ''}`;

  // Forward safe headers, inject the shared secret
  const forward = { 'X-Backend-Secret': SECRET };
  for (const [key, val] of Object.entries(req.headers)) {
    const lk = key.toLowerCase();
    if (['host', 'connection', 'transfer-encoding', 'keep-alive'].includes(lk)) continue;
    forward[key] = Array.isArray(val) ? val.join(', ') : val;
  }

  // Buffer the raw body (handles JSON, multipart, binary)
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  let upstream;
  try {
    upstream = await fetch(target, {
      method:  req.method ?? 'GET',
      headers: forward,
      body:    body?.length > 0 ? body : undefined,
    });
  } catch (err) {
    res.status(502).json({ detail: `Backend unreachable: ${err.message}` });
    return;
  }

  // Forward status + response headers
  res.status(upstream.status);
  for (const [key, val] of upstream.headers.entries()) {
    const lk = key.toLowerCase();
    if (['transfer-encoding', 'connection', 'keep-alive'].includes(lk)) continue;
    res.setHeader(key, val);
  }

  // Stream response body back to browser
  const buf = await upstream.arrayBuffer();
  res.end(Buffer.from(buf));
}
