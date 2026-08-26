import { NextResponse } from 'next/server';
import { getSiteIdentityCached } from '@/lib/site-identity';

/** Public brand bootstrap: logo, name, announcement bar, whatsapp, category images */
export async function GET() {
  const identity = await getSiteIdentityCached();
  return NextResponse.json(identity);
}
