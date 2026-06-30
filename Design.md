# Kingdom Manager — Frontend Design

A cozy, idle, strategic kingdom-management dashboard. The player never controls a
character — they **read numbers, watch bars fill, and nudge assignments**. The UI
should feel like a living tiny kingdom rendered through cards, counters, and small
2D/pixel-style icons. Clean and readable first, game-like second — **not** an admin
panel.

---

## 1. UI direction

- **2D / pixel-inspired, but tidy.** Pixel/emoji-style icons for resources,
  buildings and citizens; everything else is soft cards, rounded corners, gentle
  shadows. No isometric engine, no animated tilemap, no pathfinding.
- **Dashboard, not action game.** The "map" is a **village grid of building
  cards**, not a moving scene.
- **Cozy & warm.** Parchment background, amber/gold primary, woody and leafy
  accents. Friendly, calm motion.
- **Glanceable.** Resource rates, progress bars, and status badges readable in
  under a second.

---

## 2. Layout

### Desktop (≥1024px)
```
┌────────────────────────────────────────────────────────────┐
│  TOP RESOURCE BAR  (gold · food · wood · stone · +rate)     │
├───────┬────────────────────────────────────┬───────────────┤
│ SIDE  │  KINGDOM HEADER (name·lvl·XP·badges)│  RIGHT PANEL  │
│ NAV   │                                     │  ─ Citizens   │
│       │  VILLAGE GRID                       │  ─ Task Queue │
│ Village│  [ building cards … ]              │  ─ Events     │
│ Citizens│                                   │               │
│ Builds │                                    │               │
│ Events │                                    │               │
│ Policies│  QUICK ACTIONS row               │               │
├───────┴────────────────────────────────────┴───────────────┤
│  BOTTOM PANEL  — Activity Log  +  Stat cards                 │
└────────────────────────────────────────────────────────────┘
```
- **Left sidebar**: section nav (Village / Citizens / Buildings / Events /
  Policies). Persistent, icon + label.
- **Center**: kingdom header → village grid → quick actions.
- **Right panel**: stacked Citizens, Task Queue, Events (scrolls independently).
- **Bottom panel**: Activity log feed + a row of StatCards (happiness, defense,
  threat, citizens).

### Mobile-first (<768px)
- Single column, sections **stacked vertically** in this order:
  Resource bar (sticky top) → Kingdom header → Quick actions → Village grid →
  Task queue → Events → Citizens → Activity log.
- **Bottom navigation** (4–5 items: Village · Citizens · Tasks · Events · More)
  jumps/scrolls to each section / switches the active screen.
- Resource bar is horizontally scrollable chips if it overflows.

The shell reuses the existing centered responsive column (`max-w` widens from
mobile to a wide desktop grid via Tailwind breakpoints).

---

## 3. Main dashboard structure

| Region | Component | Shows |
|--------|-----------|-------|
| Top | `ResourceBar` | each resource: icon, amount (animated), `+rate/min`, capacity fill |
| Header | `KingdomHeader` | kingdom name, level, XP bar, happiness/defense/threat badges |
| Center | `VillageGrid` → `BuildingCard[]` | building grid |
| Center bottom | `QuickActions` | build, collect offline, train guard, open market |
| Right | `CitizenPanel` → `CitizenCard[]` | citizen roster + job assignment |
| Right | `TaskQueue` | active build/upgrade tasks with progress + ETA |
| Right | `EventPanel` | active events + choice buttons |
| Bottom | `ActivityLog` | scrolling feed of production/build/combat lines |
| Bottom | `StatCard[]` | happiness, defense, threat, citizen count |

### ResourceBar
- One chip per resource: pixel icon, **animated count-up** number, small
  `+N/min` pill (green if positive, red if negative), thin capacity bar
  underneath (`amount/capacity`).
- On production tick: brief **floating `+N`** rises and fades above the chip.

### VillageGrid
- Responsive CSS grid of `BuildingCard`s (2 cols mobile → 3–4 desktop).
- Empty plots render as dashed "＋ Build" tiles → opens build picker.

### BuildingCard
- Pixel building icon + name, **Lv. badge**.
- Worker pips `👷 3/4`, production line `+18 food/min`.
- `status` ribbon: producing / upgrading (with mini progress) / idle.
- Primary **Upgrade** button showing cost; disabled + reason tooltip when
  unaffordable or busy.

### CitizenPanel / CitizenCard
- Compact list. Each card: avatar, name, job chip, **energy bar**, **happiness
  bar**, status dot (working/resting/idle/sick).
- Job dropdown / segmented control to reassign (calls assign API).
- Bulk-assign control at the top ("Send 2 idle → Farm").

### TaskQueue
- Rows with label, `ProgressBar`, remaining time counting down, cancel.
- Shows used/total slots (e.g. `2/3`).

