import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
  apiVersion: '2024-06-20',
});

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://faightclub.com').trim();

// Price ID mapping - trim all values to handle env var newlines
const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_ACTIVE_PRO_PRICE_ID?.trim(),
  builder: process.env.STRIPE_BUILDER_PRICE_ID?.trim(),
  sponsor: process.env.STRIPE_SPONSOR_PRICE_ID?.trim(),
};

// Subscription vs one-time
const SUBSCRIPTION_TIERS = ['pro', 'builder'];

export async function POST(request: Request) {
  try {
    // Check if payments are enabled (trim to handle env var newlines)
    if (process.env.PAYMENTS_ENABLED?.trim() !== 'true') {
      return NextResponse.json(
        { error: 'Payments are not enabled' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { tier } = body;

    if (!tier || !['pro', 'builder', 'sponsor'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be pro, builder, or sponsor.' },
        { status: 400 }
      );
    }

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for tier: ${tier}` },
        { status: 500 }
      );
    }

    const isSubscription = SUBSCRIPTION_TIERS.includes(tier);

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/?canceled=1`,
      // Enable customer email collection
      customer_creation: isSubscription ? undefined : 'always',
      // Collect email
      ...(isSubscription ? {} : { payment_intent_data: { receipt_email: undefined } }),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
