"use client";

// Recursive schema-tree model + store for the redesigned Visual Builder.
//
// The backend Resource model (api-spec.md §2) stores a FLAT list of fields and
// has no slot for nested children, array-item schemas, nullable, example, enum,
// validation, or default. To support unlimited nesting + rich per-field metadata
// the Visual Builder edits a recursive `SchemaNode` tree that is the source of
// truth, persisted entirely client-side in localStorage — mirroring the existing
// per-status response-schema pattern (src/lib/responseSchemas.ts). Trees are
// keyed by an opaque "scope" string so one store serves the request body and
// every response status. Seed comes from the backend fields (schemaConvert.ts).

import { create } from "zustand";
import type { FieldChange, FieldState, JsonValue } from "@/lib/types";

export type NodeType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "uuid"
  | "timestamp"
  | "object"
  | "array"
  | "enum"
  | "null";

export const NODE_TYPES: NodeType[] = [
  "string",
  "number",
  "integer",
  "boolean",
  "uuid",
  "timestamp",
  "object",
  "array",
  "enum",
  "null",
];

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
}

export interface SchemaNode {
  id: string;
  key: string;
  type: NodeType;
  required: boolean;
  nullable?: boolean;
  description?: string;
  example?: JsonValue;
  default?: JsonValue;
  enumValues?: string[];
  validation?: ValidationRules;
  state: FieldState;
  change: FieldChange;
  children?: SchemaNode[]; // for type: "object"
  items?: SchemaNode; // for type: "array" — the element schema
}

