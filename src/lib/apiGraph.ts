"use client";

// API Graph — client-side store of RELATIONSHIPS between endpoints only.
// The endpoint (Resource) stays the single source of truth; the graph never
// duplicates endpoint data — it stores edges (from → to + a relation kind),
// per-node canvas positions, and which path-groups are collapsed. Like
// bookmarks / endpointStatus / schema trees this has no backend slot yet
// (api-spec.md §2), so it lives entirely in localStorage. Hydrated once in
// WorkspaceLayout.

import { create } from "zustand";

const STORAGE_KEY = "live-workspace:api-graph";

// The relationship vocabulary shown to users (per feature spec). Directed
// from `from` → `to`; each carries a legible pastel treatment for the canvas.
export type RelationKind =
  | "authentication"
  | "business-flow"
  | "data-dependency"
  | "trigger"
  | "related"
  | "deprecated";

export const RELATION_KINDS: RelationKind[] = [
  "authentication",
  "business-flow",
  "data-dependency",
  "trigger",
  "related",
  "deprecated",
];

export const RELATION_META: Record<
  RelationKind,
  { label: string; color: string; dashed?: boolean }
> = {
  authentication: { label: "Authentication", color: "#8B7CF6" },
  "business-flow": { label: "Business Flow", color: "#4A5DA8" },
  "data-dependency": { label: "Data Dependency", color: "#4E8A46" },
  trigger: { label: "Trigger", color: "#B0703A" },
  related: { label: "Related Endpoint", color: "#6D6D6D" },
  deprecated: { label: "Deprecated", color: "#B4524F", dashed: true },
};

export interface GraphEdge {
  id: string;
  from: string; // resource id
  to: string; // resource id
  kind: RelationKind;
  note?: string;
}

export type NodePosition = { x: number; y: number };

// Graph-scoped history — "John created a relationship", "Kate removed an edge".
// Distinct from the workspace activity feed (which is about schema edits); this
// only records graph mutations. `refs` are the resource ids involved so the
// inspector can show a per-endpoint slice.
export interface GraphActivity {
  id: string;
  actor: string;
  action: string; // human phrase, e.g. 'linked · Business Flow'
  detail: string; // e.g. 'POST /login → GET /me'
  refs: string[]; // resource ids involved
  at: string; // ISO
}

const ACTIVITY_CAP = 60;

