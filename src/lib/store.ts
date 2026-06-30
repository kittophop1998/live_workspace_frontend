"use client";

import { create } from "zustand";
import { screenPaths, tabForScreen, tabScreens } from "@/lib/routes";
import { kingdomService } from "@/services/kingdom.service";
import {
  type ActivityLog,
  type Building,
  type Citizen,
  type GameEvent,
  type JobType,
  type Kingdom,
  type PolicyRule,
  type Resource,
  type ResourceType,
  type Task,
} from "@/lib/types";

export type Tab = "village" | "citizens" | "buildings" | "events" | "policies";
export type Screen = Tab;

// --- navigation ---
function pushScreen(screen: Screen) {
  if (typeof window === "undefined") return;
  const path = screenPaths[screen];
  if (path && window.location.pathname !== path) {
    window.dispatchEvent(new CustomEvent("kingdom:navigate", { detail: { path } }));
  }
}

// --- mock game-logic helpers (the live backend owns this math; we approximate it
// client-side so the dashboard feels alive on mock data). ---
const JOB_RESOURCE: Partial<Record<JobType, ResourceType>> = { farmer: "food", lumberjack: "wood", miner: "stone" };
const JOB_BUILDING: Partial<Record<JobType, Building["type"]>> = {
  farmer: "farm",
  lumberjack: "lumber_camp",
  miner: "quarry",
  guard: "barracks",
};

const citizenOutput = (job: JobType, level: number): number => (JOB_RESOURCE[job] ? 3 + level * 2 : 0);

function recomputeRates(resources: Resource[], citizens: Citizen[], buildings: Building[]): Resource[] {
  const sums: Record<ResourceType, number> = { gold: 0, food: 0, wood: 0, stone: 0 };
  for (const c of citizens) {
    const res = JOB_RESOURCE[c.job];
    if (res && c.status === "working") sums[res] += c.outputPerMin;
  }
  // Gold is driven by the market building, not citizen jobs.
  const market = buildings.find((b) => b.type === "market" && b.status !== "upgrading");
  sums.gold = market ? market.productionPerMin : 0;
  return resources.map((r) => ({ ...r, ratePerMin: Math.round(sums[r.type]) }));
}

function recomputeWorkers(buildings: Building[], citizens: Citizen[]): Building[] {
  return buildings.map((b) => ({ ...b, workers: citizens.filter((c) => c.assignedBuildingId === b.id && c.status === "working").length }));
}

function logEntry(type: ActivityLog["type"], icon: string, message: string, delta?: ActivityLog["delta"]): ActivityLog {
  return { id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), type, icon, message, delta };
}

function canAfford(resources: Resource[], cost: Partial<Record<ResourceType, number>>): boolean {
  return (Object.entries(cost) as [ResourceType, number][]).every(([k, v]) => (resources.find((r) => r.type === k)?.amount ?? 0) >= v);
}

function spend(resources: Resource[], cost: Partial<Record<ResourceType, number>>): Resource[] {
  return resources.map((r) => ({ ...r, amount: r.amount - (cost[r.type] ?? 0) }));
}

type KingdomState = {
  ready: boolean;
  apiLoading: boolean;
  apiError: string;
  tab: Tab;
  screen: Screen;
  kingdom: Kingdom | null;
  resources: Resource[];
  citizens: Citizen[];
  buildings: Building[];
  tasks: Task[];
  logs: ActivityLog[];
  events: GameEvent[];
  policies: PolicyRule[];
  _gainAccum: Partial<Record<ResourceType, number>>;
  _tickCount: number;

  setTab: (tab: Tab) => void;
  go: (screen: Screen) => void;
  loadGame: () => Promise<void>;
  tick: (dtSec: number) => void;
  assignCitizen: (citizenId: string, job: JobType) => void;
  bulkAssignIdle: (job: JobType, count: number) => void;
  upgradeBuilding: (buildingId: string) => void;
  resolveEvent: (eventId: string, choiceId: string) => void;
  collectOffline: () => void;
  togglePolicy: (policyId: string) => void;
};

