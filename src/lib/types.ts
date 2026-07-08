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
  | "integer"
  | "boolean"
  | "uuid"
  | "timestamp"
  | "json"
  | "string[]"
  | "number[]"
  | "enum"
  | "object"
  | "array"
  | "null";

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
}

// Recursive: request/response body field. `children` holds nested properties
// for an "object" field, `items` holds the element schema for an "array"
// field — mirrors the Visual Builder's SchemaNode (lib/schemaTree.ts) so the
// tree can be saved/loaded 1:1 instead of living only in localStorage.
export interface SchemaField {
  id: string;
  key: string;
  type: DataType;
  required: boolean;
  nullable?: boolean;
  state: FieldState;
  change: FieldChange;
  description?: string;
  // Legacy: only for `type: "json"` — the nested JSON shape/sample.
  value?: JsonValue;
  example?: JsonValue;
  default?: JsonValue;
  enumValues?: string[];
  validation?: FieldValidation;
  children?: SchemaField[];
  items?: SchemaField;
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

// Project-wide team chat message (api-spec §3 /chat, §4 `chat.created`).
// Chat is append-only and lives outside the rev'd workspace aggregate — no rev
// merging; clients dedupe by id.
export interface ChatMessage {
  id: string;
  authorId: string;
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
  // Only the WS snapshot frame carries chat; REST /workspace omits it and the
  // store keeps its current chat state when this is undefined.
  chat?: ChatMessage[];
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
export type RightTab = "activity" | "comments" | "chat";

// Top-level app view — the workspace (schema collab), the E2E flow tester, and
// the additive API Story view. Endpoint editing always lives in
// "workspace"; story navigates away and back without replacing it.
export type WorkspaceView = "workspace" | "flows" | "story";

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
