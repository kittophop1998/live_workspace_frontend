// Typed access to the backend (api-spec.md §3). This is the ONLY place that
// knows the wire format: snake_case on the wire, camelCase in the app. Every
// read/mutation funnels through here and returns normalized domain types.

import { apiClient, unwrap } from "@/lib/api";
import type {
  ActivityEvent,
  Collaborator,
  Comment,
  DataType,
  FieldState,
  HttpMethod,
  JsonValue,
  Presence,
  Resource,
  ResourceKind,
  SchemaField,
  TeamRole,
  WorkspaceSnapshot,
} from "@/lib/types";

// ---- Wire shapes (snake_case) --------------------------------------------
interface WireField {
  id: string;
  key: string;
  type: string;
  required: boolean;
  state: string;
  change: string;
  description?: string | null;
  value?: JsonValue | null;
}
interface WireResource {
  id: string;
  name: string;
  kind: string;
  method?: string | null;
  path?: string | null;
  state: string;
  fields: WireField[];
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
}

// ---- Normalizers (wire → domain) -----------------------------------------
export const nField = (f: WireField): SchemaField => ({
  id: f.id,
  key: f.key,
  type: f.type as DataType,
  required: f.required,
  state: f.state as FieldState,
  change: f.change as SchemaField["change"],
  description: f.description ?? undefined,
  value: f.value ?? undefined,
});

export const nResource = (r: WireResource): Resource => ({
  id: r.id,
  name: r.name,
  kind: r.kind as ResourceKind,
  method: (r.method ?? undefined) as HttpMethod | undefined,
  path: r.path ?? undefined,
  state: r.state as FieldState,
  fields: (r.fields ?? []).map(nField),
  updatedAt: r.updated_at,
  updatedBy: r.updated_by,
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

  async updateResource(id: string, input: UpdateResourceInput): Promise<ResourceMutation> {
    const res = await apiClient.patch(`/resources/${id}`, input);
    const data = unwrap<{ rev: number; resource: WireResource }>(res.data);
    return { rev: data.rev, resource: nResource(data.resource) };
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
};
