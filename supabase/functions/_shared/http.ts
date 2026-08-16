const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://tauri.localhost', 'tauri://localhost'];

function allowedOrigins(): Set<string> {
  const configured =
    Deno.env
      .get('ALLOWED_ORIGINS')
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];
  return new Set([...DEFAULT_ORIGINS, ...configured]);
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'Origin',
  };
  if (origin && allowedOrigins().has(origin)) headers['access-control-allow-origin'] = origin;
  return headers;
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || allowedOrigins().has(origin);
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'content-type': 'application/json; charset=utf-8' },
  });
}
