// Typed access to the backend (api-spec.md §3). This is the ONLY place that
// knows the wire format: snake_case on the wire, camelCase in the app. Every
// read/mutation funnels through here and returns normalized domain types.

import { apiClient, unwrap } from "@/lib/api";
import type {
  ActivityEvent,
  ChatMessage,
  Collaborator,
  Comment,
  DataType,
  EndpointStatus,
  FieldState,
  HttpMethod,
  JsonValue,
  Presence,
  Resource,
  ResourceKind,
  ResponseSchema,
  SchemaField,
  TeamRole,
  WorkspaceSnapshot,
} from "@/lib/types";

// ---- Wire shapes (snake_case) --------------------------------------------
interface WireFieldValidation {
  min_length?: number | null;
  max_length?: number | null;
  minimum?: number | null;
  maximum?: number | null;
  pattern?: string | null;
  format?: string | null;
}
export interface WireField {
  id: string;
  key: string;
  type: string;
  required: boolean;
  nullable?: boolean;
  state: string;
  change: string;
  description?: string | null;
  value?: JsonValue | null;
  example?: JsonValue | null;
  default?: JsonValue | null;
  enum_values?: string[] | null;
  validation?: WireFieldValidation | null;
  children?: WireField[] | null;
  items?: WireField | null;
}
interface WireResponseSchema {
  status: number;
  description?: string | null;
  fields: WireField[];
}
interface WireResource {
  id: string;
  name: string;
  kind: string;
  method?: string | null;
  path?: string | null;
  state: string;
  status?: string | null; // endpoints only: workflow status (api-spec §2)
  fields: WireField[];
  responses?: WireResponseSchema[] | null;
  updated_at: string;
  updated_by: string;
}
interface WireComment {
  id: string;
  resource_id: string;
  field_id?: string | null;
  author: string;
  role: string;
  body: string;
  at: string;
}
interface WireChatMessage {
  id: string;
  author_id: string;
  author: string;
  role: string;
  body: string;
  at: string;
}
interface WireActivity {
  id: string;
  actor: string;
  verb: string;
  target: string;
  resource_id: string;
  at: string;
}
interface WireCollaborator {
  id: string;
  name: string;
  role: string;
  color: string;
}
interface WirePresence {
  client_id: string;
  collaborator_id: string;
  ts: number;
}
interface WireSnapshot {
  rev: number;
  resources: WireResource[];
  comments: WireComment[];
  activity: WireActivity[];
  collaborators: WireCollaborator[];
  chat?: WireChatMessage[] | null; // WS snapshot only (api-spec §2)
}

// ---- Normalizers (wire → domain) -----------------------------------------
export const nField = (f: WireField): SchemaField => ({
  id: f.id,
  key: f.key,
  type: f.type as DataType,
  required: f.required,
  nullable: f.nullable ?? undefined,
  state: f.state as FieldState,
  change: f.change as SchemaField["change"],
  description: f.description ?? undefined,
  value: f.value ?? undefined,
  example: f.example ?? undefined,
  default: f.default ?? undefined,
  enumValues: f.enum_values ?? undefined,
  validation: f.validation
    ? {
        minLength: f.validation.min_length ?? undefined,
        maxLength: f.validation.max_length ?? undefined,
        minimum: f.validation.minimum ?? undefined,
        maximum: f.validation.maximum ?? undefined,
        pattern: f.validation.pattern ?? undefined,
        format: f.validation.format ?? undefined,
      }
    : undefined,
  children: f.children ? f.children.map(nField) : undefined,
  items: f.items ? nField(f.items) : undefined,
});

export const nResponseSchema = (r: WireResponseSchema): ResponseSchema => ({
  status: r.status,
  description: r.description ?? undefined,
  fields: (r.fields ?? []).map(nField),
});

export const nResource = (r: WireResource): Resource => ({
  id: r.id,
  name: r.name,
  kind: r.kind as ResourceKind,
  method: (r.method ?? undefined) as HttpMethod | undefined,
  path: r.path ?? undefined,
  state: r.state as FieldState,
  // Endpoints only. Legacy rows without a stored status read back as "draft"
  // (api-spec §2); non-endpoints have no workflow status.
  status: r.kind === "endpoint" ? ((r.status as EndpointStatus | null) ?? "draft") : undefined,
  fields: (r.fields ?? []).map(nField),
  // Keep `undefined` when the backend omits the field (pre-migration) so the
  // local cache is preserved; `[]` means the backend sent an empty set.
  responses: r.responses ? r.responses.map(nResponseSchema) : undefined,
  updatedAt: r.updated_at,
  updatedBy: r.updated_by,
});

