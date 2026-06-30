# AI Rules & Constraints (Strict)
- Role: Expert Senior Developer
- Output: Extremely concise. Code blocks directly.
- Token Saving: No greetings, no explanations, no conversational filler.
- Only explain if explicitly asked or for critical bugs.

---

# Rules
- **NO MAGIC** — ไม่รู้ห้ามเดา ไม่รู้ path อยู่ไหนให้ถาม ไม่ใช่แต่งขึ้นมา
- **VERIFY BEFORE DONE** — ห้ามบอก "เสร็จ" ถ้ายังไม่รัน ไม่มีหลักฐาน ห้ามพูด done **(กฎสำคัญสุดในไฟล์)**
- **DISSENT** — ก่อนทำของใหญ่ ให้เถียงก่อน พังแล้วกระทบแค่ไหน, ถอยกลับได้มั้ย
- **SCOPE DRIFT** — สั่งแก้ bug 1 ตัว แต่ดันไป refactor ทั้ง module ให้มันเตือน
- **R0/R1/R2** — ถอยไม่ได้ = หยุดถาม | ถอยยาก = ทำแล้วบอก | ถอยง่าย = ทำเลย

---

# Tech Stack
- **Next.js 16** + **React 19** + **TypeScript**
- **MUI v9** (`@mui/material`) + Emotion — UI components & theming
- **Tailwind CSS v4** — utility classes (ใช้คู่กับ MUI ได้)
- **Zustand v5** — global state (store เดียว `useKingdomStore`)
- **Axios** — HTTP client via `src/lib/api.ts` (`apiClient`)

> **Project = Kingdom Manager** — 2D idle kingdom-management game. ดู `Design.md`,
> `api-spec.md`, `Agents.md`. **ห้าม** ใส่ game engine (Unity/Phaser/Pixi),
> ห้ามใส่ AI/LLM จริง (ใช้ rule-based policy แทน), ห้าม multiplayer.

---

# Project Commands
```
npm run dev      # dev server
npm run build    # production build
npm run start    # serve production
npm run lint     # eslint
```

---

# Architecture

## Screen / Navigation
- App เป็น SPA-style: การ navigate = เปลี่ยน `screen` ใน Zustand store
- ไม่ใช้ Next.js Router โดยตรง — ใช้ `store.go(screen)` หรือ `store.setTab(tab)`
- URL sync ทำผ่าน custom event `kingdom:navigate` → จัดการใน `GameLayout`
- Screen ↔ path mapping อยู่ที่ `src/lib/routes.ts`
- Screens: `village | citizens | buildings | events | policies`

## State (`src/lib/store.ts`)
- Store เดียว `useKingdomStore`: kingdom, resources, citizens, buildings, tasks, logs, events, policies, screen/tab
- Actions: `assignCitizen`, `bulkAssignIdle`, `upgradeBuilding`, `resolveEvent`, `collectOffline`, `togglePolicy`, `tick`
- `tick(dtSec)` = local production loop (mock) เรียกจาก `useGameTick`; backend จริงเป็นเจ้าของการคำนวณ
- Error handling: `apiError` string ใน store (ไม่ throw ออกไป)
- Floating numbers/logs สื่อผ่าน custom event `kingdom:gain`

## API Layer
- `src/lib/api.ts` — `apiClient`, token (`kingdom_access_token`), `unwrap<T>()`, `endpoints` (1:1 กับ api-spec §3)
- `src/services/kingdom.service.ts` — typed methods + normalizers (snake_case API → camelCase frontend). MVP อ่านจาก `src/data/mock.ts`
- `src/lib/types.ts` — frontend domain types (mirror api-spec §2)
- Envelope: `{ success, message, data }` → `unwrap()`
- Base URL: `NEXT_PUBLIC_API_URL` → default `http://localhost:8080/api/v1`

## File Structure
```
src/
  components/     # GameLayout, ResourceBar, *Card, theme, common (primitives)
  lib/            # api.ts, store.ts, routes.ts, types.ts, useGameTick.ts
  modules/        # screens (Dashboard, Citizens, Buildings, Events, Policies)
  services/       # kingdom.service.ts
  data/           # mock.ts (mock kingdom DB, snake_case = api-spec)
```

## Patterns to Follow
- เพิ่ม screen ใหม่ → `Screen`/`Tab` (store.ts) + `screenPaths` (routes.ts) + page ใน `app/`
- เพิ่ม API → model ใน `api-spec.md` + type ใน `types.ts` + `endpoints` (api.ts) + method+normalizer ใน service + mock ใน `data/mock.ts`
- Mock ต้อง match `api-spec.md` เป๊ะ (snake_case); service เป็นที่เดียวที่ normalize
- Component ใหม่ → MUI-first, reuse `ProgressBar`/`AnimatedNumber`/`StatCard`/`StatusBadge`
- ไม่คำนวณ resource total สุดท้ายฝั่ง client (display/interpolate เท่านั้น)

---

@MEMORY.md