### ActivityLog
- Newest-first feed; colored left border by `type`; relative timestamps.
- New lines slide in from top.

### EventPanel
- Event card: severity color, title, description, countdown to `expires_at`,
  one button per `choice` (disabled if `requires` unmet).

### QuickActions
- Big friendly buttons: **Build**, **Collect Offline**, **Train Guard**,
  **Market**. Icon over label.

---

## 4. Visual style

### Color palette (cozy kingdom)
| token | hex | use |
|-------|-----|-----|
| parchment / bg | `#F5ECD8` | app background |
| surface | `#FFFDF6` | cards |
| primary (gold) | `#D9A441` | CTAs, level, active |
| primary dark | `#B9842B` | hover |
| food / leaf | `#6FAE5E` | food, success, energy |
| wood / oak | `#B07a4b` | wood resource |
| stone / slate | `#8B95A5` | stone resource |
| info blue | `#5B8DD9` | tasks, info |
| threat / danger | `#D9534F` | threat, danger events |
| happiness | `#E8B84B` | happiness/sun |
| ink (text) | `#3B3026` | primary text |
| muted | `#857a6b` | secondary text |
| border | `#E7DCC2` | card borders/dividers |

Resource colors: **gold** `#D9A441`, **food** `#6FAE5E`, **wood** `#B07a4b`,
**stone** `#8B95A5`.

### Typography
- UI font: the project's existing **Noto Sans Thai / Prompt** stack (loaded via
  `--font-prompt`) — round, friendly, supports TH+EN.
- **Numbers** (resource counters, levels) use a slightly heavier weight /
  tabular alignment so changing digits don't jiggle (`font-variant-numeric:
  tabular-nums`).
- Headings 600–800; body 400–500; tiny caption for rates/timestamps.

### Iconography
- Emoji / pixel glyphs as MVP icons (🪙 🌾 🪵 🪨 🏠 🌱 ⚒️ 🛡️ 🏰 🏹 👷 🧑‍🌾).
  Easy to swap for a pixel sprite sheet later without layout change.

### Shape & elevation
- Radius `14–16px` cards, `999px` chips. Soft shadow `0 4px 16px rgba(0,0,0,.06)`.
  Pixel accent borders allowed on building tiles.

---

## 5. Component list

```
GameLayout        # responsive shell: resource bar + sidebar/bottom-nav + slots
ResourceBar       # top resource chips
KingdomHeader     # name, level, XP, stat badges
VillageGrid       # grid container of buildings + empty plots
BuildingCard      # one building
CitizenPanel      # roster container + bulk assign
CitizenCard       # one citizen
TaskQueue         # active tasks
ActivityLog       # event/production feed
EventPanel        # active events + choices
QuickActions      # primary action buttons
StatCard          # one kingdom stat (happiness/defense/threat/citizens)
ProgressBar       # reusable labeled progress/fill bar
AnimatedNumber    # count-up number with tabular-nums
FloatingNumber    # transient +N that rises & fades
StatusBadge / Chip helpers
```

---

## 6. State handling plan

- **Single Zustand store** `useKingdomStore` (matches existing project pattern):
  holds `kingdom`, `resources`, `citizens`, `buildings`, `tasks`, `logs`,
  `events`, `policies`, plus UI `screen`/`tab` and `apiLoading`/`apiError`.
- **Service layer** `src/services/kingdom.service.ts` returns typed data; for MVP
  it resolves from `src/data/mock.ts` (and is structured so each method maps 1:1
  to an api-spec endpoint).
- **Navigation**: store-based `screen` + `kingdom:navigate` custom event synced to
  the URL in `GameLayout` (mirrors the original AppShell pattern). Sections:
  `village | citizens | buildings | events | policies`.
- **Tick loop**: a `useGameTick` hook ticks every ~3s, advancing resource
  `amount` by `rate_per_min` for smooth counters and emitting occasional log
  lines + floating numbers. In production this is replaced by `GET /game/tick`.
- **Derived, not stored**: affordability, progress %, totals — computed in
  selectors/components from store data, never persisted.
- **Actions** (`assignCitizen`, `upgradeBuilding`, `resolveEvent`, …) call the
  service, then patch the store optimistically and reconcile with the response.

---

## 7. Animation ideas

- **Count-up** on resource numbers when they change (ease-out, ~400ms).
- **Floating `+N`** above resource chips / building cards on production.
- **Progress bars** animate width transitions; task bars tick down live.
- **Card hover lift** on building/quick-action cards.
- **New log line** slides + fades in at the top of the feed.
- **Event arrival** gentle shake / glow on the Events badge.
- **Upgrade complete** brief sparkle + level-badge pop.
- All motion respects `prefers-reduced-motion` (reuse existing media guard).
