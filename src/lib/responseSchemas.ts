"use client";

// Response schemas per endpoint, keyed by status code. These are persisted on the
// backend as Resource.responses (synced over WebSocket); this store keeps a
// localStorage cache that (a) seeds instantly on load and (b) is the source of
// truth before the backend adopts the field. Every mutation is written through to
// the backend (fire-and-forget); server data seeds back via seedFromResources.
// The Import flow (specImport.ts) and the ResponseSchemaPanel both write here.

import { create } from "zustand";
import { inferField } from "@/lib/codegen";
import { workspaceApi } from "@/services/workspace.service";
import type { ImportedField, ImportedOperation } from "@/lib/specImport";
import type { DataType, JsonValue, Resource, ResponseSchema, SchemaField } from "@/lib/types";

const STORAGE_KEY = "live-workspace:response-schemas";

type ByResource = Record<string, ResponseSchema[]>;

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `rsf_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function load(): ByResource {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ByResource) : {};
  } catch {
    return {};
  }
}

function persist(byResource: ByResource): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(byResource));
  } catch {
    /* quota / serialization — non-fatal for a local convenience cache */
  }
}

// Imported field → a real SchemaField (assign id; imported fields are "added").
export function toField(f: ImportedField, change: SchemaField["change"]): SchemaField {
  return {
    id: newId(),
    key: f.key,
    type: f.type,
    required: f.required,
    state: "ready",
    change,
    description: f.description,
    value: f.value,
  };
}

// Build the per-status response schemas for an imported operation (ids assigned).
export function buildResponseSchemas(op: ImportedOperation): ResponseSchema[] {
  return op.responses
    .map((r) => ({
      status: r.status,
      description: r.description,
      fields: r.fields.map((f) => toField(f, "added")),
    }))
    .sort((a, b) => a.status - b.status);
}

function blankField(): SchemaField {
  return { id: newId(), key: "field", type: "string", required: false, state: "draft", change: "stable" };
}

interface ResponseSchemaState {
  byResource: ByResource;
  hydrate: () => void;
  seedFromResources: (resources: Resource[]) => void;
  schemasFor: (resourceId: string) => ResponseSchema[];
  setForResource: (resourceId: string, schemas: ResponseSchema[]) => void;
  addStatus: (resourceId: string, status: number, description?: string) => void;
  removeStatus: (resourceId: string, status: number) => void;
  addField: (resourceId: string, status: number) => void;
  importJsonFields: (resourceId: string, status: number, obj: Record<string, JsonValue>) => void;
  updateField: (resourceId: string, status: number, fieldId: string, patch: Partial<SchemaField>) => void;
  removeField: (resourceId: string, status: number, fieldId: string) => void;
}

// Write-through to the backend. Fire-and-forget: errors (incl. a 404 before the
// backend adopts PUT /resources/{id}/responses) are swallowed — the localStorage
// cache still holds the change locally. The server echoes success back over the
// WebSocket, which re-seeds via seedFromResources.
function pushBackend(resourceId: string, schemas: ResponseSchema[]): void {
  void workspaceApi.setResponses(resourceId, schemas).catch(() => {
    /* transitional / offline — localStorage remains the fallback */
  });
}

// Persist the whole map to localStorage and push the one changed resource to the
// backend. Pass no resourceId (e.g. from seedFromResources) to skip the push.
const writeBack = (byResource: ByResource, resourceId?: string): { byResource: ByResource } => {
  persist(byResource);
  if (resourceId) pushBackend(resourceId, byResource[resourceId] ?? []);
  return { byResource };
};

const mapStatus = (
  schemas: ResponseSchema[],
  status: number,
  fn: (s: ResponseSchema) => ResponseSchema,
): ResponseSchema[] => schemas.map((s) => (s.status === status ? fn(s) : s));

export const useResponseSchemaStore = create<ResponseSchemaState>((set, get) => ({
  byResource: {},

  hydrate: () => set({ byResource: load() }),

  // Seed from the backend-synced resources (snapshot + WS echoes). A resource
  // whose `responses` is defined (incl. `[]`) is authoritative and overwrites the
  // local cache; `undefined` means the backend hasn't sent them yet, so the
  // localStorage fallback is left untouched. Does NOT push back to the backend.
  seedFromResources: (resources) =>
    set((st) => {
      let changed = false;
      const next = { ...st.byResource };
      for (const r of resources) {
        if (r.responses === undefined) continue;
        next[r.id] = r.responses;
        changed = true;
      }
      if (!changed) return {};
      persist(next);
      return { byResource: next };
    }),

  schemasFor: (resourceId) => get().byResource[resourceId] ?? [],

  setForResource: (resourceId, schemas) =>
    set((st) => writeBack({ ...st.byResource, [resourceId]: schemas }, resourceId)),

  addStatus: (resourceId, status, description) =>
    set((st) => {
      const current = st.byResource[resourceId] ?? [];
      if (current.some((s) => s.status === status)) return {};
      const next = [...current, { status, description, fields: [] }].sort((a, b) => a.status - b.status);
      return writeBack({ ...st.byResource, [resourceId]: next }, resourceId);
    }),

  removeStatus: (resourceId, status) =>
    set((st) => {
      const current = st.byResource[resourceId] ?? [];
      return writeBack(
        { ...st.byResource, [resourceId]: current.filter((s) => s.status !== status) },
        resourceId,
      );
    }),

  addField: (resourceId, status) =>
    set((st) => {
      const current = st.byResource[resourceId] ?? [];
      return writeBack(
        {
          ...st.byResource,
          [resourceId]: mapStatus(current, status, (s) => ({ ...s, fields: [...s.fields, blankField()] })),
        },
        resourceId,
      );
    }),

  // Paste a JSON object → one field per top-level key, types inferred. Existing
  // keys are skipped. Mirrors the endpoint-side Paste JSON (store.importJsonFields).
  importJsonFields: (resourceId, status, obj) =>
    set((st) => {
      const current = st.byResource[resourceId] ?? [];
      if (!current.some((s) => s.status === status)) return {};
      return writeBack(
        {
          ...st.byResource,
          [resourceId]: mapStatus(current, status, (s) => {
            const existing = new Set(s.fields.map((f) => f.key));
            const added: SchemaField[] = [];
            for (const [key, raw] of Object.entries(obj)) {
              if (existing.has(key)) continue;
              existing.add(key);
              const { type, value } = inferField(raw);
              added.push({ id: newId(), key, type, required: false, state: "ready", change: "added", value });
            }
            return { ...s, fields: [...s.fields, ...added] };
          }),
        },
        resourceId,
      );
    }),

  updateField: (resourceId, status, fieldId, patch) =>
    set((st) => {
      const current = st.byResource[resourceId] ?? [];
      return writeBack(
        {
          ...st.byResource,
          [resourceId]: mapStatus(current, status, (s) => ({
            ...s,
            fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
          })),
        },
        resourceId,
      );
    }),

  removeField: (resourceId, status, fieldId) =>
    set((st) => {
      const current = st.byResource[resourceId] ?? [];
      return writeBack(
        {
          ...st.byResource,
          [resourceId]: mapStatus(current, status, (s) => ({ ...s, fields: s.fields.filter((f) => f.id !== fieldId) })),
        },
        resourceId,
      );
    }),
}));

export const RESPONSE_FIELD_TYPES: DataType[] = [
  "string",
  "number",
  "boolean",
  "uuid",
  "timestamp",
  "json",
  "string[]",
  "number[]",
  "enum",
];
