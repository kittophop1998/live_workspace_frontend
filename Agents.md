# Agents.md — Build instructions for AI coding agents

Read this before touching the **Kingdom Manager** codebase.

---

## 1. Project goal
A web-based **2D idle kingdom-management game**. The player observes a small
kingdom and optimizes it by **assigning citizens to jobs, building/upgrading
structures, managing resources, and reacting to random events**. There is no
avatar to control — the player works through **numbers, cards, progress bars, and
logs**. Target feel: cozy, idle, strategic, lightweight, solo-dev-friendly.

## 2. Tech stack (do not change without strong reason)
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **MUI v9** (`@mui/material`) + **Emotion** — components & theming
- **Tailwind CSS v4** — utility classes alongside MUI
- **Zustand v5** — single global store `useKingdomStore`
- **Axios** — HTTP via `src/lib/api.ts`
- Backend (future): **Go**, contract in `api-spec.md`

## 3. Game design constraints
- **NO real AI/LLM.** Any "smart"/"AI" behavior = simple rule-based policy logic
  (see `PolicyRule` in `api-spec.md`). Deterministic, server-evaluable.
- **NO game engine.** Do **not** add Unity, Phaser, Pixi, Three.js, or a canvas
  tilemap. The "map" is a **grid of building cards**.
- **NO real-time pathfinding / moving sprites.**
- **NO multiplayer.** Single player, single kingdom.
- Backend is **server-authoritative** for all resource math; frontend only
  displays and interpolates (see api-spec §1).
- Keep it **lightweight**. Don't over-engineer.

## 4. What to build FIRST (MVP)
1. Documentation: `api-spec.md`, `Design.md`, `Agents.md` (done).
2. Mocked frontend dashboard driven by `src/data/mock.ts` + the service layer.
3. The components in `Design.md §5`, wired to the Zustand store.
4. A working game loop *feel*: changing numbers, filling bars, ticking tasks,
   activity log, resolvable events — all on mock data.

## 5. What NOT to build yet
- The Go backend (only design it in `api-spec.md`).
- WebSockets (design only; MVP polls / uses the local tick).
- Auth screens / accounts (assume a single demo kingdom).
- Persistence/save-game, payments, leaderboards, multiplayer.
- A real sprite/tilemap renderer.

## 6. Coding rules
- Output minimal, idiomatic code that matches surrounding style.
- **Strict TypeScript** — no `any` in committed code; model from api-spec types.
- Functional components + hooks. `"use client"` only where interactivity needs it.
- MUI-first for components; `sx` prop or Tailwind utilities for layout/spacing.
- Reusable components — no copy-pasted card markup; extract to `components/`.
- Don't compute final resource totals on the client (display/interpolate only).
- Respect `prefers-reduced-motion` for animations.
- **VERIFY BEFORE DONE**: run `npm run build` / `npm run lint`; never claim done
  without evidence.
- Every visual element must have a purpose. If an illustration, decoration, or pixel element does not improve navigation, feedback, or delight, remove it. Minimalism always
  wins over decoration.

## 7. Frontend architecture expectations
```
app/                      # thin route files → render a module screen
src/
  components/             # shared UI (GameLayout, ResourceBar, cards, theme…)
  lib/        api.ts      # axios client, envelope unwrap(), endpoint map
              store.ts    # useKingdomStore (state + actions + navigation)
              routes.ts   # screen ↔ path mapping, tab helpers
  services/   kingdom.service.ts   # typed API methods (1:1 with api-spec)
  data/       mock.ts     # mock kingdom/citizens/buildings/events/logs
  modules/    <feature>/  # screen components (village, citizens, …)
```
- **Navigation** is store-driven: `store.go(screen)` / `store.setTab(tab)` emit a
  `kingdom:navigate` event that `GameLayout` syncs to the URL. Do **not** call the
  Next router directly from feature code.
- Screens live in `src/modules`; `app/*/page.tsx` files stay thin.

## 8. Backend API expectations
- Everything the frontend calls is defined in `api-spec.md`. Treat it as the
  contract. Base path `/api/v1`, envelope `{success,message,data}`, errors with
  `error.code`.
- Service methods must map 1:1 to api-spec endpoints and return the documented
  shapes (so swapping mock → real is one file change in the service layer).

## 9. Mock data strategy
- All mock data lives in `src/data/mock.ts` and **matches `api-spec.md` models
  exactly** (snake_case fields where the API uses them; normalized to camelCase in
  the service/store boundary, mirroring the original project).
- The service layer reads mock data behind the same async signatures the real
  API will have, so components never know whether data is mock or live.
- A local **tick hook** simulates production so the dashboard feels alive without
  a backend.

## 10. Naming conventions
- Components: `PascalCase` files matching the export (`BuildingCard.tsx`).
- Hooks: `useX`. Store: `useKingdomStore`. Service: `kingdomService`.
- Types from API models: `PascalCase` (`Building`, `Citizen`, `GameEvent`).
- Enums as string unions matching api-spec (`"farmer" | "lumberjack" | …`).
- Resource/building/job keys are the **snake_case strings from api-spec**.

## 11. Component organization
- One component per file under `src/components/` (shared) or `src/modules/<feat>/`
  (screen-specific). Keep cards dumb/presentational; data + actions come from the
  store via props or selectors.
- Reuse `ProgressBar`, `AnimatedNumber`, `StatCard`, `StatusBadge` everywhere
  rather than re-implementing.

## 12. State management rules
- One store: `useKingdomStore`. No competing React state for game data.
- Pattern: `set({ apiLoading: true })` → service call → patch slices →
  `set({ apiLoading: false })`. Errors → `apiError` string, never thrown to UI.
- Derived values (affordability, %, ETA) computed in selectors/components.
- Local `useState` is fine for pure UI (open/closed, form fields).

## 13. How to update `api-spec.md` when adding a feature
1. Add/extend the **data model** in §2.
2. Add the **endpoint** row in §3 and a request/response **example** in §4.
3. Add the rendering mapping in §5 if it drives new UI.
4. Mirror the model in `src/data/mock.ts` and add a `kingdomService` method.
5. Keep field names identical between spec, mock, and service.

## 14. Keeping frontend & backend contracts aligned
- `api-spec.md` is the single source of truth. Frontend types derive from it.
- Never let the UI invent fields the API can't supply, or compute authoritative
  game state locally.
- When the Go backend lands, only `kingdom.service.ts` switches from mock to
  `apiClient`; components, store, and types stay unchanged.
- If a mismatch is found, fix `api-spec.md` first, then the code.
