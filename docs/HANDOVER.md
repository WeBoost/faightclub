# FAIghtClub - Handover Document

**Single source of truth for this project. Read first in every new session.**

## Purpose

FAIghtClub is a viral AI battle arena where AI agents compete in real-time coding challenges. Users submit prompts, watch agents generate and refine code through a streaming spectator experience, and see a winner declared with scores and critique.

## Status

- **Phase**: MVP + Phase 2 Spectator Architecture
- **Domain**: faightclub.com
- **Live URL**: [TO BE ADDED AFTER DEPLOY]

## Environment Variables

Required env vars (set in Vercel and `.env.local` for local dev):

| Variable | Description | Status |
|----------|-------------|--------|
| `OPENAI_API_KEY` | OpenAI API key for model calls | Required |
| `OPENAI_MODEL_PREMIUM` | Higher quality model (default: gpt-4o) | Optional |
| `OPENAI_MODEL_ECONOMY` | Economy model for critic/judge (default: gpt-4o-mini) | Optional |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anon key (public reads) | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server writes) | Required |
| `STRIPE_SECRET_KEY` | Stripe test secret key | Prep only |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Prep only |
| `RESEND_API_KEY` | Resend API key for emails | Prep only |
| `SEED_SECRET` | Secret for /api/seed endpoint | Required |

**Also add as `NEXT_PUBLIC_` versions for client:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase Project

- **Project Name**: faightclub (or as created)
- **Region**: [SET AFTER CREATION]
- **Plan**: Micro ($10/mo)

### Database Schema

```sql
-- battles table
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

-- leaderboard table
CREATE TABLE leaderboard (
  agent_name text PRIMARY KEY,
  wins int DEFAULT 0,
  battles int DEFAULT 0,
  avg_score numeric DEFAULT 0
);

-- RLS Policies
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Public read for battles
CREATE POLICY "Public read battles" ON battles
  FOR SELECT USING (true);

-- Public read for leaderboard
CREATE POLICY "Public read leaderboard" ON leaderboard
  FOR SELECT USING (true);

-- Server-only insert for battles (use service role key)
CREATE POLICY "Server insert battles" ON battles
  FOR INSERT WITH CHECK (true);

-- Server-only upsert for leaderboard (use service role key)
CREATE POLICY "Server upsert leaderboard" ON leaderboard
  FOR ALL USING (true);
```

## Seeding

To seed initial battles:

```bash
curl -X POST https://faightclub.com/api/seed \
  -H "x-seed-secret: YOUR_SEED_SECRET"
```

Or locally:
```bash
curl -X POST http://localhost:3000/api/seed \
  -H "x-seed-secret: YOUR_SEED_SECRET"
```

Seeding is idempotent - it won't re-seed if battles already exist.

## Stripe Status

- **Mode**: Test (prep only)
- **Webhook**: `/api/stripe/webhook` - validates signatures, logs events
- **No checkout flows** - payment UI not built

To test webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Resend Status

- **API Key**: Configured
- **Domain**: NOT VERIFIED

### Domain Verification Checklist

1. Decide on email domain (faightclub.com or subdomain like mail.faightclub.com)
2. Go to Resend dashboard → Domains → Add Domain
3. Add DNS records to Vercel DNS:
   - SPF record (TXT)
   - DKIM records (CNAME x3)
   - DMARC record (TXT) - optional but recommended
4. Wait for verification (usually <1 hour)
5. Update `lib/resend.ts` default `from` address

Until verified, emails send from `onboarding@resend.dev` (test domain).

## How to Resume in New Cursor Chat

1. **Read this file first** - always start with HANDOVER.md
2. Check `docs/ROADMAP.md` for pending tasks
3. Check `docs/ARCHITECTURE.md` for system design
4. Follow `.cursorrules` for coding standards

## Token Efficiency Rules

- Keep prompts SHORT and STRICT
- Premium model max_tokens: 900
- Economy model max_tokens: 500
- Prompts request CODE ONLY where applicable
- Reject user prompts > 2000 chars

## Security Rules

- NEVER expose service role key to client
- Client uses anon key for reads only
- Server routes use service role for writes
- Stripe webhook validates signatures
- Seed endpoint requires secret header

## Next Tasks

See `docs/ROADMAP.md` for full list. Priority items:

1. Deploy to Vercel
2. Create Supabase project and run schema
3. Set env vars
4. Verify Resend domain
5. Test end-to-end battle flow

## File Structure

```
faightclub/
├── app/
│   ├── api/
│   │   ├── battles/route.ts
│   │   ├── leaderboard/route.ts
│   │   ├── run-battle/route.ts
│   │   ├── seed/route.ts
│   │   ├── stripe/webhook/route.ts
│   │   └── test-email/route.ts
│   ├── battle/[id]/page.tsx
│   ├── leaderboard/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── arena.ts
│   ├── openai.ts
│   ├── prompts.ts
│   ├── resend.ts
│   ├── seed.ts
│   ├── streaming.ts
│   ├── stripe.ts
│   ├── supabase-admin.ts
│   └── supabase-public.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── HANDOVER.md
│   └── ROADMAP.md
├── .cursorrules
├── .env.example
├── README.md
└── [config files]
```
