import { NextResponse } from 'next/server';
import { getStripeClient, getPriceId, getStripeMode } from '@/lib/stripe';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://faightclub.com').trim();

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

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
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

    const priceId = getPriceId(tier);
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for tier: ${tier} (mode: ${getStripeMode()})` },
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