interface Persisted {
  edges: GraphEdge[];
  positions: Record<string, NodePosition>;
  collapsedGroups: Record<string, true>;
  // Explicit feature-group membership overrides. Absent → group is derived from
  // the path (see endpointGroup). The graph owns membership per the brief.
  membership: Record<string, string>; // resourceId → groupId
  activity: GraphActivity[];
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `edge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function load(): Persisted {
  const empty: Persisted = { edges: [], positions: {}, collapsedGroups: {}, membership: {}, activity: [] };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      edges: parsed.edges ?? [],
      positions: parsed.positions ?? {},
      collapsedGroups: parsed.collapsedGroups ?? {},
      membership: parsed.membership ?? {},
      activity: parsed.activity ?? [],
    };
  } catch {
    return empty;
  }
}

function persist(state: Persisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / serialization — non-fatal for a local convenience cache */
  }
}

interface ApiGraphState extends Persisted {
  hydrate: () => void;
  // `actor` (optional) is stamped onto the activity log; pass the current user.
  addEdge: (from: string, to: string, kind: RelationKind, note?: string, actor?: string) => void;
  updateEdge: (id: string, patch: Partial<Pick<GraphEdge, "kind" | "note">>) => void;
  removeEdge: (id: string, actor?: string) => void;
  setPosition: (resourceId: string, pos: NodePosition) => void;
  // Bulk position commit — one persist for a whole Auto-Arrange pass.
  setPositions: (map: Record<string, NodePosition>) => void;
  setGroup: (resourceId: string, groupId: string, actor?: string) => void;
  toggleGroup: (group: string) => void;
}

function activityEntry(actor: string | undefined, action: string, detail: string, refs: string[]): GraphActivity {
  return { id: uid(), actor: actor?.trim() || "Someone", action, detail, refs, at: new Date().toISOString() };
}

export const useApiGraphStore = create<ApiGraphState>((set, get) => {
  // Persist the full snapshot from the current store state + a patch.
  const save = (patch: Partial<Persisted>): Partial<Persisted> => {
    const s = get();
    const next: Persisted = {
      edges: patch.edges ?? s.edges,
      positions: patch.positions ?? s.positions,
      collapsedGroups: patch.collapsedGroups ?? s.collapsedGroups,
      membership: patch.membership ?? s.membership,
      activity: patch.activity ?? s.activity,
    };
    persist(next);
    return patch;
  };

  return {
    edges: [],
    positions: {},
    collapsedGroups: {},
    membership: {},
    activity: [],

    hydrate: () => set(load()),

    addEdge: (from, to, kind, note, actor) =>
      set((s) => {
        if (from === to) return {};
        // Don't create a duplicate (same from/to/kind) — silently keep the first.
        if (s.edges.some((e) => e.from === from && e.to === to && e.kind === kind)) return {};
        const edges = [...s.edges, { id: uid(), from, to, kind, note }];
        const entry = activityEntry(actor, `linked · ${RELATION_META[kind].label}`, `${from} → ${to}`, [from, to]);
        const activity = [entry, ...s.activity].slice(0, ACTIVITY_CAP);
        return save({ edges, activity });
      }),

    updateEdge: (id, patch) =>
      set((s) => save({ edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

    removeEdge: (id, actor) =>
      set((s) => {
        const gone = s.edges.find((e) => e.id === id);
        const edges = s.edges.filter((e) => e.id !== id);
        if (!gone) return save({ edges });
        const entry = activityEntry(actor, "removed a relationship", `${gone.from} ⇢ ${gone.to}`, [gone.from, gone.to]);
        const activity = [entry, ...s.activity].slice(0, ACTIVITY_CAP);
        return save({ edges, activity });
      }),

    setPosition: (resourceId, pos) =>
      set((s) => save({ positions: { ...s.positions, [resourceId]: pos } })),

    setPositions: (map) =>
      set((s) => save({ positions: { ...s.positions, ...map } })),

    setGroup: (resourceId, groupId, actor) =>
      set((s) => {
        const membership = { ...s.membership, [resourceId]: groupId };
        const entry = activityEntry(actor, "moved endpoint", `${resourceId} → ${groupId}`, [resourceId]);
        const activity = [entry, ...s.activity].slice(0, ACTIVITY_CAP);
        return save({ membership, activity });
      }),

    toggleGroup: (group) =>
      set((s) => {
        const collapsedGroups = { ...s.collapsedGroups };
        if (collapsedGroups[group]) delete collapsedGroups[group];
        else collapsedGroups[group] = true;
        return save({ collapsedGroups });
      }),
  };
});

// ── Pure helpers (kept out of the store so components can memoize) ────────────

// Group key for an endpoint — the first meaningful path segment (skipping the
// common `api` / `v1` version prefixes and pure ids). Drives the graph's
// collapsible column layout. Non-endpoints / pathless resources → "ungrouped".
export function endpointGroup(path: string | undefined): string {
  if (!path) return "ungrouped";
  const segs = path.split("/").filter(Boolean);
  for (const seg of segs) {
    const s = seg.toLowerCase();
    if (s === "api" || /^v\d+$/.test(s)) continue;
    if (seg.startsWith(":") || seg.startsWith("{")) continue;
    return seg;
  }
  return segs[0] ?? "ungrouped";
}

// Every edge touching a resource (either direction), for the endpoint page's
// "Related Endpoints" panel and the graph inspector.
export function edgesForResource(edges: GraphEdge[], resourceId: string): GraphEdge[] {
  return edges.filter((e) => e.from === resourceId || e.to === resourceId);
}

// Resolve an endpoint's feature group: explicit membership override wins,
// otherwise fall back to the path-derived group. One primary group per endpoint.
export function groupIdFor(
  membership: Record<string, string>,
  resource: { id: string; path?: string },
): string {
  return membership[resource.id] ?? endpointGroup(resource.path);
}

// Human label for a group id (path segment) — "auth" → "Auth", "user-profile"
// → "User Profile". Kept dumb; teams can rename via membership to any id.
export function prettifyGroup(groupId: string): string {
  return groupId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || groupId;
}

// Stable palette for feature groups — same set the graph & rail share.
export const GROUP_COLORS = ["#8B7CF6", "#4A5DA8", "#4E8A46", "#B0703A", "#B4524F", "#3E8E9E", "#9A7418", "#C0568F"];

export function groupColor(groupId: string, orderedIds: string[]): string {
  const i = orderedIds.indexOf(groupId);
  return GROUP_COLORS[(i < 0 ? 0 : i) % GROUP_COLORS.length];
}

// Graph activity slice that involves a given resource.
export function activityForResource(activity: GraphActivity[], resourceId: string): GraphActivity[] {
  return activity.filter((a) => a.refs.includes(resourceId));
}
