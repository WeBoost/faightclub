# FAIghtClub Roadmap

## Phase 1: MVP (Current)

### Completed ✅
- [x] Project structure
- [x] Arena battle pipeline
- [x] SSE streaming spectator mode
- [x] Homepage with battle input
- [x] Battle detail view
- [x] Leaderboard page
- [x] Supabase schema design
- [x] OpenAI integration
- [x] Stripe webhook stub
- [x] Resend email helper
- [x] Seed data
- [x] Documentation

### Pending 🔄
- [ ] Create Supabase project
- [ ] Run database schema
- [ ] Set environment variables
- [ ] Create GitHub repo
- [ ] Deploy to Vercel
- [ ] Test end-to-end flow
- [ ] Verify Resend domain

## Phase 2: Polish & Viral Features

### High Priority
- [ ] Battle sharing (social cards)
- [ ] Battle replay mode
- [ ] More agent personalities
- [ ] Sound effects / animations
- [ ] Mobile responsiveness improvements

### Medium Priority
- [ ] Battle history pagination
- [ ] Agent avatar generation
- [ ] Code syntax highlighting
- [ ] Dark/light theme toggle
- [ ] Loading skeletons

### Low Priority
- [ ] Keyboard shortcuts
- [ ] Battle export (PDF/image)
- [ ] RSS feed of battles
- [ ] API rate limiting dashboard

## Phase 3: Growth Features

### Authentication
- [ ] OAuth (Google, GitHub)
- [ ] User profiles
- [ ] Battle history per user
- [ ] Favorite battles

### Social
- [ ] Comments on battles
- [ ] Upvotes/downvotes
- [ ] Share to Twitter/X
- [ ] Embed widget

### Gamification
- [ ] User XP system
- [ ] Achievement badges
- [ ] Daily challenges
- [ ] Weekly tournaments

## Phase 4: Monetization (Prep Only)

### Stripe Integration
- [ ] Subscription plans
- [ ] Credit system
- [ ] Premium agents
- [ ] Ad-free experience

### Features
- [ ] Higher rate limits for premium
- [ ] Custom prompts library
- [ ] Priority queue
- [ ] Analytics dashboard

## Technical Debt

### Performance
- [ ] Redis rate limiting
- [ ] Connection pooling
- [ ] Edge caching
- [ ] Image optimization

### Code Quality
- [ ] Unit tests
- [ ] E2E tests
- [ ] Error monitoring (Sentry)
- [ ] Logging infrastructure

### Security
- [ ] WAF rules
- [ ] CORS hardening
- [ ] Input sanitization audit
- [ ] Dependency audit

## Notes

- All Phase 4 Stripe work is PREP ONLY - do not build checkout UI
- Resend domain verification must happen before email features
- Auth is explicitly out of scope for MVP
- Keep prompts short and token-efficient
