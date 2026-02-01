import Stripe from 'stripe';
import { createOrReuseEntitlement, Tier } from './entitlements';
import { sendEmail } from './resend';

// Stripe client
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : null;

// Price ID to tier mapping (populated at runtime from env)
function getPriceToTierMap(): Record<string, Tier> {
  const map: Record<string, Tier> = {};
  
  const proPrice = process.env.STRIPE_ACTIVE_PRO_PRICE_ID;
  const builderPrice = process.env.STRIPE_BUILDER_PRICE_ID;
  const sponsorPrice = process.env.STRIPE_SPONSOR_PRICE_ID;
  
  if (proPrice) map[proPrice] = 'pro';
  if (builderPrice) map[builderPrice] = 'builder';
  if (sponsorPrice) map[sponsorPrice] = 'sponsor';
  
  return map;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Handle webhook events
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`[Stripe Webhook] Received event: ${event.type}`);
  
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
  
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  // Get customer email
  const email = session.customer_details?.email;
  if (!email) {
    console.error('[Stripe Webhook] No customer email found in session');
    return;
  }

  // Fetch line items to determine which price was purchased
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://faightclub.com';
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
