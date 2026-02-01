# FAIghtClub - Handover Document

**Single source of truth for this project. Read first in every new session.**

## Purpose

FAIghtClub is a viral AI battle arena where AI agents compete in real-time coding challenges. Users submit prompts, watch agents generate and refine code through a streaming spectator experience, and see a winner declared with scores and critique.

## Status

- **Phase**: MVP + Phase 2 Spectator + Monetization
- **Domain**: faightclub.com ✅ LIVE
- **Production URL**: https://faightclub.com
- **Preview URL**: https://faightclub-inky.vercel.app

## Monetization (LIVE)

### Tiers

| Tier | Price | Battles/Day | Prompt Length |
|------|-------|-------------|---------------|
| Free | £0 | 3 | 2,000 chars |
| Pro | £19/mo | 50 | 3,000 chars |
| Builder | £299/mo | 300 | 5,000 chars |
| Sponsor | £10 one-time | 10 | 2,000 chars |

### How It Works

1. User clicks upgrade button → redirects to Stripe Checkout
2. Stripe processes payment → sends `checkout.session.completed` webhook
3. Webhook creates entitlement in Supabase with unique access key
4. Email sent via Resend with access key link
5. User clicks link or enters key → stored in localStorage
6. Key sent with battle requests → server validates and applies tier limits

### Stripe Products Required

Create these in Stripe **LIVE mode**:

1. **Pro Early Access** - £19/mo recurring
2. **Pro Standard** - £29/mo recurring (for later switch)
3. **Builder** - £299/mo recurring
4. **Sponsor a Battle** - £10 one-time

Copy the `price_...` IDs and set in Vercel.

### Switching £19 → £29

When ready to switch Pro pricing:
1. Set `STRIPE_ACTIVE_PRO_PRICE_ID` to the £29 price ID
2. Redeploy

Existing £19 subscribers keep their price (Stripe handles this).

## Environment Variables

### Required (Production)

| Variable | Description | Status |
|----------|-------------|--------|
| `OPENAI_API_KEY` | OpenAI API key | ✅ Set |
| `OPENAI_MODEL_PREMIUM` | Higher quality model (gpt-4o) | ✅ Set |
| `OPENAI_MODEL_ECONOMY` | Economy model (gpt-4o-mini) | ✅ Set |
| `SUPABASE_URL` | Supabase project URL | ✅ Set |
| `SUPABASE_ANON_KEY` | Supabase anon key | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key | ✅ Set |
| `STRIPE_SECRET_KEY` | Stripe LIVE secret key | ✅ Set |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ✅ Set |
| `PAYMENTS_ENABLED` | Enable payment features | ✅ Set (true) |
| `NEXT_PUBLIC_APP_URL` | App URL for redirects | ✅ Set |
| `RESEND_API_KEY` | Resend API key | ✅ Set |
| `SEED_SECRET` | Seed endpoint secret | ✅ Set |

### Stripe Price IDs (Required)

| Variable | Description | Status |
|----------|-------------|--------|
| `STRIPE_PRO_EARLY_PRICE_ID` | £19/mo price ID | ⚠️ NEEDS SET |
| `STRIPE_PRO_STANDARD_PRICE_ID` | £29/mo price ID | ⚠️ NEEDS SET |
| `STRIPE_BUILDER_PRICE_ID` | £299/mo price ID | ⚠️ NEEDS SET |
| `STRIPE_SPONSOR_PRICE_ID` | £10 one-time price ID | ⚠️ NEEDS SET |
| `STRIPE_ACTIVE_PRO_PRICE_ID` | Currently active Pro price | ⚠️ NEEDS SET (use £19 ID) |

### Setting Up Stripe

1. Go to Stripe Dashboard (LIVE mode)
2. Create Products:
   - Pro Early Access (£19/mo)
   - Pro Standard (£29/mo)
   - Builder (£299/mo)
   - Sponsor a Battle (£10 one-time)
3. Copy each `price_...` ID
4. Set in Vercel Production env vars
5. Set `STRIPE_ACTIVE_PRO_PRICE_ID` to the £19 price ID
6. Redeploy

### Webhook Setup

Webhook is already configured:
- URL: `https://faightclub.com/api/stripe/webhook`
- Event: `checkout.session.completed`
- Secret: Already set in Vercel

## Database Schema

### Tables

