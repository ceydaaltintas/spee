export const config = { runtime: 'edge' };

const RAILWAY_URL = 'https://spee-production.up.railway.app';
const STRIP_HEADERS = ['x-railway-edge', 'x-railway-request-id', 'x-hikari-trace', 'x-railway-static-url'];

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Path is passed explicitly via rewrite: /api/v1/:path* → /api/proxy?_p=:path*
  const pathParam = url.searchParams.get('_p') ?? '';
  const forwardParams = new URLSearchParams(url.searchParams);
  forwardParams.delete('_p');
  const qs = forwardParams.toString() ? `?${forwardParams.toString()}` : '';
  const targetUrl = `${RAILWAY_URL}/api/v1/${pathParam}${qs}`;

  const apiKey = process.env.RAILWAY_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 });
  }

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${apiKey}`);
  headers.set('Content-Type', 'application/json');

  const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  });

  const responseHeaders = new Headers(response.headers);
  for (const h of STRIP_HEADERS) {
    responseHeaders.delete(h);
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
