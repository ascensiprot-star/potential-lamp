# Truvornex

**Hyperlocal services super-app** connecting customers with trusted local providers across professional services, transport, and community support — built around a portable provider reputation system, real-time neighborhood coordination, and an integrated financial layer.

---

## What It Does

Truvornex is the trust and transaction layer for local economies. It replaces fragmented, informal service discovery with a structured, AI-assisted platform where providers build portable reputation and customers get reliable, on-demand access to services in their neighborhood.

---

## Core Modules

### Services & Bookings
Search, book, and manage recurring service bookings across categories including cleaning, plumbing, electrical, fitness, tutoring, and more.

### Transport
Ride-hailing style booking integrated into the same trust graph as the broader service marketplace.

### Provider Reputation
Portable, verifiable trust scores and exportable credentials — reputation that travels with the provider across platforms.

### Financial Layer
In-app wallet, BNPL eligibility tiers, loyalty and time credits, and instant provider payouts.

### Neighborhood OS
Zone-based community infrastructure including:
- **Emergency Now** — urgent on-demand provider matching
- **Group Buy** — neighborhood-wide bundled service deals
- **Skill Swap** — peer-to-peer time-credit bartering
- **Neighborhood Jury** — community-based dispute resolution
- **Community Feed** — local posts, jobs, events, and polls

### Admin & Provider Dashboards
Financial reporting, AI controls, and provider copilot tools.

### Simon AI
Integrated AI layer handling dispatch, dynamic pricing, and neighborhood-level recommendations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui (Radix primitives) |
| Backend | Express.js + Node.js |
| Database | PostgreSQL (via Supabase + Drizzle ORM) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Edge Functions | Supabase Edge Functions |
| Payments | Stripe |
| Maps | React Leaflet |
| AI Layer | Simon AI (custom) |
| Design System | Monochrome dark-mode UI — Space Grotesk / Inter / JetBrains Mono |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (URL + anon key)

### Setup

```bash
git clone https://github.com/Jelvantrix/truvornex.git
cd truvornex
npm install
cp .env.example .env   # fill in your Supabase and Simon AI credentials
npm run dev
```

### Database

Apply migrations to your Supabase project:

```bash
supabase db push
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint codebase |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run typecheck` | Type-check with jsconfig |

---

## Environment Variables

All sensitive keys (Supabase service role, AI provider keys, Stripe secret) must be configured as Supabase secrets and accessed only via Edge Functions — never exposed in client-side `.env` variables prefixed with `VITE_`.

---

## Security

- Row Level Security (RLS) enforced on all tables
- AI requests routed through server-side Edge Functions
- Rate limiting on all API endpoints
- Audit logging on financial and administrative actions
- Session-based auth with `express-session` + `connect-pg-simple`

---

## Built By

[Xylvanthrex Labs](https://github.com/Jelvantrix) — independent research institution building first-principles systems across AI, cybersecurity, operating systems, and hyperlocal infrastructure.

---

## License

Proprietary — All rights reserved.
