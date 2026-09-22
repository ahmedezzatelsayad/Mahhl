import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { erpAuthorizeUrl } from '@/lib/garfix-sso';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/sso/login?portal=admin
 *
 * بداية رحلة الدخول الموحد: يبني state عشوائية، يحفظها في كوكي httpOnly
 * قصير العمر (CSRF)، ثم يوجّه المتصفح إلى بوابة authorize في ERP.
 */
export async function GET(req: NextRequest) {
  const portal = req.nextUrl.searchParams.get('portal') === 'affiliate' ? 'affiliate' : 'admin';

  // المرحلة 1: بوابة الأدمن فقط — بوابة المسوقين (هاتفية) لاحقاً
  if (portal !== 'admin') {
    return NextResponse.json({ error: 'بوابة الدخول الموحد متاحة للإدارة حالياً' }, { status: 400 });
  }

  const state = randomBytes(16).toString('base64url');
  const redirectUri =
    (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin) + '/api/auth/sso/callback';

  const res = NextResponse.redirect(erpAuthorizeUrl(redirectUri, state), { status: 302 });
  res.cookies.set('sso_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600, // عشر دقائق تكفي لإكمال الدخول
  });
  return res;
}
