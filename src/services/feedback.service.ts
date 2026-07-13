// Typed access to the Feedback endpoints (backend/api-spec.md §Feedback,
// /feedback*). The ONLY place that knows the feedback wire format
// (snake_case ↔ camelCase). Feedback lives in its own backend collection
// (like proposals/stories) — never embedded in the rev-guarded workspace doc.

import { apiClient, unwrap } from "@/lib/api";
import type { TeamRole } from "@/lib/types";
import type { Feedback, FeedbackCategory, FeedbackStatus } from "@/lib/feedback";

// ---- Wire shape (snake_case) ----------------------------------------------
interface WireFeedback {
  id: string;
  workspace_id: string;
  category: FeedbackCategory;
  body: string;
  author: string;
  author_role: TeamRole;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

// ---- Normalizer (wire → domain) ------------------------------------------
const nFeedback = (f: WireFeedback): Feedback => ({
  id: f.id,
  category: f.category,
  body: f.body,
  author: f.author,
  authorRole: f.author_role,
  status: f.status,
  createdAt: f.created_at,
  updatedAt: f.updated_at,
  updatedBy: f.updated_by,
});

// ---- API methods ----------------------------------------------------------
export const feedbackService = {
  async list(): Promise<Feedback[]> {
    const res = await apiClient.get("/feedback");
    return unwrap<WireFeedback[]>(res.data).map(nFeedback);
  },

  async create(input: { category: FeedbackCategory; body: string }): Promise<Feedback> {
    const res = await apiClient.post("/feedback", input);
    return nFeedback(unwrap<WireFeedback>(res.data));
  },

  async setStatus(id: string, status: FeedbackStatus): Promise<Feedback> {
    const res = await apiClient.post(`/feedback/${id}/status`, { status });
    return nFeedback(unwrap<WireFeedback>(res.data));
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/feedback/${id}`);
  },
};
