// Live Workspace domain types — a client-side schema collaboration hub.
// No backend: these mirror what a BaaS document would hold, synced across tabs.

export type FieldState = "draft" | "ready" | "breaking";

// Diff status drives the border / line-weight treatment in the blueprint.
export type FieldChange = "added" | "removed" | "modified" | "stable";

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

// Live presence beacon broadcast by each open tab.
export interface Presence {
  clientId: string;
  collaboratorId: string;
  ts: number; // epoch ms of last heartbeat
}

// The shared document persisted to localStorage and broadcast across tabs.
export interface WorkspaceDoc {
  rev: number;
  resources: Resource[];
  activity: ActivityEvent[];
  comments: Comment[];
}

export type ExportFormat = "typescript" | "json";
export type RightTab = "activity" | "comments" | "export";
