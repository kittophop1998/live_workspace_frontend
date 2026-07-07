// Live Workspace domain types — mirror the backend wire models (api-spec.md §2).
// snake_case on the wire, camelCase here; the service layer normalizes.

export type FieldState = "draft" | "ready" | "breaking";

// Per-endpoint workflow/progress status (server-persisted as `Resource.status`,
// api-spec.md §2 — endpoints only, settable via PATCH /resources/{id}, synced over
// WS). Distinct from FieldState — this tracks how far an endpoint is in the build
// pipeline.
export type EndpointStatus = "draft" | "inprogress" | "testing" | "done";

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
  state: FieldState; // overall resource status (server rollup from fields)
  status?: EndpointStatus; // endpoints only: workflow status (server-authored, api-spec §2)
  fields: SchemaField[];
  // Per-status response schemas (endpoints). `undefined` = the backend hasn't
  // sent them (pre-migration → fall back to localStorage in responseSchemas.ts);
  // `[]` = backend sent an empty set. See ResponseSchema below.
  responses?: ResponseSchema[];
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

// Response schemas per endpoint, keyed by HTTP status. Persisted on the backend
// as Resource.responses (synced over WS); responseSchemas.ts keeps a localStorage
// cache used as an offline fallback before the backend adopts the field.
export interface ResponseSchema {
  status: number; // 200, 400, 500, ...
  description?: string; // short label, e.g. "OK", "Validation error"
  fields: SchemaField[];
}

export type ExportFormat = "typescript" | "json";
export type RightTab = "activity" | "comments";

// Top-level app view — the workspace (schema collab), the E2E flow tester, and
// the additive API Graph / API Story views. Endpoint editing always lives in
// "workspace"; graph/story navigate away and back without replacing it.
export type WorkspaceView = "workspace" | "flows" | "graph" | "story";

// ---- E2E Flow Testing (api-spec.md §2 Flow*) ------------------------------
// Parsed from an uploaded Arazzo (OpenAPI Workflows) document by the backend,
// previewed, then saved + run. camelCase here; flowService normalizes the wire.

export interface FlowVariable {
  name: string;
  in: string; // "input" | "query" | "path" | "header" | "body"
  value?: JsonValue;
}

export interface FlowOutput {
  name: string;
  from: string; // runtime expression, e.g. "$response.body#/id"
}

export interface StepParameter {
  name: string;
  in: string; // "query" | "path" | "header"
  value?: JsonValue;
}

export interface Criterion {
  condition: string;
  context?: string;
  type?: string; // "" (simple) | "regex" | "jsonpath"
}

export interface FlowStep {
  id?: string;
  stepId: string;
  description?: string;
  operationId?: string;
  method?: string;
  path?: string;
  order: number;
  dependsOn: string[];
  parameters: StepParameter[];
  requestBody?: JsonValue;
  outputs: FlowOutput[];
  successCriteria: Criterion[];
}

export interface FlowDefinition {
  id?: string;
  workspaceId?: string;
  name: string;
  description: string;
  inputs: FlowVariable[];
  steps: FlowStep[];
  createdAt?: string;
  createdBy?: string;
}

export type FlowRunStatus = "passed" | "failed" | "errored";

export interface StepResult {
  stepId: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  passed: boolean;
  skipped: boolean;
  failures: string[];
  outputs: Record<string, JsonValue>;
  error?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  response?: string;
}

export interface FlowRun {
  id: string;
  flowId: string;
  workspaceId: string;
  status: FlowRunStatus;
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  steps: StepResult[];
}
