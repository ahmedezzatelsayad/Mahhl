import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { adminOnly } from '@/lib/auth';
import { verifyCustomer, normalizeKwPhone } from '@/lib/customer-auth';
import { AUTO_SHIP_ARRIVAL_NOTE } from '@/lib/auto-ship';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items || [];
    if (!items.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const phone = normalizeKwPhone(body.phone || '');

    // 0. If a logged-in customer placed the order, attach it to their account
    let authCustomer = null;
    try {
      authCustomer = await verifyCustomer(req);
    } catch {
      /* guest checkout */
    }

    // 1. Create or find customer by phone — and auto-create their account:
    //    password defaults to the phone number so they can log in instantly.
    let customer =
      (await db.customer.findFirst({ where: { phone } })) || null;
    let accountCreated = false;
    if (!customer && authCustomer) {
      customer = authCustomer;
    }
    if (!customer) {
      const passwordHash = await bcrypt.hash(phone, 10);
      customer = await db.customer.create({
        data: {
          name: body.customerName || 'عميل',
          phone,
          email: body.email || null,
          city: body.governorate || null,
          area: body.area || null,
          address: body.address || null,
          passwordHash,
        },
      });
      accountCreated = true;
    } else if (!customer.passwordHash) {
      // legacy customer from before accounts existed — give them the default too
      await db.customer.update({
        where: { id: customer.id },
        data: { passwordHash: await bcrypt.hash(phone, 10) },
      });
      accountCreated = true;
    }

    // 2. Generate order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // 3. Calculate subtotal from items
    const subtotal = items.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0
    );
    const shipping = parseFloat(body.shipping || '0');
    const total = subtotal + shipping;

    // 4. Create order — with the arrival promise shown in tracking
    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        subtotal,
        shipping,
        total,
        status: 'pending',
        paymentMethod: body.paymentMethod || 'cod',
        notes: body.notes || null,
        governorate: body.governorate || null,
        area: body.area || null,
        address: body.address || null,
        phone,
        customerName: body.customerName || customer.name,
        arrivalNote: AUTO_SHIP_ARRIVAL_NOTE,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            name: i.name,
            sku: i.sku,
            price: i.price,
            quantity: i.quantity,
            image: i.image || null,
            variations: i.variations || null,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    // 5. Decrement stock for each product (if trackStock)
    for (const i of items) {
      try {
        const product = await db.product.findUnique({ where: { id: i.productId } });
        if (product && product.trackStock) {
          await db.product.update({
            where: { id: i.productId },
            data: { quantity: Math.max(0, product.quantity - i.quantity) },
          });
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json(
      {
        success: true,
        order,
        accountCreated,
        loginHint: accountCreated
          ? `حسابك جاهز — سجل دخولك من «حسابي» برقم هاتفك ${phone} وكلمة المرور هي نفس الرقم`
          : null,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error('Order creation failed:', e);
    return NextResponse.json(
      { error: e.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

/** Admin-only list (customers use /api/customer/orders or /api/orders/track) */
export async function GET(req: NextRequest) {
  return adminOnly(req, async () => {
    const orders = await db.order.findMany({
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json(orders);
  });
}