// ---- Denormalizers (domain → wire) — for the responses/request-fields PUT
// bodies -----------------------------------------------------------------
export const dField = (f: SchemaField): WireField => ({
  id: f.id,
  key: f.key,
  type: f.type,
  required: f.required,
  nullable: f.nullable ?? undefined,
  state: f.state,
  change: f.change,
  description: f.description ?? null,
  value: f.value ?? null,
  example: f.example ?? null,
  default: f.default ?? null,
  enum_values: f.enumValues ?? null,
  validation: f.validation
    ? {
        min_length: f.validation.minLength ?? null,
        max_length: f.validation.maxLength ?? null,
        minimum: f.validation.minimum ?? null,
        maximum: f.validation.maximum ?? null,
        pattern: f.validation.pattern ?? null,
        format: f.validation.format ?? null,
      }
    : undefined,
  children: f.children ? f.children.map(dField) : undefined,
  items: f.items ? dField(f.items) : undefined,
});

export const dResponseSchema = (s: ResponseSchema): WireResponseSchema => ({
  status: s.status,
  description: s.description ?? null,
  fields: s.fields.map(dField),
});

export const nComment = (c: WireComment): Comment => ({
  id: c.id,
  resourceId: c.resource_id,
  fieldId: c.field_id ?? undefined,
  author: c.author,
  role: c.role as TeamRole,
  body: c.body,
  at: c.at,
});

export const nChatMessage = (m: WireChatMessage): ChatMessage => ({
  id: m.id,
  authorId: m.author_id,
  author: m.author,
  role: m.role as TeamRole,
  body: m.body,
  at: m.at,
});

export const nActivity = (a: WireActivity): ActivityEvent => ({
  id: a.id,
  actor: a.actor,
  verb: a.verb,
  target: a.target,
  resourceId: a.resource_id,
  at: a.at,
});

export const nCollaborator = (c: WireCollaborator): Collaborator => ({
  id: c.id,
  name: c.name,
  role: c.role as TeamRole,
  color: c.color,
});

export const nPresence = (p: WirePresence): Presence => ({
  clientId: p.client_id,
  collaboratorId: p.collaborator_id,
  ts: p.ts,
});

export const nSnapshot = (s: WireSnapshot): WorkspaceSnapshot => ({
  rev: s.rev,
  resources: (s.resources ?? []).map(nResource),
  comments: (s.comments ?? []).map(nComment),
  activity: (s.activity ?? []).map(nActivity),
  collaborators: (s.collaborators ?? []).map(nCollaborator),
  // Keep undefined when absent (REST /workspace) so the store preserves chat.
  chat: s.chat ? s.chat.map(nChatMessage) : undefined,
});

// ---- Mutation result shapes ----------------------------------------------
export interface ResourceMutation {
  rev: number;
  resource: Resource;
}
export interface CommentMutation {
  rev: number;
  comment: Comment;
}

export interface CreateResourceInput {
  name: string;
  kind: ResourceKind;
  method?: HttpMethod;
  path?: string;
}
export interface UpdateResourceInput {
  name?: string;
  method?: HttpMethod;
  path?: string;
  status?: EndpointStatus; // endpoints only (api-spec §3 PATCH /resources/{id})
}
export interface AddFieldInput {
  key: string;
  type: DataType;
  required?: boolean;
  state?: FieldState;
  description?: string;
  value?: JsonValue;
}
export interface UpdateFieldInput {
  key?: string;
  type?: DataType;
  required?: boolean;
  state?: FieldState;
  description?: string | null;
  value?: JsonValue | null;
}
export interface ImportEndpointInput {
  name: string;
  method: HttpMethod;
  path: string;
  fields: {
    key: string;
    type: DataType;
    required: boolean;
    description?: string | null;
    value?: JsonValue | null;
  }[];
  responses: WireResponseSchema[];
}

// ---- Room session (auth) -------------------------------------------------
interface WireRoomSession {
  access_token: string;
  room_code: string;
  collaborator: WireCollaborator;
  session: WireSnapshot;
}

export interface RoomSession {
  accessToken: string;
  roomCode: string;
  collaborator: Collaborator;
  session: WorkspaceSnapshot;
}

const nRoomSession = (s: WireRoomSession): RoomSession => ({
  accessToken: s.access_token,
  roomCode: s.room_code,
  collaborator: nCollaborator(s.collaborator),
  session: nSnapshot(s.session),
});

