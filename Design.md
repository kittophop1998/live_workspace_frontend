# Live Workspace — Frontend Design

A real-time, in-browser **schema collaboration hub** for backend & frontend devs.
Teams join a shared **room** to design, discuss, and export API contracts —
endpoints, database tables, and schema models — together. The UI is a focused,
**IDE-like three-column workspace**: explore on the left, edit a blueprint in the
center, collaborate on the right.

The feel is **modern-minimalist / neo-brutalist**: high-contrast structure,
crisp dark borders, flat offset shadows, and **icons first**. Clean and
glanceable — a developer tool, not a marketing page.

---

## 1. UI direction

- **Structure over decoration.** Boundaries are drawn with **2px ink borders**
  (`#0A0A0A`) and **flat offset shadows** (no soft blur as the primary cue),
  softened by a faint ambient layer so surfaces read as "lifted".
- **Icon-forward.** Every action, tab, group, and status carries a MUI icon.
  Text labels support icons, not the other way around.
- **Glanceable diff & state.** Field `state` (draft / ready / breaking) and
  `change` (added / modified / removed) are readable in under a second via color
  + border weight, never buried in text.
- **Inline, direct editing.** Click a name, path, key, type, or status to edit it
  in place — no modal-heavy flows. Modals only for bulk/raw input (Paste JSON,
  Import Spec).
- **Calm motion.** Short transitions (80–250ms), subtle hover lifts, button
  press-down. Respects `prefers-reduced-motion`.

---

## 2. Layout

### Desktop (≥ md, 900px+)
```
┌──────────────────────────────────────────────────────────────────────┐
│ TOP BAR  ⚡ Live Workspace · [Room 123456 ⧉] · ●N online · avatars ⏏ │
├────────────┬──────────────────────────────────────┬───────────────────┤
│ LEFT 280px │  CENTER  (1fr)                        │  RIGHT 360px      │
│ EXPLORER   │  ┌ header: icon · kind · name ──────┐ │  ┌ tabs ────────┐ │
│            │  │ GET /path · N fields · updated…  │ │  │⟲ Activity     │ │
│ ⊟ API      │  └──────────────────────────────────┘ │  │❝ Comments (N) │ │
│   • User   │  BLUEPRINT TABLE                       │  │< > Export     │ │
│   • Order  │   KEY · TYPE · REQ · NOTES · STATE     │  └──────────────┘ │
│ ⊟ DB       │   [field rows w/ diff borders]         │   [tab content]   │
│   • users  │   + Paste JSON      legend             │                   │
│            │  RESPONSE SCHEMAS  [200][400][500] …   │                   │
└────────────┴──────────────────────────────────────┴───────────────────┘
```
- **Top bar** (`TopBar`, 56px): brand mark, shareable **room code** (click to
  copy), live **presence** (online count + collaborator avatars, online ringed
  green), leave-room.
- **Left — Explorer** (`LeftPanel`): resources grouped by kind (API Endpoints,
  Databases) with per-group counts and a `＋` add button; state-legend badges;
  each row shows a state dot, name, path, and a colored method tag.
- **Center — Blueprint** (`CenterPanel`): resource header (kind icon badge, kind
  label, editable name, method/path, field count, last-updated) → the **field
  table** → **Response Schemas** section (endpoints only).
- **Right — Collaboration** (`RightPanel`): three tabs — **Activity** feed,
  **Comments** thread (workspace- or field-scoped), **Export** (TypeScript / JSON
  codegen).

### Mobile (< md)
- Center panel only; left and right panels are hidden (`display: none`).
- Room entry (`RoomGate`) is a single centered card.

The shell is a CSS grid `280px minmax(0,1fr) 360px` on `md+`, collapsing to a
single `1fr` column below.

---

## 3. Surfaces & components

