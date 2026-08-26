import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import {
  normalizeKwPhone,
  makeCustomerToken,
  customerPublic,
} from '@/lib/customer-auth';

/** Customer login — phone + password (default: the phone number itself) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizeKwPhone(body.phone || '');
    const password = body.password || '';

    const customer = await db.customer.findFirst({ where: { phone } });
    if (!customer || !customer.passwordHash) {
      return NextResponse.json(
        { error: 'لا يوجد حساب بهذا الرقم — أنشئ حسابك من نفس الصفحة أو سوي طلب وينشأ تلقائياً' },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, customer.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: 'كلمة المرور غير صحيحة — كلمة المرور الافتراضية هي رقم هاتفك' },
        { status: 401 }
      );
    }

    const token = await makeCustomerToken(customer.id);
    return NextResponse.json({ success: true, customer: customerPublic(customer), token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل الدخول' }, { status: 500 });
  }
}
