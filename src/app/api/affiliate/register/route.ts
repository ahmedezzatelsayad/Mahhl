import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { generateAffiliateCode } from '@/lib/affiliate-auth';
import { normalizeKwPhone, isValidKwPhone } from '@/lib/customer-auth';
import { cleanText } from '@/lib/create-order';

export const dynamic = 'force-dynamic';

/**
 * Open registration for marketers (انضم كمسوق).
 * New accounts start as "pending" — they can log in and browse products with
 * commission info, but placing orders requires admin activation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = cleanText(body.name, 80);
    const phone = normalizeKwPhone(String(body.phone || ''));
    const password = String(body.password || '');
    const emailRaw = cleanText(body.email, 120);
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;

    if (name.length < 2) {
      return NextResponse.json({ error: 'يرجى كتابة الاسم الكامل' }, { status: 400 });
    }
    if (!isValidKwPhone(phone)) {
      return NextResponse.json(
        { error: 'اكتب رقم كويتي صحيح 8 أرقام يبدأ بـ 5 أو 6 أو 9' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    const exists = await db.affiliate.findUnique({ where: { phone } });
    if (exists) {
      return NextResponse.json(
        { error: 'هذا الرقم مسجل بالفعل — سجل دخول أو راجع الإدارة' },
        { status: 409 }
      );
    }
    if (email) {
      const emailTaken = await db.affiliate.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json({ error: 'هذا الإيميل مستخدم بالفعل' }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const code = await generateAffiliateCode();
    const aff = await db.affiliate.create({
      data: { name, phone, email, passwordHash, code, status: 'pending' },
    });

    return NextResponse.json({
      ok: true,
      affiliate: { id: aff.id, name: aff.name, phone: aff.phone, code: aff.code, status: aff.status },
      message:
        'تم استلام طلب انضمامك! سجل دخول الآن — تقدر تتصفح المنتجات والعمولات، وتقدر تضيف طلبات بعد موافقة الإدارة على حسابك.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل التسجيل' }, { status: 500 });
  }
}
