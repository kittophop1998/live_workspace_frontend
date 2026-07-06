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

interface Persisted {
  edges: GraphEdge[];
  positions: Record<string, NodePosition>;
  collapsedGroups: Record<string, true>;
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `edge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function load(): Persisted {
  const empty: Persisted = { edges: [], positions: {}, collapsedGroups: {} };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      edges: parsed.edges ?? [],
      positions: parsed.positions ?? {},
      collapsedGroups: parsed.collapsedGroups ?? {},
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
  addEdge: (from: string, to: string, kind: RelationKind, note?: string) => void;
  updateEdge: (id: string, patch: Partial<Pick<GraphEdge, "kind" | "note">>) => void;
  removeEdge: (id: string) => void;
  setPosition: (resourceId: string, pos: NodePosition) => void;
  toggleGroup: (group: string) => void;
}

export const useApiGraphStore = create<ApiGraphState>((set) => {
  return {
    edges: [],
    positions: {},
    collapsedGroups: {},

    hydrate: () => set(load()),

    addEdge: (from, to, kind, note) =>
      set((s) => {
        if (from === to) return {};
        // Don't create a duplicate (same from/to/kind) — silently keep the first.
        if (s.edges.some((e) => e.from === from && e.to === to && e.kind === kind)) return {};
        const edges = [...s.edges, { id: uid(), from, to, kind, note }];
        persist({ edges, positions: s.positions, collapsedGroups: s.collapsedGroups });
        return { edges };
      }),

    updateEdge: (id, patch) =>
      set((s) => {
        const edges = s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e));
        persist({ edges, positions: s.positions, collapsedGroups: s.collapsedGroups });
        return { edges };
      }),

    removeEdge: (id) =>
      set((s) => {
        const edges = s.edges.filter((e) => e.id !== id);
        persist({ edges, positions: s.positions, collapsedGroups: s.collapsedGroups });
        return { edges };
      }),

    setPosition: (resourceId, pos) =>
      set((s) => {
        const positions = { ...s.positions, [resourceId]: pos };
        persist({ edges: s.edges, positions, collapsedGroups: s.collapsedGroups });
        return { positions };
      }),

    toggleGroup: (group) =>
      set((s) => {
        const collapsedGroups = { ...s.collapsedGroups };
        if (collapsedGroups[group]) delete collapsedGroups[group];
        else collapsedGroups[group] = true;
        persist({ edges: s.edges, positions: s.positions, collapsedGroups });
        return { collapsedGroups };
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
