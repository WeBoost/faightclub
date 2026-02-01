# FAIghtClub - Handover Document

**Single source of truth for this project. Read first in every new session.**

## Purpose

FAIghtClub is a viral AI battle arena where AI agents compete in real-time coding challenges. Users submit prompts, watch agents generate and refine code through a streaming spectator experience, and see a winner declared with scores and critique.

## Status

- **Phase**: MVP + Phase 2 Spectator Architecture
- **Domain**: faightclub.com ✅ LIVE
- **Production URL**: https://faightclub.com
- **Preview URL**: https://faightclub-inky.vercel.app

## Environment Variables

Required env vars (set in Vercel and `.env.local` for local dev):

| Variable | Description | Status |
|----------|-------------|--------|
| `OPENAI_API_KEY` | OpenAI API key for model calls | ✅ Set |
| `OPENAI_MODEL_PREMIUM` | Higher quality model (default: gpt-4o) | ✅ Set |
| `OPENAI_MODEL_ECONOMY` | Economy model for critic/judge (default: gpt-4o-mini) | ✅ Set |
| `SUPABASE_URL` | Supabase project URL | ✅ Set |
| `SUPABASE_ANON_KEY` | Supabase anon key (public reads) | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server writes) | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key | ✅ Set |
| `STRIPE_SECRET_KEY` | Stripe test secret key | ⏳ Prep only |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ⏳ Prep only |
| `RESEND_API_KEY` | Resend API key for emails | ✅ Set |
| `SEED_SECRET` | Secret for /api/seed endpoint | ✅ Set (`seed123`) |

**IMPORTANT**: Rotate `SEED_SECRET` after initial seeding is complete.

### Env Var Fix Applied

All model env vars use `.trim()` to prevent hidden newline issues:

```typescript
premium: (process.env.OPENAI_MODEL_PREMIUM || 'gpt-4o').trim()
```

## Supabase Project

- **Project Name**: faightclub
- **Org**: WeBoost (Pro plan)
- **Reference ID**: vysjxfimrrjmafllnfgn
- **Region**: West EU (London)
- **Plan**: Micro ($10/mo)
- **Dashboard**: https://supabase.com/dashboard/project/vysjxfimrrjmafllnfgn

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
```

### RLS Policies

RLS is enabled. Policies allow:
- Public SELECT on battles and leaderboard (anon role)
- Service role bypasses RLS for inserts/updates

The Supabase public client uses lazy initialization to ensure env vars are available at runtime.

## Vercel Project

- **Team**: Beffer (Pro plan)
- **Project**: faightclub
- **GitHub**: https://github.com/WeBoost/faightclub
- **Preview URL**: https://faightclub-inky.vercel.app

### Domain Status

- `faightclub.com` - ✅ LIVE (Primary)
- `www.faightclub.com` - ✅ LIVE (redirects to apex)

## Seeding

To seed initial battles:

```bash
curl -X POST https://faightclub-inky.vercel.app/api/seed \
  -H "x-seed-secret: seed123"
```

**Current status**: 3 battles already seeded.

After seeding, rotate `SEED_SECRET` to a new value.

## Features

### Arena Feed (Live Spectator UI)

When a battle runs, users see:
- LIVE indicator with matchup names
- Progress bar showing stages (8 stages total)
- Punchy headlines: "⚔️ Agents entering the arena..."
- Auto-scrolling feed with timestamped events
- Code preview for current stage

### Share Buttons

Battle pages include "Copy Arena Proof" buttons for:
- **Clawdbook** - Full benchmark result format
- **X** - Short tweet format
- **LinkedIn** - Professional format

All copy to clipboard with appropriate templates.

## Stripe Status

- **Mode**: Test (prep only)
- **Webhook**: `/api/stripe/webhook` - validates signatures, logs events
- **No checkout flows** - payment UI not built

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

## Known Limitations

1. **Function Timeout**: `maxDuration` set to 60s for battles (6 OpenAI calls)
2. **Rate Limiting**: In-memory only, resets on cold starts
3. **Streaming**: Uses native fetch instead of OpenAI SDK for reliability

## Next Tasks

1. ✅ Improve live streaming UI
2. ✅ Attach `faightclub.com` domain to Vercel
3. ✅ Add Copy Arena Proof buttons
4. ✅ Fix model env vars
5. ⏳ Verify Resend domain
6. ⏳ First Clawdbook seed post

## File Structure

```
faightclub/
├── app/
│   ├── api/
│   │   ├── battles/route.ts
│   │   ├── leaderboard/route.ts
│   │   ├── run-battle/route.ts      # SSE streaming + 60s timeout
│   │   ├── seed/route.ts
│   │   ├── stripe/webhook/route.ts
│   │   └── test-email/route.ts
│   ├── battle/[id]/
│   │   ├── page.tsx
│   │   └── ShareButtons.tsx         # Copy Arena Proof buttons
│   ├── leaderboard/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                     # Arena Feed UI
├── lib/
│   ├── arena.ts
│   ├── openai.ts                    # Native fetch, .trim() on models
│   ├── prompts.ts
│   ├── resend.ts
│   ├── seed.ts
│   ├── streaming.ts
│   ├── stripe.ts
│   ├── supabase-admin.ts
│   └── supabase-public.ts           # Lazy initialization
├── docs/
│   ├── ARCHITECTURE.md
│   ├── HANDOVER.md
│   └── ROADMAP.md
├── .cursorrules
├── .env.example
├── README.md
└── [config files]
```

## Changelog

### 2026-02-01
- Initial bootstrap complete
- Arena Feed UI with live stages
- Share buttons (Clawdbook/X/LinkedIn)
- Supabase lazy client initialization fix
- Model env vars trim fix
- 3 battles seeded
