# FAIghtClub Architecture

## Overview

FAIghtClub is a real-time AI battle arena built on Next.js App Router with streaming spectator mode.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (Postgres)
- **AI**: OpenAI API
- **Hosting**: Vercel
- **Email**: Resend (prep)
- **Payments**: Stripe (prep)

## Battle Pipeline

```
User Prompt
    │
    ▼
┌─────────────┐
│  Generator  │ ← Premium model (gpt-4o)
│   Agent A   │   max_tokens: 900
└──────┬──────┘
       │
┌──────▼──────┐
│  Generator  │ ← Premium model (gpt-4o)
│   Agent B   │   max_tokens: 900
└──────┬──────┘
       │
┌──────▼──────┐
│  Refiner A  │ ← Premium model (short pass)
└──────┬──────┘
       │
┌──────▼──────┐
│  Refiner B  │ ← Premium model (short pass)
└──────┬──────┘
       │
┌──────▼──────┐
│   Critic    │ ← Economy model (gpt-4o-mini)
│             │   max_tokens: 500
└──────┬──────┘
       │
┌──────▼──────┐
│    Judge    │ ← Economy model (gpt-4o-mini)
│             │   max_tokens: 500
└──────┬──────┘
       │
       ▼
   Winner + Score
```

## Streaming Architecture

```
Browser                     Server
   │                          │
   │  EventSource connect     │
   ├─────────────────────────►│
   │                          │
   │  SSE: entering           │
   │◄─────────────────────────┤
   │                          │
   │  SSE: generating_a       │
   │◄─────────────────────────┤
   │  SSE: generating_a+data  │
   │◄─────────────────────────┤
   │                          │
   │  ... (more stages)       │
   │                          │
   │  SSE: winner             │
   │◄─────────────────────────┤
   │                          │
   │  Connection close        │
   │◄─────────────────────────┤
```

Stages:
1. `entering` - Battle starting, agent names
2. `generating_a` - Agent A generating code
3. `generating_b` - Agent B generating code
4. `refining_a` - Agent A code refinement
5. `refining_b` - Agent B code refinement
6. `critique` - Critic analyzing both
7. `judging` - Judge making decision
8. `winner` - Winner declared

## Data Flow

```
┌──────────────────────────────────────────────────┐
│                     Client                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │  Home   │  │ Battle  │  │   Leaderboard   │  │
│  │  Page   │  │  View   │  │      Page       │  │
│  └────┬────┘  └────┬────┘  └────────┬────────┘  │
│       │            │                │            │
│       │ Read       │ Read           │ Read       │
│       ▼            ▼                ▼            │
└───────┼────────────┼────────────────┼────────────┘
        │            │                │
        │            │                │
        ▼            ▼                ▼
┌───────────────────────────────────────────────────┐
│                   Supabase                        │
│                                                   │
│   ┌─────────────┐       ┌─────────────────┐      │
│   │   battles   │       │   leaderboard   │      │
│   └──────▲──────┘       └────────▲────────┘      │
│          │                       │               │
└──────────┼───────────────────────┼───────────────┘
           │                       │
           │ Write (service role)  │
           │                       │
┌──────────┼───────────────────────┼───────────────┐
│          │                       │               │
│   ┌──────┴──────┐         ┌──────┴──────┐       │
│   │ run-battle  │         │   seed      │       │
│   │   route     │         │   route     │       │
│   └─────────────┘         └─────────────┘       │
│                                                  │
│                   Server                         │
└──────────────────────────────────────────────────┘
```

## Security Model

```
                Client                          Server
                  │                               │
                  │ anon key                      │ service role key
                  │ (read only)                   │ (full access)
                  │                               │
                  ▼                               ▼
            ┌─────────┐                     ┌─────────┐
            │  Read   │                     │  Write  │
            │ battles │                     │ battles │
            │ leaderb │                     │ leaderb │
            └─────────┘                     └─────────┘
```

RLS enforces:
- Public can SELECT from battles and leaderboard
- Only service role can INSERT/UPDATE

## Rate Limiting

Simple in-memory rate limiting in `/api/run-battle`:
- 10 requests per minute per IP
- Best-effort (resets on server restart)

For production, consider:
- Redis-based rate limiting
- Upstash or similar service
- Per-user limits with auth

## Token Efficiency

| Model | Use Case | max_tokens |
|-------|----------|------------|
| Premium (gpt-4o) | Generator, Refiner | 900 |
| Economy (gpt-4o-mini) | Critic, Judge | 500 |

Prompts are:
- Short and strict
- Request CODE ONLY where applicable
- JSON format for structured output

## Future Considerations

### Phase 2+ Ideas
- User authentication
- Custom agent configurations
- Tournament brackets
- Real-time multiplayer spectating
- Voting/betting system
- Premium features (Stripe)

### Scalability
- Move rate limiting to Redis
- Add connection pooling for Supabase
- Consider edge functions for lower latency
- CDN caching for battle results
