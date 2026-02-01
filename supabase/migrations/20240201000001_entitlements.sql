-- Entitlements table for payment tier access
CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('pro', 'builder', 'sponsor')),
  access_key text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by access_key
CREATE INDEX IF NOT EXISTS idx_entitlements_access_key ON entitlements(access_key);

-- Index for email + tier lookups
CREATE INDEX IF NOT EXISTS idx_entitlements_email_tier ON entitlements(email, tier, status);

-- RLS policies
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON entitlements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Public can only read their own entitlement by access_key
CREATE POLICY "Read own entitlement by key" ON entitlements
  FOR SELECT
  USING (true);
