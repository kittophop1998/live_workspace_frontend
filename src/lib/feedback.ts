"use client";

// Usage feedback — complaints / improvement requests any collaborator can file
// against the workspace, tracked through a simple status lifecycle
// (open → in_progress → resolved/dismissed).
//
// Reports are persisted server-side (own `feedback` collection, like
// proposals/stories) via feedback.service.ts. `byId` is a client-side cache:
// hydrated via `hydrate()` (FeedbackDialog re-hydrates on open) and re-synced
// with the server's response after every mutation — never mutated ahead of the
// network round trip, matching useProposalStore's convention.

import { create } from "zustand";
import { feedbackService } from "@/services/feedback.service";
import { apiErrorMessage } from "@/lib/api";
import { useWorkspaceStore } from "@/lib/store";
import type { TeamRole } from "@/lib/types";

// Surface failed actions through the workspace store's apiError — same sink
// proposals.ts uses, so the AiMascot "panic" bubble already reacts to it.
function reportError(err: unknown): void {
  useWorkspaceStore.getState().setApiError(apiErrorMessage(err));
}

export type FeedbackStatus = "open" | "in_progress" | "resolved" | "dismissed";
export type FeedbackCategory = "complaint" | "improvement" | "bug" | "other";

export const FEEDBACK_STATUSES: FeedbackStatus[] = ["open", "in_progress", "resolved", "dismissed"];

export const STATUS_META: Record<FeedbackStatus, { label: string; bg: string; fg: string }> = {
  open: { label: "Open", bg: "#FFF2BF", fg: "#977400" },
  in_progress: { label: "In Progress", bg: "#DDEEFF", fg: "#3E6EA8" },
  resolved: { label: "Resolved", bg: "#DDF6E8", fg: "#2E8B62" },
  dismissed: { label: "Dismissed", bg: "#EEECEF", fg: "#8A8595" },
};

export const CATEGORY_META: Record<FeedbackCategory, { label: string; emoji: string }> = {
  complaint: { label: "Complaint", emoji: "📣" },
  improvement: { label: "Improvement", emoji: "💡" },
  bug: { label: "Bug", emoji: "🐛" },
  other: { label: "Other", emoji: "💬" },
};

export interface Feedback {
  id: string;
  category: FeedbackCategory;
  body: string;
  author: string;
  authorRole: TeamRole;
  status: FeedbackStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  updatedBy: string;
}

type ById = Record<string, Feedback>;

interface FeedbackState {
  byId: ById;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  // Not caught here — FeedbackDialog awaits this directly and needs the
  // rejection to drive its own busy/error state (same as proposals.create).
  create: (input: { category: FeedbackCategory; body: string }) => Promise<Feedback>;
  setStatus: (id: string, status: FeedbackStatus) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useFeedbackStore = create<FeedbackState>((set) => {
  const upsert = (feedback: Feedback) => set((s) => ({ byId: { ...s.byId, [feedback.id]: feedback } }));

  return {
    byId: {},
    hydrated: false,

    hydrate: async () => {
      try {
        const list = await feedbackService.list();
        set({ byId: Object.fromEntries(list.map((f) => [f.id, f])), hydrated: true });
      } catch (err) {
        reportError(err);
      }
    },

    create: async (input) => {
      const feedback = await feedbackService.create(input);
      upsert(feedback);
      return feedback;
    },

    setStatus: async (id, status) => {
      try {
        upsert(await feedbackService.setStatus(id, status));
      } catch (err) {
        reportError(err);
      }
    },

    remove: async (id) => {
      try {
        await feedbackService.remove(id);
        set((s) => {
          const byId = { ...s.byId };
          delete byId[id];
          return { byId };
        });
      } catch (err) {
        reportError(err);
      }
    },
  };
});

// ── Selectors ────────────────────────────────────────────────────────────────
export const allFeedback = (byId: ById): Feedback[] =>
  Object.values(byId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

export const openFeedbackCount = (byId: ById): number =>
  Object.values(byId).filter((f) => f.status === "open" || f.status === "in_progress").length;
