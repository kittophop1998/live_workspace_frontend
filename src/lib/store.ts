"use client";

import { create } from "zustand";
import { apiErrorMessage, clearSession, setRoomCode, setToken } from "@/lib/api";
import { workspaceApi, type RoomSession } from "@/services/workspace.service";
import type {
  ActivityEvent,
  Collaborator,
  Comment,
  ExportFormat,
  FieldState,
  HttpMethod,
  Presence,
  Resource,
  ResourceKind,
  RightTab,
  SchemaField,
  WorkspaceSnapshot,
} from "@/lib/types";

const FIELD_STATE_CYCLE: FieldState[] = ["draft", "ready", "breaking"];
const ACTIVITY_CAP = 200;

interface StoreState {
  // Synced document (server-owned)
  rev: number;
  resources: Resource[];
  comments: Comment[];
  activity: ActivityEvent[];

  // UI / session
  selectedId: string;
  activeFieldId: string | null;
  rightTab: RightTab;
  exportFormat: ExportFormat;
  kindFilter: ResourceKind | "all";
  apiError: string | null;

  // Identity & presence
  collaborators: Collaborator[];
  me: Collaborator | null;
  presences: Record<string, Presence>;

  // Auth / room session
  authed: boolean;
  roomCode: string | null;

  // Hydration + real-time apply (called by useWorkspaceSync / realtime)
  applySnapshot: (snap: WorkspaceSnapshot) => void;
  setMe: (c: Collaborator) => void;
  applyRoomSession: (s: RoomSession) => void;
  restoreSession: (roomCode: string) => void;
  signOut: () => void;
  upsertResource: (rev: number, resource: Resource, fromWs?: boolean) => void;
  removeResource: (rev: number, resourceId: string, fromWs?: boolean) => void;
  upsertComment: (rev: number, comment: Comment, fromWs?: boolean) => void;
  removeComment: (rev: number, commentId: string, fromWs?: boolean) => void;
  pushActivity: (event: ActivityEvent) => void;
  upsertPresence: (p: Presence) => void;
  dropPresence: (clientId: string) => void;
  prunePresences: () => void;
  setApiError: (msg: string | null) => void;

  // UI actions
  select: (id: string) => void;
  focusComment: (fieldId: string | null) => void;
  setRightTab: (t: RightTab) => void;
  setExportFormat: (f: ExportFormat) => void;
  setKindFilter: (k: ResourceKind | "all") => void;

  // Schema mutations (call the backend; state updates from the response + WS)
  addField: (resourceId: string) => void;
  updateField: (resourceId: string, fieldId: string, patch: Partial<SchemaField>) => void;
  cycleFieldState: (resourceId: string, fieldId: string) => void;
  removeField: (resourceId: string, fieldId: string) => void;
  addResource: (kind: ResourceKind) => void;
  renameResource: (resourceId: string, name: string) => void;
  addComment: (resourceId: string, fieldId: string | undefined, body: string) => void;
}

// A non-colliding field key so POST /fields never 409s on a duplicate.
function freshFieldKey(resource: Resource | undefined): string {
  const existing = new Set((resource?.fields ?? []).map((f) => f.key));
  if (!existing.has("newField")) return "newField";
  let n = 2;
  while (existing.has(`newField${n}`)) n += 1;
  return `newField${n}`;
}

