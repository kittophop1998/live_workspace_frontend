# Kingdom Manager — API Specification (v1)

Backend: **Go** (future). This document is the **contract** the frontend is built
against. The frontend currently runs on **mock data** that mirrors every shape
below, so swapping mocks for the real API is a drop-in change.

---

## 1. Conventions

### Base path
```
/api/v1
```
Configured via `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`).

### Authentication (assumption)
- MVP is **single-player, single-kingdom**. A player owns exactly one kingdom.
- Auth is **Bearer JWT**, optional for local dev. When present:
  ```
  Authorization: Bearer <access_token>
  ```
- Every gameplay endpoint resolves the kingdom from the token. For local/mock
  mode a fixed `kingdomId = "kgd_demo"` is assumed.

### Server-authoritative time
- The **backend owns all resource math**. The client never computes final
  resource totals.
- Production is integrated from `last_updated_at` → `server_time` on every read
  ("lazy tick"). The client only *displays* `rate_per_min` to animate counters
  between polls; the next authoritative read corrects any drift.
- All timestamps are ISO‑8601 UTC (`2026-06-29T08:00:00Z`).

### Common response envelope
Every response uses the same envelope (frontend `unwrap()` returns `data`):
```json
{
  "success": true,
  "message": "OK",
  "data": { }
}
```

### Error format
```json
{
  "success": false,
  "message": "Not enough resources to upgrade",
  "data": null,
  "error": {
    "code": "INSUFFICIENT_RESOURCES",
    "details": { "required": { "wood": 120 }, "available": { "wood": 80 } }
  }
}
```
HTTP status mirrors the class of error (400/401/403/404/409/422/500).

| code | meaning |
|------|---------|
| `INSUFFICIENT_RESOURCES` | not enough gold/food/wood/stone |
| `CAPACITY_EXCEEDED` | citizen limit or building worker slots full |
| `INVALID_ASSIGNMENT` | citizen/job/building mismatch |
| `BUILDING_BUSY` | already upgrading/under construction |
| `EVENT_EXPIRED` | event resolution arrived too late |
| `NOT_FOUND` | unknown id |
| `VALIDATION_ERROR` | malformed body |

### Pagination
List endpoints accept `?page=1&limit=20` and return `data.items` + `data.page_info`.

### Future WebSocket (not required for MVP)
- Channel: `GET /api/v1/stream` (upgrade) pushing `tick`, `event`, `log`,
  `task_complete` messages with the **same payload shapes** as the REST models.
- MVP uses polling: `GET /game/tick` every ~5s + targeted refetch after actions.

---

## 2. Data Models

### Resource
```json
{
  "type": "gold",            // gold | food | wood | stone
  "amount": 1240.5,          // current (server-calculated)
  "capacity": 5000,          // storage cap; null = uncapped
  "rate_per_min": 36.0,      // net production per minute (can be negative)
  "icon": "coin"
}
```

### KingdomStats
```json
{
  "happiness": 78,           // 0..100
  "defense": 42,             // abstract points
  "threat_level": 23,        // 0..100, drives event probability
  "citizen_count": 12,
  "citizen_limit": 16
}
```

### Kingdom (overview)
```json
{
  "id": "kgd_demo",
  "name": "Rivervale",
  "level": 4,
  "xp": 320,
  "xp_to_next": 500,
  "stats": { "...": "KingdomStats" },
  "resources": [ "...Resource" ],
  "last_updated_at": "2026-06-29T07:59:55Z",
  "server_time": "2026-06-29T08:00:00Z"
}
```

### Citizen
```json
{
  "id": "ctz_001",
  "name": "Bram",
  "avatar": "peasant_m_01",
  "job": "farmer",           // farmer|lumberjack|miner|guard|builder|idle
  "level": 2,
  "energy": 64,              // 0..100, drops while working, recovers while resting
  "happiness": 80,           // 0..100
  "status": "working",       // working|resting|idle|sick
  "assigned_building_id": "bld_farm_1",
  "output_per_min": 6.0      // this citizen's contribution at current job
}
```

### Building
```json
{
  "id": "bld_farm_1",
  "type": "farm",            // see Building Types
  "name": "Riverside Farm",
  "level": 2,
  "max_level": 10,
  "workers": 3,
  "max_workers": 4,
  "produces": "food",        // resource type or null (e.g. house/town_center)
  "production_per_min": 18.0,
  "status": "producing",     // idle|producing|upgrading|constructing
  "grid": { "row": 1, "col": 2 },
  "icon": "farm",
  "effects": { "food_capacity": 0, "citizen_limit": 0, "defense": 0 },
  "upgrade": {
    "next_level": 3,
    "cost": { "gold": 200, "wood": 120, "stone": 40 },
    "duration_sec": 90,
    "delta": { "production_per_min": 8, "max_workers": 1 }
  }
}
```