// ---- API methods ----------------------------------------------------------
export const workspaceApi = {
  // Rooms (public — no token required). Both return the bearer token + snapshot.
  async createRoom(name: string): Promise<RoomSession> {
    const res = await apiClient.post("/rooms", { name });
    return nRoomSession(unwrap<WireRoomSession>(res.data));
  },

  async joinRoom(roomCode: string, name: string): Promise<RoomSession> {
    const res = await apiClient.post("/rooms/join", { room_code: roomCode, name });
    return nRoomSession(unwrap<WireRoomSession>(res.data));
  },

  async getSnapshot(): Promise<WorkspaceSnapshot> {
    const res = await apiClient.get("/workspace");
    return nSnapshot(unwrap<WireSnapshot>(res.data));
  },

  async getMe(): Promise<Collaborator> {
    const res = await apiClient.get("/me");
    return nCollaborator(unwrap<WireCollaborator>(res.data));
  },

  async createResource(input: CreateResourceInput): Promise<ResourceMutation> {
    const res = await apiClient.post("/resources", input);
    const data = unwrap<{ rev: number; resource: WireResource }>(res.data);
    return { rev: data.rev, resource: nResource(data.resource) };
  },

  // Bulk-create endpoints from a parsed spec in ONE atomic request (one rev bump,
  // one broadcast). Replaces the per-endpoint create/field loop that dropped
  // endpoints on any transient failure. Backs the "Import API" flow.
  async importResources(endpoints: ImportEndpointInput[]): Promise<{ rev: number; resources: Resource[] }> {
    const res = await apiClient.post("/resources/import", { endpoints });
    const data = unwrap<{ rev: number; resources: WireResource[] }>(res.data);
    return { rev: data.rev, resources: (data.resources ?? []).map(nResource) };
  },

  async updateResource(id: string, input: UpdateResourceInput): Promise<ResourceMutation> {
    const res = await apiClient.patch(`/resources/${id}`, input);
    const data = unwrap<{ rev: number; resource: WireResource }>(res.data);
    return { rev: data.rev, resource: nResource(data.resource) };
  },

  // Wipe every resource in the room (clears the left explorer) — backs the
  // "Import API" flow that recreates endpoints from scratch.
  async deleteAllResources(): Promise<{ rev: number; resourceIds: string[] }> {
    const res = await apiClient.delete("/resources");
    const data = unwrap<{ rev: number; resource_ids: string[] }>(res.data);
    return { rev: data.rev, resourceIds: data.resource_ids ?? [] };
  },

  async deleteResource(id: string): Promise<{ rev: number; resourceId: string }> {
    const res = await apiClient.delete(`/resources/${id}`);
    const data = unwrap<{ rev: number; resource_id: string }>(res.data);
    return { rev: data.rev, resourceId: data.resource_id };
  },

  async addField(resourceId: string, input: AddFieldInput): Promise<ResourceMutation> {
    const res = await apiClient.post(`/resources/${resourceId}/fields`, input);
    const data = unwrap<{ rev: number; resource: WireResource }>(res.data);
    return { rev: data.rev, resource: nResource(data.resource) };
  },

  async updateField(
    resourceId: string,
    fieldId: string,
    input: UpdateFieldInput,
  ): Promise<ResourceMutation> {
    const res = await apiClient.patch(`/resources/${resourceId}/fields/${fieldId}`, input);
    const data = unwrap<{ rev: number; resource: WireResource }>(res.data);
    return { rev: data.rev, resource: nResource(data.resource) };
  },

  async deleteField(resourceId: string, fieldId: string): Promise<ResourceMutation> {
    const res = await apiClient.delete(`/resources/${resourceId}/fields/${fieldId}`);
    const data = unwrap<{ rev: number; resource: WireResource }>(res.data);
    return { rev: data.rev, resource: nResource(data.resource) };
  },

  // Replace the endpoint's per-status response schemas (whole array). Backs the
  // response-schema editor's write-through sync (src/lib/responseSchemas.ts).
  async setResponses(resourceId: string, schemas: ResponseSchema[]): Promise<ResourceMutation> {
    const res = await apiClient.put(`/resources/${resourceId}/responses`, {
      responses: schemas.map(dResponseSchema),
    });
    const data = unwrap<{ rev: number; resource: WireResource }>(res.data);
    return { rev: data.rev, resource: nResource(data.resource) };
  },

  // Replace the resource's whole request-body field tree (nested objects/
  // arrays included). Backs the Visual Builder's write-through save
  // (src/lib/schemaTreeSync.ts) — mirrors setResponses below.
  async setRequestFields(resourceId: string, fields: SchemaField[]): Promise<ResourceMutation> {
    const res = await apiClient.put(`/resources/${resourceId}/request-fields`, {
      fields: fields.map(dField),
    });
    const data = unwrap<{ rev: number; resource: WireResource }>(res.data);
    return { rev: data.rev, resource: nResource(data.resource) };
  },

  async addComment(
    resourceId: string,
    fieldId: string | undefined,
    body: string,
  ): Promise<CommentMutation> {
    const res = await apiClient.post(`/resources/${resourceId}/comments`, {
      field_id: fieldId ?? null,
      body,
    });
    const data = unwrap<{ rev: number; comment: WireComment }>(res.data);
    return { rev: data.rev, comment: nComment(data.comment) };
  },

  // Project-wide team chat (api-spec §3 /chat). Append-only; no rev involved.
  async getChat(): Promise<ChatMessage[]> {
    const res = await apiClient.get("/chat");
    return (unwrap<WireChatMessage[]>(res.data) ?? []).map(nChatMessage);
  },

  async sendChat(body: string): Promise<ChatMessage> {
    const res = await apiClient.post("/chat", { body });
    const data = unwrap<{ message: WireChatMessage }>(res.data);
    return nChatMessage(data.message);
  },
};
