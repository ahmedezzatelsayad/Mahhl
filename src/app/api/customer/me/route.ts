import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import {
  verifyCustomer,
  makeCustomerToken,
  customerPublic,
  normalizeKwPhone,
} from '@/lib/customer-auth';

/** GET — my profile */
export async function GET(req: NextRequest) {
  const customer = await verifyCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ customer: customerPublic(customer) });
}

/** PUT — update profile + change password (from "حسابي") */
export async function PUT(req: NextRequest) {
  const customer = await verifyCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data: any = {};
    if (body.name) data.name = body.name.trim();
    if (body.address !== undefined) data.address = (body.address || '').trim();
    if (body.area !== undefined) data.area = (body.area || '').trim() || null;
    if (body.city !== undefined) data.city = (body.city || '').trim() || null;
    if (body.email !== undefined) data.email = (body.email || '').trim() || null;

    // password change requires the current one (unless it's still the default phone)
    let reissuedToken: string | undefined;
    if (body.newPassword) {
      const newPass = body.newPassword.trim();
      if (newPass.length < 6) {
        return NextResponse.json(
          { error: 'كلمة المرور الجديدة لازم 6 خانات على الأقل' },
          { status: 400 }
        );
      }
      const currentPass = body.currentPassword || '';
      const ok = await bcrypt.compare(currentPass, customer.passwordHash ?? '');
      if (!ok) {
        return NextResponse.json(
          { error: 'كلمة المرور الحالية غير صحيحة (الافتراضية هي رقم هاتفك)' },
          { status: 400 }
        );
      }
      data.passwordHash = await bcrypt.hash(newPass, 10);
    }

    const updated = await db.customer.update({
      where: { id: customer.id },
      data,
    });
    if (data.passwordHash) {
      reissuedToken = await makeCustomerToken(updated.id);
    }

    return NextResponse.json({
      customer: customerPublic(updated),
      token: reissuedToken,
      message: body.newPassword
        ? 'تم تغيير كلمة المرور بنجاح'
        : 'تم تحديث بياناتك',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'فشل التحديث' }, { status: 500 });
  }
}