```sql
-- battles (existing)
CREATE TABLE battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  agent_a_name text NOT NULL,
  agent_b_name text NOT NULL,
  agent_a_code text,
  agent_b_code text,
  agent_a_refined text,
  agent_b_refined text,
  critique text,
  winner text,
  score jsonb,
  created_at timestamptz DEFAULT now()
);

-- leaderboard (existing)
CREATE TABLE leaderboard (
  agent_name text PRIMARY KEY,
  wins int DEFAULT 0,
  battles int DEFAULT 0,
  avg_score numeric DEFAULT 0
);

-- entitlements (NEW)
CREATE TABLE entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('pro', 'builder', 'sponsor')),
  access_key text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Supabase Project

- **Project Name**: faightclub
- **Org**: WeBoost (Pro plan)
- **Reference ID**: vysjxfimrrjmafllnfgn
- **Dashboard**: https://supabase.com/dashboard/project/vysjxfimrrjmafllnfgn

## Vercel Project

- **Team**: Beffer (Pro plan)
- **Project**: faightclub
- **GitHub**: https://github.com/WeBoost/faightclub
- **Domains**: faightclub.com, www.faightclub.com

## Testing End-to-End

1. Go to https://faightclub.com
2. Click "Go Pro £19/mo"
3. Complete Stripe Checkout (use test card 4242 4242 4242 4242)
4. Check email for access key
5. Click activation link or enter key manually
6. Run a battle - should show "PRO" badge and higher limits

### Verifying Webhook

1. Check Vercel logs for webhook endpoint
2. Look for `[Stripe Webhook] Processing checkout.session.completed`
3. Verify entitlement row in Supabase
4. Verify email sent in Resend dashboard

## Features

### Arena Feed (Live Spectator UI)

- LIVE indicator with red pulsing dot
- Progress bar showing 8 stages
- Punchy headlines
- Auto-scrolling feed

### Share Buttons

- Copy Arena Proof (Clawdbook format)
- Copy for X (short tweet)
- Copy for LinkedIn (professional)

### Upgrade CTAs

- Homepage: Pro/Builder/Sponsor buttons
- Battle page: Upgrade teaser
- Rate limit: Upgrade prompt when limit reached

## Access Key System

- Keys are 32-char base64url strings
- Stored in localStorage as `fc_key`
- Sent via `x-fc-key` header on battle requests
- Cached server-side for 5 minutes
- URL param `?k=KEY` auto-saves to localStorage

## Known Limitations

1. **No billing portal** - users can't manage subscriptions (yet)
2. **No auth** - access is key-based only
3. **In-memory rate limiting** - resets on cold starts
4. **Function timeout** - 60s max for battles

## How to Resume

1. Read this HANDOVER.md first
2. Check `docs/ROADMAP.md` for pending tasks
3. Follow `.cursorrules` for coding standards

## Token Efficiency Rules

- Premium model max_tokens: 900
- Economy model max_tokens: 500
- Prompts request CODE ONLY where applicable

## Next Tasks

1. ✅ Improve live streaming UI
2. ✅ Attach faightclub.com domain
3. ✅ Add Copy Arena Proof buttons
4. ✅ Fix model env vars
5. ✅ Implement monetization
6. ⚠️ SET STRIPE PRICE IDS IN VERCEL
7. ⏳ Verify Resend domain
8. ⏳ First Clawdbook seed post

## File Structure

```
faightclub/
├── app/
│   ├── api/
│   │   ├── battles/route.ts
│   │   ├── leaderboard/route.ts
│   │   ├── run-battle/route.ts        # SSE + tier limits
│   │   ├── seed/route.ts
│   │   ├── stripe/
│   │   │   ├── create-checkout/route.ts  # NEW
│   │   │   └── webhook/route.ts          # UPDATED
│   │   └── test-email/route.ts
│   ├── battle/[id]/
│   │   ├── page.tsx
│   │   ├── ShareButtons.tsx
│   │   └── UpgradeCTA.tsx              # NEW
│   ├── leaderboard/page.tsx
│   ├── thanks/page.tsx                 # NEW
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                        # UPDATED with CTAs
├── lib/
│   ├── arena.ts
│   ├── entitlements.ts                 # NEW
│   ├── openai.ts
│   ├── prompts.ts
│   ├── resend.ts
│   ├── seed.ts
│   ├── streaming.ts
│   ├── stripe.ts                       # UPDATED
│   ├── supabase-admin.ts
│   └── supabase-public.ts
├── supabase/
│   └── migrations/
│       ├── 20240201000000_init.sql
│       └── 20240201000001_entitlements.sql  # NEW
├── docs/
│   ├── ARCHITECTURE.md
│   ├── HANDOVER.md
│   └── ROADMAP.md
└── [config files]
```

## Changelog

### 2026-02-01 (Sprint 2)
- Monetization live with Stripe Checkout
- Entitlements table and access key system
- Tier-based rate limiting (Pro: 50/day, Builder: 300/day)
- /thanks page with key entry
- Upgrade CTAs on homepage and battle pages

### 2026-02-01 (Sprint 1)
- Initial bootstrap complete
- Arena Feed UI with live stages
- Share buttons (Clawdbook/X/LinkedIn)
- Domain attached (faightclub.com)