**Building Types & roles**
| type | role |
|------|------|
| `town_center` | kingdom level, governs upgrades, base citizen limit |
| `house` | +citizen_limit |
| `farm` | produces food |
| `lumber_camp` | produces wood |
| `quarry` | produces stone |
| `barracks` | houses guards, +defense, trains units |
| `market` | converts/sells resources → gold, +gold rate |
| `watch_tower` | +defense, lowers threat impact, early warning |

### Task (queue item)
```json
{
  "id": "tsk_01",
  "type": "upgrade",         // build|upgrade|train|repair
  "label": "Upgrade Riverside Farm → Lv.3",
  "target_building_id": "bld_farm_1",
  "started_at": "2026-06-29T07:59:00Z",
  "ends_at": "2026-06-29T08:00:30Z",
  "duration_sec": 90,
  "progress": 0.66,          // 0..1, server-computed snapshot
  "remaining_sec": 30,
  "status": "in_progress"    // queued|in_progress|done|cancelled
}
```

### ActivityLog
```json
{
  "id": "log_8842",
  "at": "2026-06-29T07:58:10Z",
  "type": "production",      // production|build|event|combat|system|trade
  "icon": "wheat",
  "message": "Riverside Farm produced +18 food",
  "delta": { "food": 18 }    // optional, drives floating +N numbers
}
```

### GameEvent
```json
{
  "id": "evt_551",
  "type": "bandit_attack",   // bandit_attack|drought|merchant|migration|festival|plague
  "severity": "warning",     // info|warning|danger
  "title": "Bandits on the road",
  "description": "A small band threatens the eastern fields.",
  "started_at": "2026-06-29T07:55:00Z",
  "expires_at": "2026-06-29T08:10:00Z",
  "auto_resolve": "lose_resources",   // applied if it expires unhandled
  "choices": [
    {
      "id": "fight",
      "label": "Send the guards",
      "requires": { "defense": 30 },
      "effects": [
        { "stat": "threat_level", "delta": -15 },
        { "resource": "gold", "delta": -50 }
      ]
    },
    {
      "id": "pay",
      "label": "Pay them off",
      "requires": { "gold": 120 },
      "effects": [ { "resource": "gold", "delta": -120 } ]
    }
  ]
}
```

### PolicyRule (rule-based "AI", NOT an LLM)
```json
{
  "id": "pol_01",
  "name": "Feed the people first",
  "enabled": true,
  "when": { "metric": "food", "op": "lt", "value": 100 },
  "then": { "action": "reassign", "job": "farmer", "count": 2 },
  "priority": 1,
  "description": "If food drops below 100, move 2 idle citizens to farming."
}
```
Allowed `metric`: any resource type, `happiness`, `threat_level`,
`citizen_count`. `op`: `lt|lte|gt|gte|eq`. `action`: `reassign|build|upgrade|
notify`. Evaluated server-side each tick — deterministic, no AI.

### OfflineProgress
```json
{
  "elapsed_sec": 7320,
  "capped_at_sec": 28800,    // offline accrual cap (e.g. 8h)
  "gains": { "gold": 120, "food": 240, "wood": 90, "stone": 30 },
  "events": [ "...GameEvent (queued while away)" ],
  "logs": [ "...ActivityLog (summarised)" ]
}
```

### TickState
```json
{
  "server_time": "2026-06-29T08:00:00Z",
  "last_updated_at": "2026-06-29T07:59:55Z",
  "next_tick_at": "2026-06-29T08:00:05Z",
  "tick_interval_sec": 5,
  "resources": [ "...Resource" ],
  "stats": { "...KingdomStats" },
  "active_tasks": 2,
  "pending_events": 1
}
```

---

## 3. Endpoints

> All paths are relative to `/api/v1`. All wrap responses in the §1 envelope.

### Kingdom & state
| method | path | purpose |
|--------|------|---------|
| GET | `/kingdom` | Kingdom overview (header, level, stats, resources) |
| GET | `/kingdom/resources` | Resources only (light poll) |
| GET | `/game/tick` | Authoritative tick snapshot (poll loop) |
| POST | `/game/collect-offline` | Claim idle/offline accrual |

### Citizens
| method | path | purpose |
|--------|------|---------|
| GET | `/citizens` | List citizens |
| POST | `/citizens/{id}/assign` | Assign one citizen to a job/building |
| POST | `/citizens/bulk-assign` | Reassign many at once |

### Buildings
| method | path | purpose |
|--------|------|---------|
| GET | `/buildings` | List buildings (village grid) |
| POST | `/buildings` | Build a new building |
| POST | `/buildings/{id}/upgrade` | Queue an upgrade |

### Tasks / Logs / Events
| method | path | purpose |
|--------|------|---------|
| GET | `/tasks` | Task queue |
| GET | `/logs?limit=50` | Activity logs |
| GET | `/events` | Current/active events |
| POST | `/events/{id}/resolve` | Resolve an event with a choice |

