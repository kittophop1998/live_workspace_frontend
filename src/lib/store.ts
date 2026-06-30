"use client";

import { create } from "zustand";
import { SEED_ACTIVITY, SEED_COLLABORATORS, SEED_COMMENTS, SEED_RESOURCES } from "@/data/mock";
import { broadcastDoc, persistDoc } from "@/lib/sync";
import type {
  ActivityEvent,
  Collaborator,
  Comment,
  ExportFormat,
  FieldState,
  Presence,
  Resource,
  ResourceKind,
  RightTab,
  SchemaField,
  WorkspaceDoc,
} from "@/lib/types";

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

const FIELD_STATE_CYCLE: FieldState[] = ["draft", "ready", "breaking"];

// Overall resource status is the worst state among its live fields.
function rollupState(fields: SchemaField[]): FieldState {
  const live = fields.filter((f) => f.change !== "removed");
  if (live.some((f) => f.state === "breaking")) return "breaking";
  if (live.some((f) => f.state === "draft")) return "draft";
  return "ready";
}

interface StoreState extends WorkspaceDoc {
  // UI / session (not part of the synced doc)
  selectedId: string;
  activeFieldId: string | null; // field anchored in the comments tab
  rightTab: RightTab;
  exportFormat: ExportFormat;
  kindFilter: ResourceKind | "all";

  // Identity & presence
  collaborators: Collaborator[];
  me: Collaborator | null;
  presences: Record<string, Presence>;

  // Hydration / sync internals
  hydrate: () => void;
  applyRemoteDoc: (doc: WorkspaceDoc) => void;
  upsertPresence: (p: Presence) => void;
  dropPresence: (clientId: string) => void;
  prunePresences: () => void;
  setMe: (c: Collaborator) => void;

  // UI actions
  select: (id: string) => void;
  focusComment: (fieldId: string | null) => void;
  setRightTab: (t: RightTab) => void;
  setExportFormat: (f: ExportFormat) => void;
  setKindFilter: (k: ResourceKind | "all") => void;

  // Schema mutations
  addField: (resourceId: string) => void;
  updateField: (resourceId: string, fieldId: string, patch: Partial<SchemaField>) => void;
  cycleFieldState: (resourceId: string, fieldId: string) => void;
  removeField: (resourceId: string, fieldId: string) => void;
  addResource: (kind: ResourceKind) => void;
  renameResource: (resourceId: string, name: string) => void;
  addComment: (resourceId: string, fieldId: string | undefined, body: string) => void;
}