export const isContainer = (t: NodeType): boolean => t === "object" || t === "array";

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `node_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function makeNode(partial: Partial<SchemaNode> = {}): SchemaNode {
  const node: SchemaNode = {
    id: newId(),
    key: partial.key ?? "field",
    type: partial.type ?? "string",
    required: partial.required ?? false,
    state: partial.state ?? "draft",
    change: partial.change ?? "added",
    ...partial,
  };
  if (node.type === "object" && !node.children) node.children = [];
  return node;
}

// Deep clone reassigning fresh ids throughout (for duplicate).
export function cloneWithNewIds(node: SchemaNode): SchemaNode {
  return {
    ...node,
    id: newId(),
    children: node.children?.map(cloneWithNewIds),
    items: node.items ? cloneWithNewIds(node.items) : undefined,
  };
}

// ---- pure tree transforms (operate on the root SchemaNode[]) --------------

export function findNode(nodes: SchemaNode[], id: string): SchemaNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const hit = findNode(n.children, id);
      if (hit) return hit;
    }
    if (n.items) {
      const hit = findNode([n.items], id);
      if (hit) return hit;
    }
  }
  return null;
}

function isDescendant(node: SchemaNode, id: string): boolean {
  if (node.id === id) return true;
  if (node.children?.some((c) => isDescendant(c, id))) return true;
  if (node.items && isDescendant(node.items, id)) return true;
  return false;
}

function patchNode(nodes: SchemaNode[], id: string, fn: (n: SchemaNode) => SchemaNode): SchemaNode[] {
  return nodes.map((n) => {
    if (n.id === id) return fn(n);
    let next = n;
    if (n.children) next = { ...next, children: patchNode(n.children, id, fn) };
    if (next.items) next = { ...next, items: patchNode([next.items], id, fn)[0] };
    return next;
  });
}

function deleteFrom(nodes: SchemaNode[], id: string): SchemaNode[] {
  const out: SchemaNode[] = [];
  for (const n of nodes) {
    if (n.id === id) continue;
    let next = n;
    if (n.children) next = { ...next, children: deleteFrom(n.children, id) };
    if (next.items) {
      if (next.items.id === id) {
        next = { ...next };
        delete next.items;
      } else {
        next = { ...next, items: deleteFrom([next.items], id)[0] };
      }
    }
    out.push(next);
  }
  return out;
}

function insertRelative(
  nodes: SchemaNode[],
  targetId: string,
  node: SchemaNode,
  pos: "before" | "after",
): SchemaNode[] {
  const idx = nodes.findIndex((n) => n.id === targetId);
  if (idx >= 0) {
    const copy = [...nodes];
    copy.splice(pos === "before" ? idx : idx + 1, 0, node);
    return copy;
  }
  return nodes.map((n) => {
    let next = n;
    if (n.children) next = { ...next, children: insertRelative(n.children, targetId, node, pos) };
    if (next.items && next.items.id !== targetId) {
      next = { ...next, items: insertRelative([next.items], targetId, node, pos)[0] };
    }
    return next;
  });
}

function insertInside(nodes: SchemaNode[], parentId: string, node: SchemaNode): SchemaNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, type: "object" as NodeType, children: [...(n.children ?? []), node] };
    }
    let next = n;
    if (n.children) next = { ...next, children: insertInside(n.children, parentId, node) };
    if (next.items) next = { ...next, items: insertInside([next.items], parentId, node)[0] };
    return next;
  });
}

// ---- store ----------------------------------------------------------------

const STORAGE_KEY = "live-workspace:schema-trees";

type Trees = Record<string, SchemaNode[]>;

function load(): Trees {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Trees) : {};
  } catch {
    return {};
  }
}

function persist(trees: Trees): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trees));
  } catch {
    /* quota / serialization — non-fatal for a local convenience cache */
  }
}

interface SchemaTreeState {
  trees: Trees;
  hydrated: boolean;
  hydrate: () => void;
  // Seed a scope from backend fields the first time it is opened (no overwrite).
  ensureSeed: (scope: string, seed: () => SchemaNode[]) => void;
  setNodes: (scope: string, nodes: SchemaNode[]) => void;
  addChild: (scope: string, parentId: string | null, partial?: Partial<SchemaNode>) => string;
  addArrayItem: (scope: string, arrayId: string) => string;
  updateNode: (scope: string, id: string, patch: Partial<SchemaNode>) => void;
  duplicateNode: (scope: string, id: string) => string | null;
  deleteNode: (scope: string, id: string) => void;
  moveNode: (scope: string, dragId: string, targetId: string, pos: "before" | "after" | "inside") => void;
}

const write =
  (set: (fn: (s: SchemaTreeState) => Partial<SchemaTreeState>) => void) =>
  (scope: string, transform: (nodes: SchemaNode[]) => SchemaNode[]) =>
    set((s) => {
      const trees = { ...s.trees, [scope]: transform(s.trees[scope] ?? []) };
      persist(trees);
      return { trees };
    });

export const useSchemaTreeStore = create<SchemaTreeState>((set, get) => {
  const mutate = write(set);
  return {
    trees: {},
    hydrated: false,

    // Merge persisted trees over current so any scope seeded before hydration
    // (child effects run before the parent's hydrate effect) is not clobbered.
    hydrate: () => set((s) => ({ trees: { ...s.trees, ...load() }, hydrated: true })),

    ensureSeed: (scope, seed) =>
      set((s) => {
        if (s.trees[scope]) return {};
        const trees = { ...s.trees, [scope]: seed() };
        persist(trees);
        return { trees };
      }),

    setNodes: (scope, nodes) => mutate(scope, () => nodes),

    addChild: (scope, parentId, partial) => {
      const node = makeNode(partial);
      mutate(scope, (nodes) =>
        parentId === null
          ? [...nodes, node]
          : patchNode(nodes, parentId, (p) => ({
              ...p,
              type: "object",
              children: [...(p.children ?? []), node],
            })),
      );
      return node.id;
    },

    addArrayItem: (scope, arrayId) => {
      const item = makeNode({ key: "items", type: "object" });
      mutate(scope, (nodes) =>
        patchNode(nodes, arrayId, (p) => ({ ...p, type: "array", items: p.items ?? item })),
      );
      const existing = findNode(get().trees[scope] ?? [], arrayId)?.items;
      return existing?.id ?? item.id;
    },

    updateNode: (scope, id, patch) =>
      mutate(scope, (nodes) =>
        patchNode(nodes, id, (n) => {
          const next: SchemaNode = { ...n, ...patch };
          // Keep container invariants when the type changes.
          if (patch.type) {
            if (patch.type === "object" && !next.children) next.children = [];
            if (patch.type !== "object") delete next.children;
            if (patch.type !== "array") delete next.items;
          }
          return next;
        }),
      ),

    duplicateNode: (scope, id) => {
      const node = findNode(get().trees[scope] ?? [], id);
      if (!node) return null;
      const clone = cloneWithNewIds({ ...node, key: `${node.key}_copy` });
      mutate(scope, (nodes) => insertRelative(nodes, id, clone, "after"));
      return clone.id;
    },

    deleteNode: (scope, id) => mutate(scope, (nodes) => deleteFrom(nodes, id)),

    moveNode: (scope, dragId, targetId, pos) => {
      if (dragId === targetId) return;
      const nodes = get().trees[scope] ?? [];
      const node = findNode(nodes, dragId);
      if (!node || isDescendant(node, targetId)) return; // never drop into own subtree
      mutate(scope, (current) => {
        const without = deleteFrom(current, dragId);
        return pos === "inside"
          ? insertInside(without, targetId, node)
          : insertRelative(without, targetId, node, pos);
      });
    },
  };
});
