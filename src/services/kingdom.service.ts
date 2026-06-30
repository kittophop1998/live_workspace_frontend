// API (snake_case) types — mirror api-spec.md §2 exactly. The service normalizes
// these into the camelCase frontend types in src/lib/types.ts. For MVP every
// method resolves from src/data/mock.ts behind the same async signatures the real
// Go backend will expose, so switching to live data is a one-file change.

import {
  type ActivityLog,
  type Building,
  type BuildingStatus,
  type BuildingType,
  type Citizen,
  type CitizenStatus,
  type GameEvent,
  type JobType,
  type Kingdom,
  type PolicyRule,
  type Resource,
  type ResourceType,
  type Task,
} from "@/lib/types";
import { mockDb } from "@/data/mock";

// ---- API wire types (snake_case) ----
export type ApiResource = { type: ResourceType; amount: number; capacity: number | null; rate_per_min: number; icon: string };
export type ApiStats = { happiness: number; defense: number; threat_level: number; citizen_count: number; citizen_limit: number };
export type ApiKingdom = {
  id: string;
  name: string;
  level: number;
  xp: number;
  xp_to_next: number;
  stats: ApiStats;
  resources: ApiResource[];
  last_updated_at: string;
  server_time: string;
};
export type ApiCitizen = {
  id: string;
  name: string;
  avatar: string;
  job: JobType;
  level: number;
  energy: number;
  happiness: number;
  status: CitizenStatus;
  assigned_building_id: string | null;
  output_per_min: number;
};
export type ApiBuilding = {
  id: string;
  type: BuildingType;
  name: string;
  level: number;
  max_level: number;
  workers: number;
  max_workers: number;
  produces: ResourceType | null;
  production_per_min: number;
  status: BuildingStatus;
  grid: { row: number; col: number };
  icon: string;
  upgrade: {
    next_level: number;
    cost: Partial<Record<ResourceType, number>>;
    duration_sec: number;
    delta: { production_per_min?: number; max_workers?: number; citizen_limit?: number; defense?: number };
  } | null;
};
export type ApiTask = {
  id: string;
  type: Task["type"];
  label: string;
  target_building_id: string | null;
  started_at: string;
  ends_at: string;
  duration_sec: number;
  progress: number;
  remaining_sec: number;
  status: Task["status"];
};
export type ApiLog = { id: string; at: string; type: ActivityLog["type"]; icon: string; message: string; delta?: Partial<Record<ResourceType, number>> };
export type ApiEvent = {
  id: string;
  type: GameEvent["type"];
  severity: GameEvent["severity"];
  title: string;
  description: string;
  started_at: string;
  expires_at: string;
  choices: GameEvent["choices"];
};
export type ApiPolicy = PolicyRule;

// ---- normalizers ----
const toResource = (r: ApiResource): Resource => ({ type: r.type, amount: r.amount, capacity: r.capacity, ratePerMin: r.rate_per_min, icon: r.icon });
const toKingdom = (k: ApiKingdom): Kingdom => ({
  id: k.id,
  name: k.name,
  level: k.level,
  xp: k.xp,
  xpToNext: k.xp_to_next,
  stats: {
    happiness: k.stats.happiness,
    defense: k.stats.defense,
    threatLevel: k.stats.threat_level,
    citizenCount: k.stats.citizen_count,
    citizenLimit: k.stats.citizen_limit,
  },
});
const toCitizen = (c: ApiCitizen): Citizen => ({
  id: c.id,
  name: c.name,
  avatar: c.avatar,
  job: c.job,
  level: c.level,
  energy: c.energy,
  happiness: c.happiness,
  status: c.status,
  assignedBuildingId: c.assigned_building_id,
  outputPerMin: c.output_per_min,
});
const toBuilding = (b: ApiBuilding): Building => ({
  id: b.id,
  type: b.type,
  name: b.name,
  level: b.level,
  maxLevel: b.max_level,
  workers: b.workers,
  maxWorkers: b.max_workers,
  produces: b.produces,
  productionPerMin: b.production_per_min,
  status: b.status,
  grid: b.grid,
  icon: b.icon,
  upgrade: b.upgrade
    ? {
        nextLevel: b.upgrade.next_level,
        cost: b.upgrade.cost,
        durationSec: b.upgrade.duration_sec,
        delta: {
          productionPerMin: b.upgrade.delta.production_per_min,
          maxWorkers: b.upgrade.delta.max_workers,
          citizenLimit: b.upgrade.delta.citizen_limit,
          defense: b.upgrade.delta.defense,
        },
      }
    : null,
});
const toTask = (t: ApiTask): Task => ({
  id: t.id,
  type: t.type,
  label: t.label,
  targetBuildingId: t.target_building_id,
  startedAt: t.started_at,
  endsAt: t.ends_at,
  durationSec: t.duration_sec,
  progress: t.progress,
  remainingSec: t.remaining_sec,
  status: t.status,
});
const toLog = (l: ApiLog): ActivityLog => ({ id: l.id, at: l.at, type: l.type, icon: l.icon, message: l.message, delta: l.delta });
const toEvent = (e: ApiEvent): GameEvent => ({
  id: e.id,
  type: e.type,
  severity: e.severity,
  title: e.title,
  description: e.description,
  startedAt: e.started_at,
  expiresAt: e.expires_at,
  choices: e.choices,
});

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

// In a live backend each of these would be `unwrap(apiClient.get(endpoints.x))`.
// See src/lib/api.ts for the endpoint map kept in sync with api-spec.md §3.
export const kingdomService = {
  async getKingdom(): Promise<{ kingdom: Kingdom; resources: Resource[] }> {
    await delay();
    return { kingdom: toKingdom(mockDb.kingdom), resources: mockDb.kingdom.resources.map(toResource) };
  },
  async getResources(): Promise<Resource[]> {
    await delay(60);
    return mockDb.kingdom.resources.map(toResource);
  },
  async getCitizens(): Promise<Citizen[]> {
    await delay();
    return mockDb.citizens.map(toCitizen);
  },
  async getBuildings(): Promise<Building[]> {
    await delay();
    return mockDb.buildings.map(toBuilding);
  },
  async getTasks(): Promise<Task[]> {
    await delay();
    return mockDb.tasks.map(toTask);
  },
  async getLogs(): Promise<ActivityLog[]> {
    await delay();
    return mockDb.logs.map(toLog);
  },
  async getEvents(): Promise<GameEvent[]> {
    await delay();
    return mockDb.events.map(toEvent);
  },
  async getPolicies(): Promise<PolicyRule[]> {
    await delay();
    return [...mockDb.policies];
  },
};
