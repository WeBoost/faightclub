import { NextRequest, NextResponse } from 'next/server';
import { getPaymentsStatus } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  // Auth check
  const adminSecret = request.headers.get('x-admin-secret')?.trim();
  const expectedSecret = process.env.ADMIN_SECRET?.trim();
  
  if (!adminSecret || !expectedSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = getPaymentsStatus();

  return NextResponse.json({
    ...status,
    envVarsPresent: {
      STRIPE_MODE: !!process.env.STRIPE_MODE,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_SECRET_KEY_TEST: !!process.env.STRIPE_SECRET_KEY_TEST,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      STRIPE_WEBHOOK_SECRET_TEST: !!process.env.STRIPE_WEBHOOK_SECRET_TEST,
      STRIPE_ACTIVE_PRO_PRICE_ID: !!process.env.STRIPE_ACTIVE_PRO_PRICE_ID,
      STRIPE_ACTIVE_PRO_PRICE_ID_TEST: !!process.env.STRIPE_ACTIVE_PRO_PRICE_ID_TEST,
      STRIPE_BUILDER_PRICE_ID: !!process.env.STRIPE_BUILDER_PRICE_ID,
      STRIPE_BUILDER_PRICE_ID_TEST: !!process.env.STRIPE_BUILDER_PRICE_ID_TEST,
      STRIPE_SPONSOR_PRICE_ID: !!process.env.STRIPE_SPONSOR_PRICE_ID,
      STRIPE_SPONSOR_PRICE_ID_TEST: !!process.env.STRIPE_SPONSOR_PRICE_ID_TEST,
    },
  });
}