export const useKingdomStore = create<KingdomState>((set, get) => ({
  ready: false,
  apiLoading: false,
  apiError: "",
  tab: "village",
  screen: "village",
  kingdom: null,
  resources: [],
  citizens: [],
  buildings: [],
  tasks: [],
  logs: [],
  events: [],
  policies: [],
  _gainAccum: {},
  _tickCount: 0,

  setTab: (tab) => {
    const screen = tabScreens[tab];
    pushScreen(screen);
    set({ tab, screen });
  },
  go: (screen) => {
    pushScreen(screen);
    set({ screen, tab: tabForScreen(screen), apiError: "" });
  },

  loadGame: async () => {
    if (get().ready || get().apiLoading) return;
    set({ apiLoading: true, apiError: "" });
    try {
      const [{ kingdom, resources }, citizens, buildings, tasks, logs, events, policies] = await Promise.all([
        kingdomService.getKingdom(),
        kingdomService.getCitizens(),
        kingdomService.getBuildings(),
        kingdomService.getTasks(),
        kingdomService.getLogs(),
        kingdomService.getEvents(),
        kingdomService.getPolicies(),
      ]);
      set({ kingdom, resources, citizens, buildings, tasks, logs, events, policies, ready: true, apiLoading: false });
    } catch {
      set({ apiError: "ไม่สามารถโหลดข้อมูลอาณาจักรได้", apiLoading: false });
    }
  },

  // Local production tick (replaced by GET /game/tick against the backend).
  tick: (dtSec) => {
    const s = get();
    if (!s.ready) return;
    const factor = dtSec / 60;
    const accum = { ...s._gainAccum };
    const resources = s.resources.map((r) => {
      if (r.ratePerMin <= 0) return r;
      const gain = r.ratePerMin * factor;
      const next = r.capacity != null ? Math.min(r.capacity, r.amount + gain) : r.amount + gain;
      accum[r.type] = (accum[r.type] ?? 0) + (next - r.amount);
      return { ...r, amount: next };
    });

    // advance tasks, complete finished ones
    let buildings = s.buildings;
    let logs = s.logs;
    let kingdom = s.kingdom;
    const remainingTasks: Task[] = [];
    for (const t of s.tasks) {
      const remaining = Math.max(0, t.remainingSec - dtSec);
      const progress = t.durationSec > 0 ? Math.min(1, 1 - remaining / t.durationSec) : 1;
      if (remaining <= 0 && t.status === "in_progress") {
        if (t.type === "upgrade" && t.targetBuildingId) {
          buildings = buildings.map((b) => {
            if (b.id !== t.targetBuildingId || !b.upgrade) return b;
            const up = b.upgrade;
            return {
              ...b,
              level: up.nextLevel,
              productionPerMin: b.productionPerMin + (up.delta.productionPerMin ?? 0),
              maxWorkers: b.maxWorkers + (up.delta.maxWorkers ?? 0),
              status: b.produces ? "producing" : "idle",
              upgrade: b.level + 1 < b.maxLevel ? { ...up, nextLevel: up.nextLevel + 1, cost: scaleCost(up.cost), durationSec: Math.round(up.durationSec * 1.25) } : null,
            };
          });
          const b = buildings.find((x) => x.id === t.targetBuildingId);
          logs = [logEntry("build", "✅", `${b?.name ?? "Building"} upgraded to Lv.${b?.level ?? ""}`), ...logs];
        } else if (t.type === "train" && kingdom) {
          kingdom = { ...kingdom, stats: { ...kingdom.stats, defense: kingdom.stats.defense + 5 } };
          logs = [logEntry("combat", "🛡️", "A new guard finished training (+5 defense)"), ...logs];
        }
      } else {
        remainingTasks.push({ ...t, remainingSec: remaining, progress });
      }
    }

    // periodic floating-number + production log (~ every 4 ticks)
    let tickCount = s._tickCount + 1;
    let gainAccum = accum;
    if (tickCount >= 4) {
      const rounded = Object.fromEntries(
        (Object.entries(accum) as [ResourceType, number][]).map(([k, v]) => [k, Math.round(v)]).filter(([, v]) => (v as number) > 0),
      ) as Partial<Record<ResourceType, number>>;
      if (Object.keys(rounded).length && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kingdom:gain", { detail: rounded }));
      }
      tickCount = 0;
      gainAccum = {};
    }

    set({ resources, tasks: remainingTasks, buildings, logs, kingdom, _gainAccum: gainAccum, _tickCount: tickCount });
  },

  assignCitizen: (citizenId, job) => {
    const s = get();
    const buildingId = JOB_BUILDING[job] ? s.buildings.find((b) => b.type === JOB_BUILDING[job])?.id ?? null : null;
    const citizens = s.citizens.map((c) =>
      c.id === citizenId
        ? { ...c, job, status: (job === "idle" ? "idle" : "working") as Citizen["status"], assignedBuildingId: buildingId, outputPerMin: citizenOutput(job, c.level) }
        : c,
    );
    const buildings = recomputeWorkers(s.buildings, citizens);
    const resources = recomputeRates(s.resources, citizens, buildings);
    const c = citizens.find((x) => x.id === citizenId);
    const logs = [logEntry("system", "👷", `${c?.name ?? "Citizen"} reassigned to ${job}`), ...s.logs];
    set({ citizens, buildings, resources, logs });
  },

  bulkAssignIdle: (job, count) => {
    const s = get();
    const idle = s.citizens.filter((c) => c.status === "idle").slice(0, count);
    if (!idle.length) return;
    const ids = new Set(idle.map((c) => c.id));
    const buildingId = JOB_BUILDING[job] ? s.buildings.find((b) => b.type === JOB_BUILDING[job])?.id ?? null : null;
    const citizens = s.citizens.map((c) =>
      ids.has(c.id) ? { ...c, job, status: "working" as Citizen["status"], assignedBuildingId: buildingId, outputPerMin: citizenOutput(job, c.level) } : c,
    );
    const buildings = recomputeWorkers(s.buildings, citizens);
    const resources = recomputeRates(s.resources, citizens, buildings);
    const logs = [logEntry("system", "👥", `Sent ${idle.length} idle citizen(s) to ${job}`), ...s.logs];
    set({ citizens, buildings, resources, logs });
  },

  upgradeBuilding: (buildingId) => {
    const s = get();
    const b = s.buildings.find((x) => x.id === buildingId);
    if (!b || !b.upgrade) return;
    if (b.status === "upgrading" || b.status === "constructing") {
      set({ apiError: "อาคารนี้กำลังอัปเกรดอยู่" });
      return;
    }
    if (!canAfford(s.resources, b.upgrade.cost)) {
      set({ apiError: "ทรัพยากรไม่พอสำหรับอัปเกรด" });
      return;
    }
    const resources = spend(s.resources, b.upgrade.cost);
    const buildings = s.buildings.map((x) => (x.id === buildingId ? { ...x, status: "upgrading" as Building["status"] } : x));
    const startedAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + b.upgrade.durationSec * 1000).toISOString();
    const task: Task = {
      id: `tsk_${Date.now()}`,
      type: "upgrade",
      label: `Upgrade ${b.name} → Lv.${b.upgrade.nextLevel}`,
      targetBuildingId: b.id,
      startedAt,
      endsAt,
      durationSec: b.upgrade.durationSec,
      progress: 0,
      remainingSec: b.upgrade.durationSec,
      status: "in_progress",
    };
    const logs = [logEntry("build", "🔨", `Started upgrade: ${b.name} → Lv.${b.upgrade.nextLevel}`), ...s.logs];
    set({ resources, buildings, tasks: [...s.tasks, task], logs, apiError: "" });
  },

  resolveEvent: (eventId, choiceId) => {
    const s = get();
    const evt = s.events.find((e) => e.id === eventId);
    const choice = evt?.choices.find((c) => c.id === choiceId);
    if (!evt || !choice || !s.kingdom) return;
    let resources = s.resources;
    const stats = { ...s.kingdom.stats };
    for (const eff of choice.effects) {
      if (eff.resource) resources = resources.map((r) => (r.type === eff.resource ? { ...r, amount: Math.max(0, r.amount + eff.delta) } : r));
      if (eff.stat === "threat_level") stats.threatLevel = Math.max(0, Math.min(100, stats.threatLevel + eff.delta));
      if (eff.stat === "happiness") stats.happiness = Math.max(0, Math.min(100, stats.happiness + eff.delta));
      if (eff.stat === "defense") stats.defense = Math.max(0, stats.defense + eff.delta);
    }
    const events = s.events.filter((e) => e.id !== eventId);
    const logs = [logEntry("event", "📜", `Resolved "${evt.title}" — ${choice.label}`), ...s.logs];
    set({ resources, kingdom: { ...s.kingdom, stats }, events, logs });
  },

  collectOffline: () => {
    const s = get();
    const elapsedSec = 180; // mock: pretend ~3 minutes elapsed while away
    const gains: Partial<Record<ResourceType, number>> = {};
    const resources = s.resources.map((r) => {
      const gain = Math.round((r.ratePerMin * elapsedSec) / 60);
      if (gain > 0) gains[r.type] = gain;
      const next = r.capacity != null ? Math.min(r.capacity, r.amount + gain) : r.amount + gain;
      return { ...r, amount: next };
    });
    const summary = (Object.entries(gains) as [ResourceType, number][]).map(([k, v]) => `+${v} ${k}`).join(", ") || "nothing new";
    const logs = [logEntry("production", "🌙", `Collected offline progress: ${summary}`, gains), ...s.logs];
    if (typeof window !== "undefined" && Object.keys(gains).length) window.dispatchEvent(new CustomEvent("kingdom:gain", { detail: gains }));
    set({ resources, logs });
  },

  togglePolicy: (policyId) => {
    set((s) => ({ policies: s.policies.map((p) => (p.id === policyId ? { ...p, enabled: !p.enabled } : p)) }));
  },
}));

function scaleCost(cost: Partial<Record<ResourceType, number>>): Partial<Record<ResourceType, number>> {
  return Object.fromEntries((Object.entries(cost) as [ResourceType, number][]).map(([k, v]) => [k, Math.round(v * 1.4)])) as Partial<
    Record<ResourceType, number>
  >;
}
