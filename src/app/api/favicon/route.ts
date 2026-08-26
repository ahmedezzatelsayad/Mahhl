import { NextResponse } from 'next/server';
import { getSiteIdentityCached } from '@/lib/site-identity';

/**
 * Dynamic browser icon. Serves the uploaded favicon (data-URL) from the admin
 * "Site Identity" page, or a generated محل شوب gold-badge SVG as fallback.
 */
export async function GET() {
  const identity = await getSiteIdentityCached();

  if (identity.favicon.startsWith('data:')) {
    const [meta, b64] = identity.favicon.split(',');
    const mime = /data:([^;]+)/.exec(meta)?.[1] || 'image/png';
    const buf = Buffer.from(b64, 'base64');
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  // Fallback: gold "م" badge on premium dark
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1C1917"/>
  <rect x="3" y="3" width="58" height="58" rx="12" fill="none" stroke="#D9A441" stroke-width="2.5"/>
  <text x="32" y="43" font-family="Tajawal, Arial, sans-serif" font-size="32" font-weight="800" fill="#E8B54D" text-anchor="middle">م</text>
</svg>`;
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
