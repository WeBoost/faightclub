import Stripe from 'stripe';
import { createOrReuseEntitlement, Tier } from './entitlements';
import { sendEmail } from './resend';

// Get current Stripe mode (defaults to 'live' if not set)
export function getStripeMode(): 'test' | 'live' {
  const mode = (process.env.STRIPE_MODE || 'live').trim().toLowerCase();
  return mode === 'test' ? 'test' : 'live';
}

// Get the appropriate secret key based on mode
function getSecretKey(): string {
  const mode = getStripeMode();
  if (mode === 'test') {
    return (process.env.STRIPE_SECRET_KEY_TEST || '').trim();
  }
  return (process.env.STRIPE_SECRET_KEY || '').trim();
}

// Get the appropriate webhook secret based on mode
export function getWebhookSecret(): string {
  const mode = getStripeMode();
  if (mode === 'test') {
    return (process.env.STRIPE_WEBHOOK_SECRET_TEST || '').trim();
  }
  return (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}

// Create Stripe client with the appropriate key
export function getStripeClient(): Stripe | null {
  const secretKey = getSecretKey();
  if (!secretKey) return null;
  
  return new Stripe(secretKey, {
    apiVersion: '2024-06-20',
  });
}

// Legacy export for backwards compatibility
export const stripe = getStripeClient();

// Get price ID for a tier based on current mode
export function getPriceId(tier: 'pro' | 'builder' | 'sponsor'): string | undefined {
  const mode = getStripeMode();
  const suffix = mode === 'test' ? '_TEST' : '';
  
  switch (tier) {
    case 'pro':
      return (process.env[`STRIPE_ACTIVE_PRO_PRICE_ID${suffix}`] || '').trim() || undefined;
    case 'builder':
      return (process.env[`STRIPE_BUILDER_PRICE_ID${suffix}`] || '').trim() || undefined;
    case 'sponsor':
      return (process.env[`STRIPE_SPONSOR_PRICE_ID${suffix}`] || '').trim() || undefined;
  }
}

// Get all active price IDs for current mode
export function getActivePriceIds(): Record<string, string | undefined> {
  return {
    pro: getPriceId('pro'),
    builder: getPriceId('builder'),
    sponsor: getPriceId('sponsor'),
  };
}

// Price ID to tier mapping (populated at runtime from env)
function getPriceToTierMap(): Record<string, Tier> {
  const map: Record<string, Tier> = {};
  
  // Add both TEST and LIVE prices to the map so webhook can handle both
  const proPriceLive = (process.env.STRIPE_ACTIVE_PRO_PRICE_ID || '').trim();
  const builderPriceLive = (process.env.STRIPE_BUILDER_PRICE_ID || '').trim();
  const sponsorPriceLive = (process.env.STRIPE_SPONSOR_PRICE_ID || '').trim();
  
  const proPriceTest = (process.env.STRIPE_ACTIVE_PRO_PRICE_ID_TEST || '').trim();
  const builderPriceTest = (process.env.STRIPE_BUILDER_PRICE_ID_TEST || '').trim();
  const sponsorPriceTest = (process.env.STRIPE_SPONSOR_PRICE_ID_TEST || '').trim();
  
  if (proPriceLive) map[proPriceLive] = 'pro';
  if (builderPriceLive) map[builderPriceLive] = 'builder';
  if (sponsorPriceLive) map[sponsorPriceLive] = 'sponsor';
  
  if (proPriceTest) map[proPriceTest] = 'pro';
  if (builderPriceTest) map[builderPriceTest] = 'builder';
  if (sponsorPriceTest) map[sponsorPriceTest] = 'sponsor';
  
  return map;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const client = getStripeClient();
  if (!client) {
    throw new Error('Stripe not configured');
  }
  
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return client.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Handle webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`[Stripe Webhook] Received event: ${event.type} (mode: ${getStripeMode()})`);
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.deleted':
      console.log('[Stripe Webhook] Subscription deleted - will handle cancellation later');
      break;
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log('[Stripe Webhook] Processing checkout.session.completed');
  
  const client = getStripeClient();
  if (!client) {
    throw new Error('Stripe not configured');
  }

  // Get customer email
  const email = session.customer_details?.email;
  if (!email) {
    console.error('[Stripe Webhook] No customer email found in session');
    return;
  }

  // Fetch line items to determine which price was purchased
  const lineItems = await client.checkout.sessions.listLineItems(session.id, {
    limit: 1,
  });

  if (!lineItems.data.length) {
    console.error('[Stripe Webhook] No line items found');
    return;
  }

  const priceId = lineItems.data[0].price?.id;
  if (!priceId) {
    console.error('[Stripe Webhook] No price ID found in line items');
    return;
  }

  // Map price to tier
  const priceToTier = getPriceToTierMap();
  const tier = priceToTier[priceId];
  
  if (!tier) {
    console.error(`[Stripe Webhook] Unknown price ID: ${priceId}`);
    return;
  }

  console.log(`[Stripe Webhook] Creating entitlement for ${email}, tier: ${tier}`);

  // Create or reuse entitlement
  const entitlement = await createOrReuseEntitlement(
    email,
    tier,
    session.customer as string | undefined,
    session.subscription as string | undefined
  );

  console.log(`[Stripe Webhook] Entitlement created/updated: ${entitlement.access_key}`);

  // Send email with access key
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://faightclub.com').trim();
  const accessLink = `${appUrl}/?k=${entitlement.access_key}`;

  const tierNames: Record<Tier, string> = {
    pro: 'Pro',
    builder: 'Builder',
    sponsor: 'Sponsor',
  };

  try {
    await sendEmail({
      to: email,
      subject: `Your FAIghtClub ${tierNames[tier]} Access Key`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #a855f7;">Welcome to FAIghtClub ${tierNames[tier]}!</h1>
          
          <p>Thank you for your purchase. Your access key has been activated.</p>
          
          <div style="background: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #9ca3af; margin: 0 0 10px 0; font-size: 14px;">Your Access Key:</p>
            <code style="color: #a855f7; font-size: 16px; word-break: break-all;">${entitlement.access_key}</code>
          </div>
          
          <p>Click the button below to activate your ${tierNames[tier]} access:</p>
          
          <a href="${accessLink}" style="display: inline-block; background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Activate ${tierNames[tier]} Access
          </a>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            You can also manually enter your access key at ${appUrl}/thanks
          </p>
          
          <hr style="border: none; border-top: 1px solid #374151; margin: 30px 0;" />
          
          <p style="color: #6b7280; font-size: 12px;">
            Questions? Reply to this email or visit faightclub.com
          </p>
        </div>
      `,
    });
    console.log(`[Stripe Webhook] Access key email sent to ${email}`);
  } catch (emailError) {
    console.error('[Stripe Webhook] Failed to send email:', emailError);
    // Don't throw - entitlement was created, user can still access via /thanks
  }
}

/**
 * Get payments status for admin diagnostics
 */
export function getPaymentsStatus() {
  const mode = getStripeMode();
  const paymentsEnabled = (process.env.PAYMENTS_ENABLED || '').trim() === 'true';
  const secretKey = getSecretKey();
  const webhookSecret = getWebhookSecret();
  
  return {
    mode,
    paymentsEnabled,
    stripeConfigured: !!secretKey,
    webhookConfigured: !!webhookSecret,
    activePriceIds: getActivePriceIds(),
  };
}
