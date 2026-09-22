import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { exchangeCodeForUser, mintAdminToken, storeSsoTicket } from '@/lib/garfix-sso';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/sso/callback?code=…&state=…
 *
 * نهاية رحلة الدخول الموحد:
 *  1. التحقق من state (كوكي httpOnly) — حماية CSRF.
 *  2. استبدال الكود ببيانات مستخدم ERP (server-to-server).
 *  3. ربط الحساب: أدمن موجود بالبريد → توكنه، وإلا يُنشأ أدمن owner
 *     إذا كان دور ERP=admin (المؤسس). الأدوار الأدنى تُرفض صراحة.
 *  4. تسليم التوكن للواجهة عبر تذكرة لمرة واحدة (?sso_ticket=…) —
 *     التوكن نفسه لا يظهر في الرابط أبداً.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || '';
  const state = req.nextUrl.searchParams.get('state') || '';
  const cookieState = req.cookies.get('sso_state')?.value || '';
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const redirectUri = siteBase + '/api/auth/sso/callback';

  const fail = (reason: string) =>
    NextResponse.redirect(
      `${siteBase}/?view=admin-login&sso_error=${encodeURIComponent(reason)}`,
      { status: 302 },
    );

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail('جلسة الدخول الموحد غير صالحة — ابدأ من جديد');
  }

  const user = await exchangeCodeForUser(code, redirectUri);
  if (!user) return fail('انتهت صلاحية كود الدخول أو رفضه ERP — حاول مجدداً');

  try {
    const email = user.email.trim().toLowerCase();
    let admin = await db.adminUser.findUnique({ where: { email } });

    if (!admin) {
      // إنشاء أدمن تلقائي لدور admin في ERP فقط (المؤسس) — لا ترقية لأي دور آخر
      if (user.role !== 'admin') {
        return fail('حسابك في Garfix لا يملك صلاحية إدارة المتاجر');
      }
      const passwordHash = await bcrypt.hash(randomBytes(18).toString('base64url'), 10);
      admin = await db.adminUser.create({
        data: {
          email,
          passwordHash,
          name: user.displayName || email.split('@')[0],
          role: 'owner',
          isActive: true,
        },
      });
    } else if (admin.isActive === false) {
      return fail('حسابك معطّل في منصة المتاجر');
    }

    const token = await mintAdminToken(admin);
    const ticket = await storeSsoTicket({
      token,
      user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });

    const res = NextResponse.redirect(`${siteBase}/?view=admin-login&sso_ticket=${ticket}`, {
      status: 302,
    });
    res.cookies.delete('sso_state');
    return res;
  } catch (e) {
    console.error('[sso/callback]', e);
    return fail('خطأ داخلي أثناء ربط الحساب');
  }
}
