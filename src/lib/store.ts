"use client";

import { create } from "zustand";
import { apiErrorMessage, clearSession, setRoomCode, setToken } from "@/lib/api";
import { dResponseSchema, workspaceApi, type RoomSession } from "@/services/workspace.service";
import { inferField } from "@/lib/codegen";
import { buildResponseSchemas, useResponseSchemaStore } from "@/lib/responseSchemas";
import { seedSchemaTreesFromResources } from "@/lib/schemaTreeSync";
import type { ImportedOperation } from "@/lib/specImport";
import type { FieldDiff } from "@/lib/proposalDiff";
import type {
  ActivityEvent,
  ChatMessage,
  Collaborator,
  Comment,
  DataType,
  EndpointStatus,
  ExportFormat,
  FieldState,
  HttpMethod,
  JsonValue,
  Presence,
  Resource,
  ResourceKind,
  RightTab,
  SchemaField,
  TaskLog,
  TaskLogKind,
  WorkspaceSnapshot,
  WorkspaceView,
} from "@/lib/types";

const FIELD_STATE_CYCLE: FieldState[] = ["draft", "ready", "breaking"];
const ACTIVITY_CAP = 200;
const CHAT_CAP = 500;
const TASKLOG_CAP = 500;

interface StoreState {
  // Synced document (server-owned)
  rev: number;
  resources: Resource[];
  comments: Comment[];
  activity: ActivityEvent[];
  // Project-wide team chat — append-only, deduped by id (no rev merging).
  chat: ChatMessage[];
  // Backend work-update log — append-only, deduped by id (no rev merging).
  taskLogs: TaskLog[];

  // UI / session
  view: WorkspaceView;
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
  removeResources: (rev: number, resourceIds: string[], fromWs?: boolean) => void;
  importResources: (rev: number, resources: Resource[], fromWs?: boolean) => void;
  upsertComment: (rev: number, comment: Comment, fromWs?: boolean) => void;
  removeComment: (rev: number, commentId: string, fromWs?: boolean) => void;
  pushActivity: (event: ActivityEvent) => void;
  setChat: (messages: ChatMessage[]) => void;
  pushChatMessage: (message: ChatMessage) => void;
  setTaskLogs: (entries: TaskLog[]) => void;
  pushTaskLog: (entry: TaskLog) => void;
  updateTaskLog: (entry: TaskLog) => void;
  upsertPresence: (p: Presence) => void;
  dropPresence: (clientId: string) => void;
  prunePresences: () => void;
  setApiError: (msg: string | null) => void;

  // UI actions
  setView: (v: WorkspaceView) => void;
  select: (id: string) => void;
  focusComment: (fieldId: string | null) => void;
  setRightTab: (t: RightTab) => void;
  setExportFormat: (f: ExportFormat) => void;
  setKindFilter: (k: ResourceKind | "all") => void;

  // Schema mutations (call the backend; state updates from the response + WS)
  addField: (resourceId: string) => void;
  importJsonFields: (resourceId: string, obj: Record<string, JsonValue>) => void;
  importTypedFields: (
    resourceId: string,
    fields: { key: string; type: DataType; required?: boolean; description?: string; value?: JsonValue }[],
  ) => void;
  updateField: (resourceId: string, fieldId: string, patch: Partial<SchemaField>) => void;
  cycleFieldState: (resourceId: string, fieldId: string) => void;
  removeField: (resourceId: string, fieldId: string) => void;
  addResource: (kind: ResourceKind) => void;
  clearResources: () => Promise<void>;
  importEndpoints: (operations: ImportedOperation[]) => Promise<void>;
  renameResource: (resourceId: string, name: string) => void;
  updateEndpoint: (resourceId: string, patch: { method?: HttpMethod; path?: string; status?: EndpointStatus }) => void;
  deleteResource: (resourceId: string) => void;
  addComment: (resourceId: string, fieldId: string | undefined, body: string) => void;
  sendChatMessage: (body: string) => void;
  addTaskLog: (input: { kind: TaskLogKind; body: string; resourceId?: string }) => void;
  toggleTaskLogLike: (entryId: string) => void;
  // Apply a merged proposal's diff to the published endpoint via the real field
  // APIs (client-only Proposal Mode — see lib/proposals.ts). Returns success.
  mergeProposalChanges: (resourceId: string, diffs: FieldDiff[]) => Promise<boolean>;
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

  // The backend seeds a default `id` field on every resource create (see
  // api-spec §5 POST /resources). Endpoints must start from a blank request body
  // (query params / JSON body come from the spec, not a phantom `id`), so strip
  // the seeded fields after creation. Shared by addResource + importEndpoints.
  const stripSeededFields = async (resource: Resource) => {
    for (const seeded of resource.fields) {
      const { rev, resource: pruned } = await workspaceApi.deleteField(resource.id, seeded.id);
      get().upsertResource(rev, pruned);
    }
  };