export const useWorkspaceStore = create<StoreState>((set, get) => {
  // Commit a new document version: bump rev, persist, broadcast to other tabs.
  function commit(next: Partial<WorkspaceDoc>) {
    const s = get();
    const doc: WorkspaceDoc = {
      rev: s.rev + 1,
      resources: next.resources ?? s.resources,
      activity: next.activity ?? s.activity,
      comments: next.comments ?? s.comments,
    };
    set(doc);
    persistDoc(doc);
    broadcastDoc(doc);
  }

  function log(verb: string, target: string, resourceId: string): ActivityEvent {
    return { id: uid("a"), actor: get().me?.name ?? "Someone", verb, target, resourceId, at: now() };
  }

  // Apply a field-level change to one resource, refresh its rollup + audit fields.
  function withResource(resourceId: string, fn: (r: Resource) => Resource): Resource[] {
    const me = get().me?.name ?? "Someone";
    return get().resources.map((r) => {
      if (r.id !== resourceId) return r;
      const updated = fn(r);
      return { ...updated, state: rollupState(updated.fields), updatedAt: now(), updatedBy: me };
    });
  }

  return {
    rev: 0,
    resources: SEED_RESOURCES,
    activity: SEED_ACTIVITY,
    comments: SEED_COMMENTS,

    selectedId: SEED_RESOURCES[0].id,
    activeFieldId: null,
    rightTab: "activity",
    exportFormat: "typescript",
    kindFilter: "all",

    collaborators: SEED_COLLABORATORS,
    me: null,
    presences: {},

    hydrate: () => {
      // Pull the persisted doc (if a teammate already edited in another tab/session).
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem("live-workspace:doc");
        if (!raw) return;
        const doc = JSON.parse(raw) as WorkspaceDoc;
        if (doc.rev > get().rev) {
          set({ rev: doc.rev, resources: doc.resources, activity: doc.activity, comments: doc.comments });
        }
      } catch {
        /* ignore malformed storage */
      }
    },

    applyRemoteDoc: (doc) => {
      if (doc.rev <= get().rev) return; // stale or echo of our own write
      set({ rev: doc.rev, resources: doc.resources, activity: doc.activity, comments: doc.comments });
    },

    upsertPresence: (p) => set((s) => ({ presences: { ...s.presences, [p.clientId]: p } })),
    dropPresence: (clientId) =>
      set((s) => {
        const next = { ...s.presences };
        delete next[clientId];
        return { presences: next };
      }),
    prunePresences: () =>
      set((s) => {
        const cutoff = Date.now() - 8000;
        const next: Record<string, Presence> = {};
        for (const [id, p] of Object.entries(s.presences)) if (p.ts >= cutoff) next[id] = p;
        return { presences: next };
      }),
    setMe: (c) => set({ me: c }),

    select: (id) => set({ selectedId: id, activeFieldId: null }),
    focusComment: (fieldId) => set({ activeFieldId: fieldId, rightTab: "comments" }),
    setRightTab: (t) => set({ rightTab: t }),
    setExportFormat: (f) => set({ exportFormat: f }),
    setKindFilter: (k) => set({ kindFilter: k }),

    addField: (resourceId) => {
      const field: SchemaField = {
        id: uid("f"),
        key: "newField",
        type: "string",
        required: false,
        state: "draft",
        change: "added",
      };
      const resources = withResource(resourceId, (r) => ({ ...r, fields: [...r.fields, field] }));
      commit({ resources, activity: [log("added", field.key, resourceId), ...get().activity] });
    },

    updateField: (resourceId, fieldId, patch) => {
      const resources = withResource(resourceId, (r) => ({
        ...r,
        fields: r.fields.map((f) =>
          f.id === fieldId
            ? { ...f, ...patch, change: f.change === "added" ? "added" : "modified" }
            : f,
        ),
      }));
      const key = resources.find((r) => r.id === resourceId)?.fields.find((f) => f.id === fieldId)?.key ?? "field";
      commit({ resources, activity: [log("edited", key, resourceId), ...get().activity] });
    },

    cycleFieldState: (resourceId, fieldId) => {
      let nextState: FieldState = "draft";
      const resources = withResource(resourceId, (r) => ({
        ...r,
        fields: r.fields.map((f) => {
          if (f.id !== fieldId) return f;
          const i = FIELD_STATE_CYCLE.indexOf(f.state);
          nextState = FIELD_STATE_CYCLE[(i + 1) % FIELD_STATE_CYCLE.length];
          return { ...f, state: nextState };
        }),
      }));
      const key = resources.find((r) => r.id === resourceId)?.fields.find((f) => f.id === fieldId)?.key ?? "field";
      commit({ resources, activity: [log(`set ${nextState}`, key, resourceId), ...get().activity] });
    },

    removeField: (resourceId, fieldId) => {
      // Soft-delete: mark removed (a breaking diff) rather than dropping silently.
      let key = "field";
      const resources = withResource(resourceId, (r) => ({
        ...r,
        fields: r.fields.map((f) => {
          if (f.id !== fieldId) return f;
          key = f.key;
          // A never-shipped (added) field can be discarded outright.
          return f.change === "added" ? null : { ...f, change: "removed" as const, state: "breaking" as const };
        }).filter(Boolean) as SchemaField[],
      }));
      commit({ resources, activity: [log("removed", key, resourceId), ...get().activity] });
    },

    addResource: (kind) => {
      const label = kind === "endpoint" ? "newEndpoint" : kind === "database" ? "new_table" : "NewModel";
      const resource: Resource = {
        id: uid("r"),
        name: label,
        kind,
        ...(kind === "endpoint" ? { method: "GET", path: "/api/v1/new" } : {}),
        state: "draft",
        updatedAt: now(),
        updatedBy: get().me?.name ?? "Someone",
        fields: [{ id: uid("f"), key: "id", type: "uuid", required: true, state: "draft", change: "added" }],
      };
      commit({
        resources: [resource, ...get().resources],
        activity: [log("created", resource.name, resource.id), ...get().activity],
      });
      set({ selectedId: resource.id });
    },

    renameResource: (resourceId, name) => {
      const resources = withResource(resourceId, (r) => ({ ...r, name }));
      commit({ resources, activity: [log("renamed", name, resourceId), ...get().activity] });
    },

    addComment: (resourceId, fieldId, body) => {
      const me = get().me;
      const comment: Comment = {
        id: uid("c"),
        resourceId,
        fieldId,
        author: me?.name ?? "Someone",
        role: me?.role ?? "frontend",
        body,
        at: now(),
      };
      commit({
        comments: [...get().comments, comment],
        activity: [log("commented on", resourceId === get().selectedId ? selectedName(get) : "schema", resourceId), ...get().activity],
      });
    },
  };
});

function selectedName(get: () => StoreState): string {
  const s = get();
  return s.resources.find((r) => r.id === s.selectedId)?.name ?? "schema";
}

// Derived selectors
export const selectSelected = (s: StoreState): Resource | undefined =>
  s.resources.find((r) => r.id === s.selectedId);
