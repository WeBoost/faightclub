import { supabaseAdmin } from './supabase-admin';
import { randomBytes } from 'crypto';

export type Tier = 'pro' | 'builder' | 'sponsor';

export interface Entitlement {
  id: string;
  email: string;
  tier: Tier;
  access_key: string;
  status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
}

// In-memory cache for entitlement validation (5 min TTL)
const entitlementCache = new Map<string, { entitlement: Entitlement | null; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function generateAccessKey(): string {
  return randomBytes(24).toString('base64url');
}

export async function createOrReuseEntitlement(
  email: string,
  tier: Tier,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<Entitlement> {
  // Check for existing active entitlement
  const { data: existing } = await supabaseAdmin
    .from('entitlements')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('tier', tier)
    .eq('status', 'active')
    .single();

  if (existing) {
    // Update stripe info if provided
    if (stripeCustomerId || stripeSubscriptionId) {
      await supabaseAdmin
        .from('entitlements')
        .update({
          stripe_customer_id: stripeCustomerId || existing.stripe_customer_id,
          stripe_subscription_id: stripeSubscriptionId || existing.stripe_subscription_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }
    return existing;
  }

  // Create new entitlement
  const accessKey = generateAccessKey();
  const { data, error } = await supabaseAdmin
    .from('entitlements')
    .insert({
      email: email.toLowerCase(),
      tier,
      access_key: accessKey,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create entitlement: ${error.message}`);
  }

  return data;
}

export async function validateAccessKey(accessKey: string): Promise<Entitlement | null> {
  // Check cache first
  const cached = entitlementCache.get(accessKey);
  if (cached && cached.expires > Date.now()) {
    return cached.entitlement;
  }

  // Query database
  const { data, error } = await supabaseAdmin
    .from('entitlements')
    .select('*')
    .eq('access_key', accessKey)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    // Cache negative result too
    entitlementCache.set(accessKey, { entitlement: null, expires: Date.now() + CACHE_TTL });
    return null;
  }

  // Cache positive result
  entitlementCache.set(accessKey, { entitlement: data, expires: Date.now() + CACHE_TTL });
  return data;
}

export function getTierLimits(tier: Tier | null): { battlesPerDay: number; maxPromptLength: number } {
  switch (tier) {
    case 'builder':
      return { battlesPerDay: 300, maxPromptLength: 5000 };
    case 'pro':
      return { battlesPerDay: 50, maxPromptLength: 3000 };
    case 'sponsor':
      return { battlesPerDay: 10, maxPromptLength: 2000 };
    default:
      return { battlesPerDay: 3, maxPromptLength: 2000 };
  }
}

export function clearEntitlementCache(accessKey?: string): void {
  if (accessKey) {
    entitlementCache.delete(accessKey);
  } else {
    entitlementCache.clear();
  }
}
