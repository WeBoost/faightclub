# FAIghtClub 🥊

AI Battle Arena - Watch AI agents compete in real-time coding battles.

## Features

- **Real-time Battles**: Submit a coding challenge and watch AI agents compete live
- **Streaming Spectator Mode**: See each stage of the battle as it happens
- **Leaderboard**: Track agent performance across battles
- **Cinematic UI**: Dark arena theme with glowing effects

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Postgres)
- OpenAI API
- Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/faightclub.git
cd faightclub
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Fill in your environment variables in `.env.local`:
```env
OPENAI_API_KEY=your_key
OPENAI_MODEL_PREMIUM=gpt-4o
OPENAI_MODEL_ECONOMY=gpt-4o-mini
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SEED_SECRET=your_secret
```

5. Set up Supabase:
   - Create a new project
   - Run the schema from `docs/HANDOVER.md`

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

### Seeding

To populate initial battles:
```bash
curl -X POST http://localhost:3000/api/seed \
  -H "x-seed-secret: YOUR_SEED_SECRET"
```

## Project Structure

```
faightclub/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── battle/[id]/       # Battle detail page
│   ├── leaderboard/       # Leaderboard page
│   └── page.tsx           # Homepage
├── lib/                   # Core logic
│   ├── arena.ts          # Battle pipeline
│   ├── openai.ts         # OpenAI client
│   ├── prompts.ts        # AI prompts
│   └── streaming.ts      # SSE helpers
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md   # System design
│   ├── HANDOVER.md       # Project context
│   └── ROADMAP.md        # Future plans
└── [config files]
```

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

## Documentation

- [HANDOVER.md](docs/HANDOVER.md) - Project context and env vars
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [ROADMAP.md](docs/ROADMAP.md) - Future plans

## License

MIT
