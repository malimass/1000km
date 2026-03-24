# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**1000 km di Gratitudine** — a fullstack PWA + native mobile app (Capacitor) for a 1000km pilgrimage from Bologna to Calabria (April 15 – May 1, 2026). Combines fundraising for Komen Italia, real-time GPS tracking of two runners, community participation, coach/athlete training analytics, and an admin dashboard. Italian-language UI.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
npm run cap:sync     # Sync Capacitor native projects
npm run cap:ios      # Build + open iOS project
npm run cap:android  # Build + open Android project
```

Run a single test file: `npx vitest run src/test/example.test.ts`

## Architecture

### Frontend (React + Vite + TypeScript)

- **Entry**: `src/main.tsx` → `src/App.tsx` (React Router v6 with lazy-loaded pages)
- **Pages**: `src/pages/` — 26 page components, all lazy-loaded with chunk retry
- **Components**: `src/components/` — app components + `ui/` subdir (50+ shadcn/ui components)
- **Lib**: `src/lib/` — utilities (API client, auth helpers, tappe data, tracking, coach analysis)
- **Hooks**: `src/hooks/` — custom React hooks
- **State**: TanStack Query v5 for server state, localStorage as offline fallback
- **Styling**: Tailwind CSS with custom theme (fonts: Cinzel/Montserrat, colors: primary/accent/dona)
- **Path alias**: `@/` → `./src/`

### Backend (Vercel Serverless)

- **Single router**: `api/router.ts` — all API endpoints in one file (~2000 lines), deployed as a Vercel serverless function
- **Database**: `api/_lib/db.ts` — Neon PostgreSQL (serverless driver), SQL template literals
- **Auth**: `api/_lib/auth.ts` — JWT (HS256, 7-day expiry), Bearer token in headers
- **Email**: `api/_lib/email.ts` — Resend for transactional emails and donation reminders
- **Routing**: All `/api/*` requests rewrite to `/api/router` via `vercel.json`
- **Cron**: Daily 9am job at `/api/cron/pending-reminders` (multi-level: 2, 7, 14, 28 days)

### Database (Neon PostgreSQL)

- Schema: `neon-schema.sql` (full), `migrations/` (incremental)
- Key tables: `users`, `donazioni`, `raccolta_fondi`, `iscrizioni`, `notizie`, `live_position`, `route_positions`, `community_live_position`, `community_route_positions`, `profiles`, `athlete_profiles`, `coach_sessions`
- RLS enabled: public read on content tables, admin-only write on settings, user-only write on own data

### Key Integrations

- **Payments**: Stripe (t-shirt purchases), SumUp (alternative checkout)
- **Maps**: React Leaflet (interactive map), Geoapify (static snapshots), Google Directions API
- **Native**: Capacitor for iOS/Android (geolocation, background tracking, push notifications, share)
- **Social**: Meta Graph API v20 (Facebook/Instagram posting from admin)
- **Media**: Cloudinary (image/video hosting)

### Auth Model

- Admin: PIN-based login (`VITE_ADMIN_PIN` env var)
- Athletes/Coaches: email + password registration with JWT
- Community users: simplified signup for GPS tracking participation
- Protected routes use `ProtectedAdminRoute` and `ProtectedCoachRoute` wrapper components

### GPS Tracking

- Two main runners tracked via `live_position` table (id=1 Massimo, id=2 Nunzio)
- Community users tracked via `community_live_position` / `community_route_positions`
- Historical trails stored per session (session_id = date string)
- Stale markers auto-hidden after 10 minutes without update

## Deployment

Hosted on Vercel. SPA routing: all non-API routes rewrite to `/index.html`. PWA with auto-update via Vite PWA plugin. Environment variables defined in `.env.local.example`.
