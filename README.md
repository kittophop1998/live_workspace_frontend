# Kingdom Manager — Frontend

A cozy, web-based **2D idle kingdom-management game**. Assign citizens to jobs,
build and upgrade structures, manage resources, and survive random events — all
through cards, numbers, progress bars, and small pixel-style icons. No game
engine, no real AI.

## Docs
- [`api-spec.md`](./api-spec.md) — future Go backend API contract
- [`Design.md`](./Design.md) — frontend design / layout / visual system
- [`Agents.md`](./Agents.md) — build rules for AI coding agents

## Getting started
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · MUI v9 + Emotion · Tailwind v4
· Zustand v5 · Axios.

## How it works (MVP)
- Runs entirely on **mock data** (`src/data/mock.ts`) shaped exactly like
  `api-spec.md`. Swapping to the real backend is a one-file change in
  `src/services/kingdom.service.ts`.
- A local **tick loop** (`src/lib/useGameTick.ts`) simulates production so the
  dashboard feels alive; the live backend will own this math.
- Navigation is **store-driven** (`useKingdomStore` + `kingdom:navigate` event).

## Structure
```
app/                 # thin route files → render a module screen
src/components/       # GameLayout, ResourceBar, cards, theme, primitives
src/lib/             # api.ts, store.ts, routes.ts, types.ts, useGameTick.ts
src/services/        # kingdom.service.ts (1:1 with api-spec endpoints)
src/data/mock.ts     # mock kingdom database
src/modules/         # screens (Dashboard, Citizens, Buildings, Events, Policies)
```
