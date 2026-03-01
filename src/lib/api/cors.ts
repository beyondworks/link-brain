/**
 * CORS Utility
 *
 * Centralised CORS configuration with domain allowlist.
 * Returns headers as a plain object to apply to NextResponse.
 */

const ALLOWED_ORIGINS = [
  // Production domains
  'https://linkbrain.vercel.app',
  'https://linkbrain-v-2.vercel.app',
  'https://www.linkbrain.app',

  // Development
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

/**
 * Check if origin is in the allowlist.
 */
export function isOriginAllowed(origin: string | undefined | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Return CORS headers for the given request origin.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  let allowOrigin: string;

  if (origin && isOriginAllowed(origin)) {
    allowOrigin = origin;
  } else if (!origin) {
    // Server-to-server or same-origin — allow with first production domain
    allowOrigin = ALLOWED_ORIGINS[0];
  } else {
    // Unknown origin — deny
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    allowOrigin = 'null';
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Build a CORS preflight (OPTIONS) NextResponse.
 */
export function handleCorsPreflightResponse(origin: string | null): Response {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(origin),
  });
}
