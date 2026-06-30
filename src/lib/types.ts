// Frontend domain types (camelCase). These mirror the API models in api-spec.md;
// the service layer normalizes snake_case API payloads into these shapes so the
// rest of the app never touches the wire format.

export type ResourceType = "gold" | "food" | "wood" | "stone";

export type Resource = {
  type: ResourceType;
  amount: number;
  capacity: number | null;
  ratePerMin: number;
  icon: string;
};

export type JobType = "farmer" | "lumberjack" | "miner" | "guard" | "builder" | "idle";

export type CitizenStatus = "working" | "resting" | "idle" | "sick";

export type Citizen = {
  id: string;
  name: string;
  avatar: string;
  job: JobType;
  level: number;
  energy: number; // 0..100
  happiness: number; // 0..100
  status: CitizenStatus;
  assignedBuildingId: string | null;
  outputPerMin: number;
};

export type BuildingType =
  | "town_center"
  | "house"
  | "farm"
  | "lumber_camp"
  | "quarry"
  | "barracks"
  | "market"
  | "watch_tower";

export type BuildingStatus = "idle" | "producing" | "upgrading" | "constructing";

export type UpgradePlan = {
  nextLevel: number;
  cost: Partial<Record<ResourceType, number>>;
  durationSec: number;
  delta: { productionPerMin?: number; maxWorkers?: number; citizenLimit?: number; defense?: number };
};

export type Building = {
  id: string;
  type: BuildingType;
  name: string;
  level: number;
  maxLevel: number;
  workers: number;
  maxWorkers: number;
  produces: ResourceType | null;
  productionPerMin: number;
  status: BuildingStatus;
  grid: { row: number; col: number };
  icon: string;
  upgrade: UpgradePlan | null;
};

export type TaskType = "build" | "upgrade" | "train" | "repair";
export type TaskStatus = "queued" | "in_progress" | "done" | "cancelled";

export type Task = {
  id: string;
  type: TaskType;
  label: string;
  targetBuildingId: string | null;
  startedAt: string;
  endsAt: string;
  durationSec: number;
  progress: number; // 0..1
  remainingSec: number;
  status: TaskStatus;
};

export type LogType = "production" | "build" | "event" | "combat" | "system" | "trade";

export type ActivityLog = {
  id: string;
  at: string;
  type: LogType;
  icon: string;
  message: string;
  delta?: Partial<Record<ResourceType, number>>;
};

export type EventSeverity = "info" | "warning" | "danger";
export type EventType = "bandit_attack" | "drought" | "merchant" | "migration" | "festival" | "plague";

export type EventEffect = {
  resource?: ResourceType;
  stat?: "threat_level" | "happiness" | "defense";
  delta: number;
};

export type EventChoice = {
  id: string;
  label: string;
  requires?: Partial<Record<ResourceType | "defense", number>>;
  effects: EventEffect[];
};

export type GameEvent = {
  id: string;
  type: EventType;
  severity: EventSeverity;
  title: string;
  description: string;
  startedAt: string;
  expiresAt: string;
  choices: EventChoice[];
};

export type KingdomStats = {
  happiness: number;
  defense: number;
  threatLevel: number;
  citizenCount: number;
  citizenLimit: number;
};

export type Kingdom = {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  stats: KingdomStats;
};

export type PolicyRule = {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  when: { metric: string; op: "lt" | "lte" | "gt" | "gte" | "eq"; value: number };
  then: { action: "reassign" | "build" | "upgrade" | "notify"; job?: JobType; count?: number };
  priority: number;
};

export type OfflineProgress = {
  elapsedSec: number;
  gains: Partial<Record<ResourceType, number>>;
};

// Static metadata used by the UI for labels/icons/colors.
export const JOB_META: Record<JobType, { label: string; icon: string; produces: ResourceType | null }> = {
  farmer: { label: "Farmer", icon: "🧑‍🌾", produces: "food" },
  lumberjack: { label: "Lumberjack", icon: "🪓", produces: "wood" },
  miner: { label: "Miner", icon: "⛏️", produces: "stone" },
  guard: { label: "Guard", icon: "🛡️", produces: null },
  builder: { label: "Builder", icon: "🔨", produces: null },
  idle: { label: "Idle", icon: "💤", produces: null },
};

export const RESOURCE_META: Record<ResourceType, { label: string; icon: string; color: string }> = {
  gold: { label: "Gold", icon: "🪙", color: "#D9A441" },
  food: { label: "Food", icon: "🌾", color: "#6FAE5E" },
  wood: { label: "Wood", icon: "🪵", color: "#B07A4B" },
  stone: { label: "Stone", icon: "🪨", color: "#8B95A5" },
};

export const BUILDING_META: Record<BuildingType, { label: string; icon: string }> = {
  town_center: { label: "Town Center", icon: "🏰" },
  house: { label: "House", icon: "🏠" },
  farm: { label: "Farm", icon: "🌱" },
  lumber_camp: { label: "Lumber Camp", icon: "🪵" },
  quarry: { label: "Quarry", icon: "⛰️" },
  barracks: { label: "Barracks", icon: "⚔️" },
  market: { label: "Market", icon: "🏪" },
  watch_tower: { label: "Watch Tower", icon: "🗼" },
};
