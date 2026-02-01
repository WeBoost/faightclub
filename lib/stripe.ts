import Stripe from 'stripe';

// Stripe client - prep only, no checkout flows
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : null;

/**
 * Verify Stripe webhook signature
 * Returns the event if valid, throws if invalid
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
 * Log webhook event (stub for future implementation)
 * Currently just logs to console
 */
export function handleWebhookEvent(event: Stripe.Event): void {
  console.log(`[Stripe Webhook] Received event: ${event.type}`);
  console.log(`[Stripe Webhook] Event ID: ${event.id}`);
  
  // Future: Handle specific event types
  switch (event.type) {
    case 'checkout.session.completed':
      console.log('[Stripe Webhook] Checkout completed - stub');
      break;
    case 'customer.subscription.created':
      console.log('[Stripe Webhook] Subscription created - stub');
      break;
    case 'customer.subscription.updated':
      console.log('[Stripe Webhook] Subscription updated - stub');
      break;
    case 'customer.subscription.deleted':
      console.log('[Stripe Webhook] Subscription deleted - stub');
      break;
    case 'invoice.paid':
      console.log('[Stripe Webhook] Invoice paid - stub');
      break;
    case 'invoice.payment_failed':
      console.log('[Stripe Webhook] Invoice payment failed - stub');
      break;
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}
