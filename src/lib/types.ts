// Live Workspace domain types — mirror the backend wire models (api-spec.md §2).
// snake_case on the wire, camelCase here; the service layer normalizes.

export type FieldState = "draft" | "ready" | "breaking";

// Diff status drives the border / line-weight treatment in the blueprint.
export type FieldChange = "added" | "removed" | "modified" | "stable";

// Arbitrary nested JSON — used by `json`-typed fields to carry a real shape.
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type DataType =
  | "string"
  | "number"
  | "boolean"
  | "uuid"
  | "timestamp"
  | "json"
  | "string[]"
  | "number[]"
  | "enum";

export interface SchemaField {
  id: string;
  key: string;
  type: DataType;
  required: boolean;
  state: FieldState;
  change: FieldChange;
  description?: string;
  // Only for `type: "json"` — the nested JSON shape/sample, edited as raw JSON.
  value?: JsonValue;
}

export type ResourceKind = "endpoint" | "database" | "model";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Resource {
  id: string;
  name: string; // e.g. "User", "createOrder"
  kind: ResourceKind;
  method?: HttpMethod; // endpoints only
  path?: string; // endpoints only
  state: FieldState; // overall resource status
  fields: SchemaField[];
  updatedAt: string; // ISO
  updatedBy: string;
}

export interface ActivityEvent {
  id: string;
  actor: string;
  verb: string; // "added", "edited", "removed", "flagged", "commented on"
  target: string; // field key or resource name
  resourceId: string;
  at: string; // ISO
}

export type TeamRole = "backend" | "frontend";

export interface Comment {
  id: string;
  resourceId: string;
  fieldId?: string; // inline comment anchored to a field
  author: string;
  role: TeamRole;
  body: string;
  at: string; // ISO
}

export interface Collaborator {
  id: string;
  name: string;
  role: TeamRole;
  color: string;
}

// Live presence beacon — one per open tab, delivered over the WebSocket.
export interface Presence {
  clientId: string;
  collaboratorId: string;
  ts: number; // epoch ms of last heartbeat
}

// One-shot hydrate payload from GET /workspace (and the WS `snapshot` frame).
export interface WorkspaceSnapshot {
  rev: number;
  resources: Resource[];
  comments: Comment[];
  activity: ActivityEvent[];
  collaborators: Collaborator[];
}

// Response schemas per endpoint, keyed by HTTP status. Backend (api-spec.md §2
// Resource) has no slot for these yet, so they live client-side in localStorage
// (src/lib/responseSchemas.ts) — see api-spec.md §2 "ResponseSchema (frontend-local)".
export interface ResponseSchema {
  status: number; // 200, 400, 500, ...
  description?: string; // short label, e.g. "OK", "Validation error"
  fields: SchemaField[];
}

export type ExportFormat = "typescript" | "json";
export type RightTab = "activity" | "comments" | "export";
