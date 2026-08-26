import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import {
  normalizeKwPhone,
  isValidKwPhone,
  makeCustomerToken,
  customerPublic,
} from '@/lib/customer-auth';

/**
 * Customer registration — deliberately frictionless for Kuwait:
 * name + phone + address only. The password defaults to the phone number
 * and the customer is told so, so they can log in right away from "حسابي".
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || '').trim();
    const phone = normalizeKwPhone(body.phone || '');
    const address = (body.address || '').trim();
    const city = (body.city || '').trim() || null;
    const area = (body.area || '').trim() || null;
    const email = (body.email || '').trim() || null;

    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: 'الاسم ورقم الهاتف والعنوان مطلوبة' },
        { status: 400 }
      );
    }
    if (!isValidKwPhone(phone)) {
      return NextResponse.json(
        { error: 'رقم هاتف كويتي غير صحيح — 8 أرقام تبدأ بـ 4/5/6/7/9' },
        { status: 400 }
      );
    }

    const existing = await db.customer.findFirst({ where: { phone } });
    if (existing) {
      return NextResponse.json(
        { error: 'هذا الرقم مسجل عندنا من قبل — سجل دخولك أو اطلب كلمة مرور جديدة من خدمة العملاء' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(phone, 10);
    const customer = await db.customer.create({
      data: { name, phone, address, city, area, email, passwordHash },
    });

    const token = await makeCustomerToken(customer.id);
    return NextResponse.json(
      {
        success: true,
        customer: customerPublic(customer),
        token,
        message: `تم إنشاء حسابك! كلمة المرور الحالية هي رقم هاتفك ${phone} — تقدر تغيرها من حسابي`,
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل إنشاء الحساب' }, { status: 500 });
  }
}