| Region | Component | Shows / does |
|--------|-----------|--------------|
| Gate | `RoomGate` | create / join a room (name + code), then mounts the workspace |
| Top | `TopBar` | brand, room code copy, presence avatars, online count, sign out |
| Left | `LeftPanel` | grouped resource explorer + add + state legend |
| Center | `CenterPanel` | resource header + blueprint table + response schemas |
| Center | `FieldRow` | one schema field (key, type, required, notes/diff, state, comment, delete) |
| Center | `ResponseSchemaPanel` | per-status response schemas (200/400/500…) for endpoints |
| Center | `ImportSpecDialog` | import OpenAPI / Postman to populate fields & responses |
| Right | `RightPanel` | tab switcher (Activity / Comments / Export) |
| Right | `ActivityLog` | newest-first feed of who-changed-what, relative time |
| Right | `CommentThread` | comments on a resource or a specific field + composer |
| Right | `CodeExport` | generated TypeScript / JSON for the selected resource |
| Shared | `common.tsx` | `StateBadge`, `MonoTag`, `Avatar`, `useNow`, `relativeTime` |

### Blueprint table (`CenterPanel` + `FieldRow`)
- Bordered card with an **ink column header** (`KEY · TYPE · REQ · NOTES/DIFF ·
  STATE`).
- Each row: monospace **key** (inline-editable), **type** dropdown, **required**
  toggle (✓ green `CheckCircle` / hollow `RadioButtonUnchecked`), description /
  inline JSON value / diff label, a **state badge** (click to cycle), a
  **comment** anchor with count badge, and a **delete** action.
- **Diff treatment:** a left border whose weight (3px → 6px) and color encode the
  field `change`; removed fields are struck through and dimmed; commented fields
  get an amber focus tint.
- **Required / primary** fields show a key icon in the key column.

### Explorer (`LeftPanel`)
- Groups: **API Endpoints** (`ApiIcon`), **Databases** (`StorageIcon`), each with
  a count and a bordered `＋` hover button.
- Rows: state dot + name + (endpoint) mono path + method tag; active row is white
  with a flat offset shadow.

### Response Schemas (`ResponseSchemaPanel`)
- Collapsible section under the endpoint blueprint.
- Status tabs colored by class (**2xx** green, **4xx** amber, **5xx** red); each
  is its own field table. Add common statuses from a menu; Paste JSON per status.

### Collaboration (`RightPanel`)
- Tabs carry icons: **Activity** (`History`), **Comments** (`ForumOutlined`),
  **Export** (`Code`).
- Empty states are icon + one-line message, not bare text.

---

## 4. Visual style

Design tokens live in `src/components/theme.ts` (MUI theme) and `app/globals.css`.

### Color
| token | hex | use |
|-------|-----|-----|
| ink / line / primary | `#0A0A0A` | text, borders, primary fills |
| paper | `#FFFFFF` | cards / panels |
| wash | `#F4F4F5` | app background, inset surfaces |
| text secondary | `#52525B` | secondary text |
| muted | `#71717A` / `#A1A1AA` | captions, placeholders |

**Field state** (bordered badge fills):
draft `#FEF3C7`/`#92400E` · ready `#DCFCE7`/`#166534` · breaking `#FEE2E2`/`#991B1B`.

**Diff / change:** added `#16A34A` · removed `#DC2626` · modified `#D97706` ·
stable `#0A0A0A`.

**HTTP method:** GET `#2563EB` · POST `#16A34A` · PUT `#D97706` ·
PATCH `#7C3AED` · DELETE `#DC2626`.

### Typography
- **UI:** Noto Sans Thai via `--font-prompt` (TH + EN), weights 100–900.
- **Code:** monospace via `--font-mono` (SFMono / ui-monospace) for keys, types,
  paths, JSON, room code, and export output.
- Scale: `h1` 22/800, `h2` 17/800, `h3` 13/800 uppercase tracked, `body1` 14,
  `body2` 13, `caption` 11/600. Buttons 700, no uppercase transform by default.

