"use client";

// Proposal Mode — a Pull-Request-like flow for an endpoint's request-body schema.
//
// Proposals are persisted server-side (backend/api-spec.md — Proposal, own
// `proposals` collection) via proposal.service.ts, so they sync across
// teammates instead of living per-browser. `byId` is a client-side cache:
// hydrated once via `hydrate()` and re-synced with the server's response after
// every mutation — never mutated ahead of the network round trip, matching
// useWorkspaceStore's async/await/upsert convention in store.ts. Merging a
// proposal applies its field diff through the real field APIs (see
// store.mergeProposalChanges), then flips status to "merged" here.

import { create } from "zustand";
import { proposalService } from "@/services/proposal.service";
import { apiErrorMessage } from "@/lib/api";
import { useWorkspaceStore } from "@/lib/store";
import type { Resource, SchemaField, TeamRole } from "@/lib/types";

// Surface a failed proposal action through the workspace store's apiError —
// same sink apiStory.ts uses, so the AiMascot "panic" bubble already reacts
// to it without a second error channel.
function reportError(err: unknown): void {
  useWorkspaceStore.getState().setApiError(apiErrorMessage(err));
}

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

// Clone a published field into the proposal draft, resetting its diff flag.
function cloneField(f: SchemaField): SchemaField {
  return { ...f, change: "stable", value: f.value };
}

interface ProposalState {
  byId: ById;
  hydrate: () => Promise<void>;
  create: (resource: Resource, input: { title: string; description: string }) => Promise<Proposal>;
  update: (id: string, patch: Partial<Pick<Proposal, "title" | "description">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setStatus: (id: string, status: ProposalStatus) => Promise<void>;

  // Field draft edits (server appends a timeline entry).
  addField: (id: string, field: Omit<SchemaField, "id" | "change" | "state">) => Promise<void>;
  updateField: (id: string, fieldId: string, patch: Partial<SchemaField>) => Promise<void>;
  removeField: (id: string, fieldId: string) => Promise<void>;

  addComment: (id: string, fieldKey: string | undefined, body: string) => Promise<void>;
  resolveComment: (id: string, commentId: string) => Promise<void>;
}

export const useProposalStore = create<ProposalState>((set) => {
  const upsert = (proposal: Proposal) => set((s) => ({ byId: { ...s.byId, [proposal.id]: proposal } }));

  return {
    byId: {},

    hydrate: async () => {
      try {
        const list = await proposalService.list();
        set({ byId: Object.fromEntries(list.map((p) => [p.id, p])) });
      } catch (err) {
        reportError(err);
      }
    },

    // Not caught here (unlike the other actions) — NewProposalDialog awaits
    // this directly and needs the rejection to drive its own busy/error state.
    create: async (resource, input) => {
      const proposal = await proposalService.create(resource.id, {
        title: input.title.trim() || "Untitled proposal",
        description: input.description.trim(),
        fields: resource.fields.map(cloneField),
      });
      upsert(proposal);
      return proposal;
    },

    update: async (id, patch) => {
      try {
        upsert(await proposalService.update(id, patch));
      } catch (err) {
        reportError(err);
      }
    },

    remove: async (id) => {
      try {
        await proposalService.remove(id);
        set((s) => {
          const byId = { ...s.byId };
          delete byId[id];
          return { byId };
        });
      } catch (err) {
        reportError(err);
      }
    },

    setStatus: async (id, status) => {
      try {
        upsert(await proposalService.setStatus(id, status));
      } catch (err) {
        reportError(err);
      }
    },

    addField: async (id, field) => {
      try {
        upsert(await proposalService.addField(id, field));
      } catch (err) {
        reportError(err);
      }
    },

    updateField: async (id, fieldId, patch) => {
      try {
        upsert(await proposalService.updateField(id, fieldId, patch));
      } catch (err) {
        reportError(err);
      }
    },

    removeField: async (id, fieldId) => {
      try {
        upsert(await proposalService.removeField(id, fieldId));
      } catch (err) {
        reportError(err);
      }
    },

    addComment: async (id, fieldKey, body) => {
      try {
        upsert(await proposalService.addComment(id, fieldKey, body));
      } catch (err) {
        reportError(err);
      }
    },

    resolveComment: async (id, commentId) => {
      try {
        upsert(await proposalService.resolveComment(id, commentId));
      } catch (err) {
        reportError(err);
      }
    },
  };
});

// ── Selectors ────────────────────────────────────────────────────────────────
export const proposalsForResource = (byId: ById, resourceId: string): Proposal[] =>
  Object.values(byId)
    .filter((p) => p.resourceId === resourceId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

export const openProposalCount = (byId: ById, resourceId: string): number =>
  proposalsForResource(byId, resourceId).filter((p) => OPEN_STATUSES.includes(p.status)).length;