  return {
    rev: 0,
    resources: [],
    comments: [],
    activity: [],
    chat: [],
    taskLogs: [],

    view: "workspace",
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
        // Seed the response-schema cache from server-owned Resource.responses.
        useResponseSchemaStore.getState().seedFromResources(snap.resources);
        seedSchemaTreesFromResources(snap.resources);
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
          // REST /workspace omits chat — keep what we already have.
          ...(snap.chat ? { chat: snap.chat } : {}),
          ...(snap.taskLogs ? { taskLogs: snap.taskLogs } : {}),
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
        chat: [],
        taskLogs: [],
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
        // Keep the response-schema cache in step with server data (REST + WS echo).
        useResponseSchemaStore.getState().seedFromResources([resource]);
        seedSchemaTreesFromResources([resource]);
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

    removeResources: (rev, resourceIds, fromWs = false) =>
      set((s) => {
        if (fromWs && rev <= s.rev) return {};
        const removing = new Set(resourceIds);
        const resources = s.resources.filter((r) => !removing.has(r.id));
        const comments = s.comments.filter((c) => !removing.has(c.resourceId));
        const selectedId = removing.has(s.selectedId) ? (resources[0]?.id ?? "") : s.selectedId;
        return { rev: Math.max(s.rev, rev), resources, comments, selectedId, activeFieldId: null };
      }),

    // Apply a whole imported batch in ONE set() — all resources share the import's
    // single rev, so upserting them one-by-one would make every call after the
    // first a no-op on a remote client (rev <= s.rev). Response caches seed from
    // each resource's server-owned `responses`.
    importResources: (rev, resources, fromWs = false) =>
      set((s) => {
        if (fromWs && rev <= s.rev) return {};
        if (resources.length === 0) return {};
        useResponseSchemaStore.getState().seedFromResources(resources);
        seedSchemaTreesFromResources(resources);
        const incoming = new Set(resources.map((r) => r.id));
        const kept = s.resources.filter((r) => !incoming.has(r.id));
        return { rev: Math.max(s.rev, rev), resources: [...resources, ...kept] };
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

    setChat: (messages) => set({ chat: messages.slice(-CHAT_CAP) }),

    pushChatMessage: (message) =>
      set((s) => {
        if (s.chat.some((m) => m.id === message.id)) return {};
        return { chat: [...s.chat, message].slice(-CHAT_CAP) };
      }),

    setTaskLogs: (entries) => set({ taskLogs: entries.slice(-TASKLOG_CAP) }),

    pushTaskLog: (entry) =>
      set((s) => {
        if (s.taskLogs.some((t) => t.id === entry.id)) return {};
        return { taskLogs: [...s.taskLogs, entry].slice(-TASKLOG_CAP) };
      }),

    updateTaskLog: (entry) =>
      set((s) => ({ taskLogs: s.taskLogs.map((t) => (t.id === entry.id ? entry : t)) })),

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

    setView: (v) => set({ view: v }),
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

    // Build fields straight from a pasted JSON object: each top-level key becomes
    // a field with an inferred type; nested objects/arrays land as `json` + value.
    // Keys that already exist are skipped (no destructive overwrite / 409s).
    importJsonFields: async (resourceId, obj) => {
      const resource = get().resources.find((r) => r.id === resourceId);
      const existing = new Set((resource?.fields ?? []).map((f) => f.key));
      for (const [key, raw] of Object.entries(obj)) {
        if (existing.has(key)) continue;
        existing.add(key);
        const { type, value } = inferField(raw);
        try {
          const { rev, resource: updated } = await workspaceApi.addField(resourceId, {
            key,
            type,
            required: false,
            value,
          });
          // Re-apply nested value locally in case the backend doesn't persist it yet.
          const merged =
            value !== undefined
              ? { ...updated, fields: updated.fields.map((f) => (f.key === key ? { ...f, value } : f)) }
              : updated;
          get().upsertResource(rev, merged);
        } catch (err) {
          fail(err);
          return;
        }
      }
    },

    // Replace an endpoint's request-body fields with the spec's — used by the spec
    // importer (Import Specification). The endpoint's existing fields are deleted
    // first, so re-importing a spec onto an endpoint is a clean replace of JUST that
    // endpoint (no stale keys left behind) rather than a merge with what was there.
    importTypedFields: async (resourceId, fields) => {
      try {
        const resource = get().resources.find((r) => r.id === resourceId);
        for (const stale of resource?.fields ?? []) {
          const { rev, resource: pruned } = await workspaceApi.deleteField(resourceId, stale.id);
          get().upsertResource(rev, pruned);
        }
        const added = new Set<string>();
        for (const f of fields) {
          if (added.has(f.key)) continue; // guard against duplicate keys in the spec
          added.add(f.key);
          const { rev, resource: updated } = await workspaceApi.addField(resourceId, {
            key: f.key,
            type: f.type,
            required: f.required ?? false,
            description: f.description,
            value: f.value,
          });
          const merged =
            f.value !== undefined
              ? { ...updated, fields: updated.fields.map((x) => (x.key === f.key ? { ...x, value: f.value } : x)) }
              : updated;
          get().upsertResource(rev, merged);
        }
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
          value: patch.value,
        });
        // Backend may not yet persist `value` (frontend-only feature) — re-apply
        // the edited JSON onto the echoed resource so the change always sticks.
        const merged =
          "value" in patch
            ? { ...resource, fields: resource.fields.map((f) => (f.id === fieldId ? { ...f, value: patch.value } : f)) }
            : resource;
        get().upsertResource(rev, merged);
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
        // Endpoints don't want the backend-seeded default `id` field in their
        // request body — start blank. Databases/models keep it (an id column/key
        // is a sensible default there).
        if (kind === "endpoint") await stripSeededFields(resource);
      } catch (err) {
        fail(err);
      }
    },

    // Delete every resource in the room (clears the left explorer). The response
    // rev + ids drive the local prune; teammates get the same via `resource.cleared`.
    clearResources: async () => {
      try {
        const { rev, resourceIds } = await workspaceApi.deleteAllResources();
        get().removeResources(rev, resourceIds);
      } catch (err) {
        fail(err);
      }
    },

    // Bulk-import an OpenAPI/Postman spec from the top bar in ONE atomic request:
    // the backend creates every chosen endpoint (request body + per-status response
    // schemas) in a single rev-bumping mutation. This replaces the old per-endpoint
    // create/strip/addField loop, which fired thousands of round-trips for a large
    // spec and dropped the rest of the batch on the first transient failure.
    importEndpoints: async (operations) => {
      const endpoints = operations.map((op) => ({
        name: op.name,
        method: op.method,
        path: op.path,
        fields: op.requestFields.map((f) => ({
          key: f.key,
          type: f.type,
          required: f.required,
          description: f.description ?? null,
          value: f.value ?? null,
        })),
        responses: buildResponseSchemas(op).map(dResponseSchema),
      }));
      try {
        const { rev, resources } = await workspaceApi.importResources(endpoints);
        get().importResources(rev, resources);
        if (resources.length) set({ selectedId: resources[0].id });
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

    updateEndpoint: async (resourceId, patch) => {
      try {
        const { rev, resource } = await workspaceApi.updateResource(resourceId, patch);
        get().upsertResource(rev, resource);
      } catch (err) {
        fail(err);
      }
    },

    deleteResource: async (resourceId) => {
      try {
        const { rev, resourceId: removed } = await workspaceApi.deleteResource(resourceId);
        get().removeResource(rev, removed);
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

    // The WS `chat.created` echo is deduped by id in pushChatMessage, so
    // applying the REST response here never double-inserts.
    sendChatMessage: async (body) => {
      try {
        const message = await workspaceApi.sendChat(body);
        get().pushChatMessage(message);
      } catch (err) {
        fail(err);
      }
    },

    // The WS `task_log.created` echo is deduped by id in pushTaskLog, so applying
    // the REST response here never double-inserts.
    addTaskLog: async (input) => {
      try {
        const entry = await workspaceApi.postTaskLog(input);
        get().pushTaskLog(entry);
      } catch (err) {
        fail(err);
      }
    },

    // Same dedupe story as addTaskLog: the WS `task_log.updated` echo lands on
    // updateTaskLog too, which is a plain replace-by-id so the echo is a no-op.
    toggleTaskLogLike: async (entryId) => {
      try {
        const entry = await workspaceApi.toggleTaskLogLike(entryId);
        get().updateTaskLog(entry);
      } catch (err) {
        fail(err);
      }
    },

    // Replay a proposal's field diff onto the published resource using only the
    // existing field endpoints — remove/add/modify by the field id the proposal
    // carried over from the published schema. Aborts (returns false) on the first
    // failure so a half-merged endpoint surfaces the error rather than lying.
    mergeProposalChanges: async (resourceId, diffs) => {
      try {
        for (const d of diffs) {
          if (d.op === "remove") {
            const { rev, resource } = await workspaceApi.deleteField(resourceId, d.field.id);
            get().upsertResource(rev, resource);
          } else if (d.op === "add") {
            const { rev, resource } = await workspaceApi.addField(resourceId, {
              key: d.field.key,
              type: d.field.type,
              required: d.field.required,
              description: d.field.description,
              value: d.field.value,
            });
            // Re-apply nested JSON value locally (backend may not persist it yet).
            const merged =
              d.field.value !== undefined
                ? { ...resource, fields: resource.fields.map((f) => (f.key === d.field.key ? { ...f, value: d.field.value } : f)) }
                : resource;
            get().upsertResource(rev, merged);
          } else {
            const { rev, resource } = await workspaceApi.updateField(resourceId, d.field.id, {
              key: d.field.key,
              type: d.field.type,
              required: d.field.required,
              description: d.field.description,
              value: d.field.value,
            });
            const merged = { ...resource, fields: resource.fields.map((f) => (f.id === d.field.id ? { ...f, value: d.field.value } : f)) };
            get().upsertResource(rev, merged);
          }
        }
        return true;
      } catch (err) {
        fail(err);
        return false;
      }
    },
  };
});

// Derived selectors
export const selectSelected = (s: StoreState): Resource | undefined =>
  s.resources.find((r) => r.id === s.selectedId);
