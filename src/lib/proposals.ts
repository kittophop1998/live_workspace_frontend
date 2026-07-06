"use client";

// Proposal Mode — a Pull-Request-like flow for an endpoint's request-body schema.
//
// There is no proposals slot in the backend model (api-spec.md §2) and the brief
// forbids API changes, so — exactly like bookmarks.ts / endpointStatus.ts /
// responseSchemas.ts — proposals live entirely client-side in localStorage. A
// proposal holds an independent *draft copy* of the resource's fields; the
// published endpoint is untouched until the proposal is merged, at which point
// the diff is applied through the real field APIs (see store.mergeProposalChanges).
//
// Persistence is per-browser (in-progress proposals are not synced to teammates);
// the merge result IS synced because it goes through the backend field endpoints.

import { create } from "zustand";
import type { Collaborator, Resource, SchemaField, TeamRole } from "@/lib/types";

const STORAGE_KEY = "live-workspace:proposals";

export type ProposalStatus = "draft" | "reviewing" | "approved" | "rejected" | "merged";

// Open = still actionable (drives the "📝 Proposal (n)" badges).
export const OPEN_STATUSES: ProposalStatus[] = ["draft", "reviewing", "approved"];

export const STATUS_META: Record<ProposalStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "Draft", bg: "#FFF2BF", fg: "#977400" },
  reviewing: { label: "Reviewing", bg: "#DDEEFF", fg: "#3E6EA8" },
  approved: { label: "Approved", bg: "#DDF6E8", fg: "#2E8B62" },
  rejected: { label: "Rejected", bg: "#FFDDDD", fg: "#C0453F" },
  merged: { label: "Merged", bg: "#E9E3FF", fg: "#6C55C0" },
};

export interface ProposalComment {
  id: string;
  fieldKey?: string; // anchored to a changed field, or thread-level when absent
  author: string;
  role: TeamRole;
  body: string;
  at: string; // ISO
  resolved?: boolean;
}

export type TimelineKind = "created" | "field" | "comment" | "status" | "merged";

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  actor: string;
  detail: string; // e.g. 'added "phone"', 'commented', 'requested review'
  at: string; // ISO
}

export interface Proposal {
  id: string;
  resourceId: string;
  title: string;
  description: string;
  author: string;
  authorRole: TeamRole;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  // Independent draft of the endpoint's request-body fields (deep copy of
  // resource.fields at creation), edited until merge.
  fields: SchemaField[];
  comments: ProposalComment[];
  timeline: TimelineEntry[];
}

type ById = Record<string, Proposal>;

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function load(): ById {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ById) : {};
  } catch {
    return {};
  }
}

function persist(byId: ById): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(byId));
  } catch {
    /* quota / serialization — non-fatal for a local convenience cache */
  }
}

function entry(kind: TimelineKind, actor: string, detail: string): TimelineEntry {
  return { id: uid(), kind, actor, detail, at: new Date().toISOString() };
}

// Clone a published field into the proposal draft, resetting its diff flag.
function cloneField(f: SchemaField): SchemaField {
  return { ...f, change: "stable", value: f.value };
}

const STATUS_VERB: Record<ProposalStatus, string> = {
  draft: "moved to draft",
  reviewing: "requested review",
  approved: "approved this proposal",
  rejected: "rejected this proposal",
  merged: "merged this proposal",
};

interface ProposalState {
  byId: ById;
  hydrate: () => void;
  create: (resource: Resource, input: { title: string; description: string }, me: Collaborator) => Proposal;
  update: (id: string, patch: Partial<Pick<Proposal, "title" | "description">>) => void;
  remove: (id: string) => void;
  setStatus: (id: string, status: ProposalStatus, actor: string) => void;

  // Field draft edits (append a timeline entry).
  addField: (id: string, field: Omit<SchemaField, "id" | "change" | "state">, actor: string) => void;
  updateField: (id: string, fieldId: string, patch: Partial<SchemaField>, actor: string) => void;
  removeField: (id: string, fieldId: string, actor: string) => void;

  addComment: (id: string, fieldKey: string | undefined, body: string, me: Collaborator) => void;
  resolveComment: (id: string, commentId: string) => void;
}

export const useProposalStore = create<ProposalState>((set) => {
  const mutate = (id: string, fn: (p: Proposal) => Proposal) =>
    set((s) => {
      const p = s.byId[id];
      if (!p) return {};
      const byId = { ...s.byId, [id]: { ...fn(p), updatedAt: new Date().toISOString() } };
      persist(byId);
      return { byId };
    });

  return {
    byId: {},
    hydrate: () => set({ byId: load() }),

    create: (resource, input, me) => {
      const now = new Date().toISOString();
      const proposal: Proposal = {
        id: uid(),
        resourceId: resource.id,
        title: input.title.trim() || "Untitled proposal",
        description: input.description.trim(),
        author: me.name,
        authorRole: me.role,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        fields: resource.fields.map(cloneField),
        comments: [],
        timeline: [entry("created", me.name, "created this proposal")],
      };
      set((s) => {
        const byId = { ...s.byId, [proposal.id]: proposal };
        persist(byId);
        return { byId };
      });
      return proposal;
    },

    update: (id, patch) => mutate(id, (p) => ({ ...p, ...patch })),
    remove: (id) =>
      set((s) => {
        const byId = { ...s.byId };
        delete byId[id];
        persist(byId);
        return { byId };
      }),

    setStatus: (id, status, actor) =>
      mutate(id, (p) => ({
        ...p,
        status,
        timeline: [...p.timeline, entry("status", actor, STATUS_VERB[status])],
      })),

    addField: (id, field, actor) =>
      mutate(id, (p) => ({
        ...p,
        fields: [...p.fields, { ...field, id: uid(), state: "draft", change: "added" }],
        timeline: [...p.timeline, entry("field", actor, `added "${field.key}"`)],
      })),

    updateField: (id, fieldId, patch, actor) =>
      mutate(id, (p) => {
        const field = p.fields.find((f) => f.id === fieldId);
        return {
          ...p,
          fields: p.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
          timeline: [...p.timeline, entry("field", actor, `edited "${patch.key ?? field?.key ?? "field"}"`)],
        };
      }),

    removeField: (id, fieldId, actor) =>
      mutate(id, (p) => {
        const field = p.fields.find((f) => f.id === fieldId);
        return {
          ...p,
          fields: p.fields.filter((f) => f.id !== fieldId),
          timeline: [...p.timeline, entry("field", actor, `removed "${field?.key ?? "field"}"`)],
        };
      }),

    addComment: (id, fieldKey, body, me) =>
      mutate(id, (p) => ({
        ...p,
        comments: [
          ...p.comments,
          { id: uid(), fieldKey, author: me.name, role: me.role, body: body.trim(), at: new Date().toISOString() },
        ],
        timeline: [...p.timeline, entry("comment", me.name, fieldKey ? `commented on "${fieldKey}"` : "commented")],
      })),

    resolveComment: (id, commentId) =>
      mutate(id, (p) => ({
        ...p,
        comments: p.comments.map((c) => (c.id === commentId ? { ...c, resolved: !c.resolved } : c)),
      })),
  };
});

// ── Selectors ────────────────────────────────────────────────────────────────
export const proposalsForResource = (byId: ById, resourceId: string): Proposal[] =>
  Object.values(byId)
    .filter((p) => p.resourceId === resourceId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

export const openProposalCount = (byId: ById, resourceId: string): number =>
  proposalsForResource(byId, resourceId).filter((p) => OPEN_STATUSES.includes(p.status)).length;
