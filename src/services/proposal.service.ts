// Typed access to the Proposal endpoints (api-spec.md §Proposals /proposals*).
// The ONLY place that knows the proposal wire format (snake_case ↔ camelCase).
// Proposals live in their own backend collection (like stories/flows) — never
// embedded in the rev-guarded workspace doc. Every mutation returns the full
// updated Proposal (whole-document replace, last-write-wins).

import { apiClient, unwrap } from "@/lib/api";
import { nField, dField, type WireField } from "@/services/workspace.service";
import type { SchemaField, TeamRole } from "@/lib/types";
import type { Proposal, ProposalComment, ProposalStatus, TimelineEntry, TimelineKind } from "@/lib/proposals";

// ---- Wire shapes (snake_case) --------------------------------------------
interface WireProposalComment {
  id: string;
  field_key?: string | null;
  author: string;
  role: TeamRole;
  body: string;
  resolved: boolean;
  at: string;
}
interface WireTimelineEntry {
  id: string;
  kind: TimelineKind;
  actor: string;
  detail: string;
  at: string;
}
interface WireProposal {
  id: string;
  workspace_id: string;
  resource_id: string;
  title: string;
  description: string;
  author: string;
  author_role: TeamRole;
  status: ProposalStatus;
  fields: WireField[];
  comments: WireProposalComment[];
  timeline: WireTimelineEntry[];
  created_at: string;
  updated_at: string;
  updated_by: string;
}

// ---- Normalizer (wire → domain) ------------------------------------------
const nComment = (c: WireProposalComment): ProposalComment => ({
  id: c.id,
  fieldKey: c.field_key ?? undefined,
  author: c.author,
  role: c.role,
  body: c.body,
  at: c.at,
  resolved: c.resolved || undefined,
});

const nTimelineEntry = (t: WireTimelineEntry): TimelineEntry => ({
  id: t.id,
  kind: t.kind,
  actor: t.actor,
  detail: t.detail,
  at: t.at,
});

const nProposal = (p: WireProposal): Proposal => ({
  id: p.id,
  resourceId: p.resource_id,
  title: p.title,
  description: p.description,
  author: p.author,
  authorRole: p.author_role,
  status: p.status,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  fields: (p.fields ?? []).map(nField),
  comments: (p.comments ?? []).map(nComment),
  timeline: (p.timeline ?? []).map(nTimelineEntry),
});

// ---- API methods ----------------------------------------------------------
export const proposalService = {
  async list(): Promise<Proposal[]> {
    const res = await apiClient.get("/proposals");
    return unwrap<WireProposal[]>(res.data).map(nProposal);
  },

  async create(
    resourceId: string,
    input: { title: string; description: string; fields: SchemaField[] }
  ): Promise<Proposal> {
    const res = await apiClient.post("/proposals", {
      resource_id: resourceId,
      title: input.title,
      description: input.description,
      fields: input.fields.map(dField),
    });
    return nProposal(unwrap<WireProposal>(res.data));
  },

  async update(id: string, patch: { title?: string; description?: string }): Promise<Proposal> {
    const res = await apiClient.patch(`/proposals/${id}`, patch);
    return nProposal(unwrap<WireProposal>(res.data));
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/proposals/${id}`);
  },

  async setStatus(id: string, status: ProposalStatus): Promise<Proposal> {
    const res = await apiClient.post(`/proposals/${id}/status`, { status });
    return nProposal(unwrap<WireProposal>(res.data));
  },

  async addField(
    id: string,
    field: { key: string; type: string; required: boolean; description?: string }
  ): Promise<Proposal> {
    const res = await apiClient.post(`/proposals/${id}/fields`, field);
    return nProposal(unwrap<WireProposal>(res.data));
  },

  // Only keys present on `patch` are sent — the backend distinguishes "not
  // provided" (leave field alone) from an explicit `null` (clear it).
  async updateField(id: string, fieldId: string, patch: Partial<SchemaField>): Promise<Proposal> {
    const body: Record<string, unknown> = {};
    if (patch.key !== undefined) body.key = patch.key;
    if (patch.type !== undefined) body.type = patch.type;
    if (patch.required !== undefined) body.required = patch.required;
    if (patch.state !== undefined) body.state = patch.state;
    if ("description" in patch) body.description = patch.description ?? null;
    if ("value" in patch) body.value = patch.value ?? null;
    const res = await apiClient.patch(`/proposals/${id}/fields/${fieldId}`, body);
    return nProposal(unwrap<WireProposal>(res.data));
  },

  async removeField(id: string, fieldId: string): Promise<Proposal> {
    const res = await apiClient.delete(`/proposals/${id}/fields/${fieldId}`);
    return nProposal(unwrap<WireProposal>(res.data));
  },

  async addComment(id: string, fieldKey: string | undefined, body: string): Promise<Proposal> {
    const res = await apiClient.post(`/proposals/${id}/comments`, { field_key: fieldKey, body });
    return nProposal(unwrap<WireProposal>(res.data));
  },

  async resolveComment(id: string, commentId: string): Promise<Proposal> {
    const res = await apiClient.patch(`/proposals/${id}/comments/${commentId}`, {});
    return nProposal(unwrap<WireProposal>(res.data));
  },
};