export const useWorkspaceStore = create<StoreState>((set, get) => {
  const fail = (err: unknown) => set({ apiError: apiErrorMessage(err) });

  return {
    rev: 0,
    resources: [],
    comments: [],
    activity: [],

    selectedId: "",
    activeFieldId: null,
    rightTab: "activity",
    exportFormat: "typescript",
    kindFilter: "all",
    apiError: null,

    collaborators: [],
    me: null,
    presences: {},

    authed: false,
    roomCode: null,

    applySnapshot: (snap) =>
      set((s) => {
        const selectedId =
          s.selectedId && snap.resources.some((r) => r.id === s.selectedId)
            ? s.selectedId
            : (snap.resources[0]?.id ?? "");
        return {
          rev: Math.max(s.rev, snap.rev),
          resources: snap.resources,
          comments: snap.comments,
          activity: snap.activity,
          collaborators: snap.collaborators,
          selectedId,
        };
      }),

    setMe: (c) => set({ me: c }),

    // Persist the bearer token + room, hydrate from the returned snapshot, and
    // flip the auth gate so the workspace mounts.
    applyRoomSession: (s) => {
      setToken(s.accessToken);
      setRoomCode(s.roomCode);
      get().applySnapshot(s.session);
      set({ me: s.collaborator, roomCode: s.roomCode, authed: true, apiError: null });
    },

    // Re-open the gate on reload when a token already exists in localStorage;
    // useWorkspaceSync then re-hydrates from the backend.
    restoreSession: (roomCode) => set({ authed: true, roomCode: roomCode || null }),

    signOut: () => {
      clearSession();
      set({
        authed: false,
        roomCode: null,
        me: null,
        rev: 0,
        resources: [],
        comments: [],
        activity: [],
        collaborators: [],
        presences: {},
        selectedId: "",
        activeFieldId: null,
        apiError: null,
      });
    },

    upsertResource: (rev, resource, fromWs = false) =>
      set((s) => {
        if (fromWs && rev <= s.rev) return {};
        const exists = s.resources.some((r) => r.id === resource.id);
        return {
          rev: Math.max(s.rev, rev),
          resources: exists
            ? s.resources.map((r) => (r.id === resource.id ? resource : r))
            : [resource, ...s.resources],
        };
      }),

    removeResource: (rev, resourceId, fromWs = false) =>
      set((s) => {
        if (fromWs && rev <= s.rev) return {};
        const resources = s.resources.filter((r) => r.id !== resourceId);
        const selectedId =
          s.selectedId === resourceId ? (resources[0]?.id ?? "") : s.selectedId;
        return { rev: Math.max(s.rev, rev), resources, selectedId };
      }),

    upsertComment: (rev, comment, fromWs = false) =>
      set((s) => {
        if (fromWs && rev <= s.rev) return {};
        const exists = s.comments.some((c) => c.id === comment.id);
        return {
          rev: Math.max(s.rev, rev),
          comments: exists
            ? s.comments.map((c) => (c.id === comment.id ? comment : c))
            : [...s.comments, comment],
        };
      }),

    removeComment: (rev, commentId, fromWs = false) =>
      set((s) => {
        if (fromWs && rev <= s.rev) return {};
        return { rev: Math.max(s.rev, rev), comments: s.comments.filter((c) => c.id !== commentId) };
      }),

    pushActivity: (event) =>
      set((s) => {
        if (s.activity.some((a) => a.id === event.id)) return {};
        return { activity: [event, ...s.activity].slice(0, ACTIVITY_CAP) };
      }),

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
    setApiError: (msg) => set({ apiError: msg }),

    select: (id) => set({ selectedId: id, activeFieldId: null }),
    focusComment: (fieldId) => set({ activeFieldId: fieldId, rightTab: "comments" }),
    setRightTab: (t) => set({ rightTab: t }),
    setExportFormat: (f) => set({ exportFormat: f }),
    setKindFilter: (k) => set({ kindFilter: k }),

    addField: async (resourceId) => {
      const resource = get().resources.find((r) => r.id === resourceId);
      try {
        const { rev, resource: updated } = await workspaceApi.addField(resourceId, {
          key: freshFieldKey(resource),
          type: "string",
          required: false,
        });
        get().upsertResource(rev, updated);
      } catch (err) {
        fail(err);
      }
    },

    updateField: async (resourceId, fieldId, patch) => {
      try {
        const { rev, resource } = await workspaceApi.updateField(resourceId, fieldId, {
          key: patch.key,
          type: patch.type,
          required: patch.required,
          state: patch.state,
          description: patch.description,
        });
        get().upsertResource(rev, resource);
      } catch (err) {
        fail(err);
      }
    },

    cycleFieldState: async (resourceId, fieldId) => {
      const field = get()
        .resources.find((r) => r.id === resourceId)
        ?.fields.find((f) => f.id === fieldId);
      if (!field) return;
      const next = FIELD_STATE_CYCLE[(FIELD_STATE_CYCLE.indexOf(field.state) + 1) % FIELD_STATE_CYCLE.length];
      try {
        const { rev, resource } = await workspaceApi.updateField(resourceId, fieldId, { state: next });
        get().upsertResource(rev, resource);
      } catch (err) {
        fail(err);
      }
    },

    removeField: async (resourceId, fieldId) => {
      try {
        const { rev, resource } = await workspaceApi.deleteField(resourceId, fieldId);
        get().upsertResource(rev, resource);
      } catch (err) {
        fail(err);
      }
    },

    addResource: async (kind) => {
      const name = kind === "endpoint" ? "newEndpoint" : kind === "database" ? "new_table" : "NewModel";
      const endpoint = kind === "endpoint"
        ? { method: "GET" as HttpMethod, path: "/api/v1/new" }
        : {};
      try {
        const { rev, resource } = await workspaceApi.createResource({ name, kind, ...endpoint });
        get().upsertResource(rev, resource);
        set({ selectedId: resource.id });
      } catch (err) {
        fail(err);
      }
    },

    renameResource: async (resourceId, name) => {
      try {
        const { rev, resource } = await workspaceApi.updateResource(resourceId, { name });
        get().upsertResource(rev, resource);
      } catch (err) {
        fail(err);
      }
    },

    addComment: async (resourceId, fieldId, body) => {
      try {
        const { rev, comment } = await workspaceApi.addComment(resourceId, fieldId, body);
        get().upsertComment(rev, comment);
      } catch (err) {
        fail(err);
      }
    },
  };
});

// Derived selectors
export const selectSelected = (s: StoreState): Resource | undefined =>
  s.resources.find((r) => r.id === s.selectedId);