### Shape & elevation
- Base radius **8px**; cards/blueprints **10–12px**; chips/tags **6px**;
  avatars / pills **999px**.
- `flatShadow` = `4px 4px 0 #0A0A0A` + faint ambient layer (cards, dialogs,
  active surfaces); `flatShadowSm` = `2px 2px 0 #0A0A0A` (buttons, small tags);
  `softShadow` for subtle depth.
- Inputs, chips, buttons all carry the 2px ink border treatment.

### Iconography (MUI `@mui/icons-material`)
- Brand `Bolt`; kinds `Api` / `Storage` / `SchemaOutlined`; tabs `History` /
  `ForumOutlined` / `Code`; required `CheckCircle` / `RadioButtonUnchecked`;
  actions `Add`, `EditOutlined`, `DeleteOutline`, `ContentCopy`, `Check`,
  `Logout`, `DataObject`, `Send`, `ExpandMore`. Empty states reuse the section's
  icon at large size in a dashed/ghost frame.

---

## 5. Interaction patterns

- **Inline edit:** click resource name, endpoint path, field key/type/required,
  or response description to edit in place; Enter / blur commits.
- **Method picker:** mono method tag opens a colored dropdown (GET…DELETE).
- **State cycling:** click a state badge to cycle draft → ready → breaking.
- **Paste JSON:** paste a JSON object → fields are generated with inferred types;
  nested objects become editable `json` fields.
- **Import spec:** load OpenAPI / Postman to populate fields and response schemas.
- **Comments:** anchor to a field via its comment icon, or thread on the whole
  resource; composer posts as the current collaborator (⌘/Ctrl+Enter).
- **Presence & sharing:** copy the room code from the top bar; avatars show who's
  online in real time.
- **Export:** switch the resource to TypeScript or JSON in the Export tab.

---

## 6. State & data

- **Stores (Zustand):** `useWorkspaceStore` (`src/lib/store.ts`) holds resources,
  comments, activity, collaborators, presence, room/session, and UI selection
  (`selectedId`, `activeFieldId`, `rightTab`). Response schemas live in a separate
  client-local store (`src/lib/responseSchemas.ts`, persisted to localStorage).
- **Service layer:** `src/services/workspace.service.ts` is the only place that
  knows the wire format — typed methods + snake_case→camelCase normalizers against
  `api-spec.md`.
- **Realtime:** `src/lib/realtime.ts` — WebSocket client with reconnect and a
  presence heartbeat; remote events merge by `rev`. Hydration via
  `src/lib/useWorkspaceSync.ts` (`GET /workspace` + `/me`).
- **Domain types:** `src/lib/types.ts` — `Resource` (`endpoint | database |
  model`) with `SchemaField[]`, plus `Comment`, `ActivityEvent`, `Collaborator`,
  `Presence`, `ResponseSchema`.
- **Codegen:** `src/lib/codegen.ts` turns a resource into TypeScript / JSON.
- **Derived, not stored:** counts, diff styling, affordability of actions, and
  status colors are computed in components/selectors, never persisted.

---

## 7. Motion

- **Hover lift** on buttons / icon buttons (`translate(-1px,-1px)` + shadow grow);
  **press-down** (`translate(2px,2px)`, shadow collapse).
- **Row hover** tint on field rows (white → `#FAFAFA`).
- **New activity line** slides/fades in (`@keyframes log-in`, ~250ms).
- **Required toggle** scales on hover; **response section** chevron rotates on
  fold.
- All transitions stay in the 80–250ms range and honor `prefers-reduced-motion`.

---

> **Scope guardrails:** pure client + REST/WS backend per `api-spec.md`. No game
> engine, no real LLM/AI (rule-based only), no separate router (selection state
> drives the view). Keep the neo-brutalist, icon-forward language consistent when
> adding surfaces; reuse `StateBadge` / `MonoTag` / `Avatar` and the theme tokens
> rather than introducing new colors or shadow styles.