### Policies (rule-based automation)
| method | path | purpose |
|--------|------|---------|
| GET | `/policies` | Available + active policy rules |
| POST | `/policies` | Create a rule |
| PUT | `/policies/{id}` | Update / toggle a rule |
| DELETE | `/policies/{id}` | Delete a rule |

---

## 4. Examples

### GET `/kingdom`
```json
{
  "success": true, "message": "OK",
  "data": {
    "id": "kgd_demo", "name": "Rivervale", "level": 4,
    "xp": 320, "xp_to_next": 500,
    "stats": { "happiness": 78, "defense": 42, "threat_level": 23,
               "citizen_count": 12, "citizen_limit": 16 },
    "resources": [
      { "type": "gold", "amount": 1240, "capacity": 5000, "rate_per_min": 12, "icon": "coin" },
      { "type": "food", "amount": 860,  "capacity": 2000, "rate_per_min": 22, "icon": "wheat" },
      { "type": "wood", "amount": 540,  "capacity": 2000, "rate_per_min": 14, "icon": "log" },
      { "type": "stone","amount": 300,  "capacity": 1500, "rate_per_min": 8,  "icon": "rock" }
    ],
    "last_updated_at": "2026-06-29T07:59:55Z",
    "server_time": "2026-06-29T08:00:00Z"
  }
}
```

### POST `/citizens/{id}/assign`
Request:
```json
{ "job": "farmer", "building_id": "bld_farm_1" }
```
Response `data`: the updated `Citizen` + a `delta` summary:
```json
{
  "citizen": { "...Citizen": "..." },
  "resource_rate_delta": { "food": 6 }
}
```

### POST `/citizens/bulk-assign`
Request:
```json
{
  "assignments": [
    { "citizen_id": "ctz_003", "job": "miner", "building_id": "bld_quarry_1" },
    { "citizen_id": "ctz_004", "job": "miner", "building_id": "bld_quarry_1" }
  ]
}
```
Response `data`: `{ "updated": 2, "citizens": [ "...Citizen" ], "stats": { "...KingdomStats" } }`

### POST `/buildings`
Request:
```json
{ "type": "house", "grid": { "row": 2, "col": 0 } }
```
Response `data`: `{ "building": { "...Building" }, "task": { "...Task" }, "resources": [ "...Resource" ] }`

### POST `/buildings/{id}/upgrade`
Request: `{}` (cost taken from the building's `upgrade.cost`).
Response `data`: `{ "task": { "...Task" }, "resources": [ "...Resource" ] }`
Errors: `INSUFFICIENT_RESOURCES`, `BUILDING_BUSY`, `CAPACITY_EXCEEDED`.

### GET `/tasks`
```json
{ "success": true, "message": "OK",
  "data": { "items": [ "...Task" ], "active": 2, "slots": 3 } }
```

### GET `/events`
```json
{ "success": true, "message": "OK", "data": { "items": [ "...GameEvent" ] } }
```

### POST `/events/{id}/resolve`
Request:
```json
{ "choice_id": "fight" }
```
Response `data`:
```json
{
  "resolved": true,
  "applied_effects": [
    { "stat": "threat_level", "delta": -15 },
    { "resource": "gold", "delta": -50 }
  ],
  "stats": { "...KingdomStats" },
  "resources": [ "...Resource" ],
  "log": { "...ActivityLog" }
}
```

### POST `/game/collect-offline`
Request: `{}`
Response `data`: an `OfflineProgress` object (§2).

### GET `/game/tick`
Response `data`: a `TickState` object (§2). Poll every `tick_interval_sec`.

### POST `/policies`
Request: a `PolicyRule` without `id`. Response `data`: the created `PolicyRule`.

---

## 5. Frontend rendering contract (what the UI needs)

| UI element | source field(s) |
|------------|-----------------|
| Resource bar amounts | `Resource.amount` |
| Resource per-minute badge | `Resource.rate_per_min` |
| Resource progress fill | `amount / capacity` |
| Floating `+N` numbers | `ActivityLog.delta` / assign `resource_rate_delta` |
| Kingdom level + XP bar | `Kingdom.level`, `xp`, `xp_to_next` |
| Happiness / Defense / Threat badges | `KingdomStats` |
| Building card | full `Building` (level, workers, production, upgrade) |
| Upgrade button enabled? | compare `Resource.amount` vs `upgrade.cost` |
| Citizen card | `Citizen` (job, energy, happiness, status) |
| Task queue rows | `Task.progress`, `remaining_sec` |
| Event panel | `GameEvent` + `choices` |
| Quick actions availability | derived from resources + capacity |

The client treats every list endpoint as the **single source of truth** and never
persists derived totals; between polls it interpolates counters from
`rate_per_min` only for smooth UI, never for game decisions.
