// Typed access to the API Story endpoints (api-spec.md §API Story /stories*).
// The ONLY place that knows the story wire format (snake_case ↔ camelCase).
// Stories live in their own backend collection (like flows) — never embedded in
// the rev-guarded workspace doc. PATCH is a full replace of each field sent.

import { apiClient, unwrap } from "@/lib/api";
import type { Story, StoryStep, StoryStepType } from "@/lib/apiStory";

// ---- Wire shapes (snake_case) --------------------------------------------
interface WireStep {
  id: string;
  type: StoryStepType;
  resource_id: string; // "" for note/section
  text: string;
}
interface WireStory {
  id: string;
  workspace_id?: string;
  name: string;
  steps: WireStep[] | null;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

// ---- Normalizer (wire → domain) ------------------------------------------
const nStep = (s: WireStep): StoryStep => ({
  id: s.id,
  type: s.type,
  resourceId: s.resource_id || undefined,
  text: s.text || undefined,
});

const nStory = (s: WireStory): Story => ({
  id: s.id,
  workspaceId: s.workspace_id,
  name: s.name,
  steps: (s.steps ?? []).map(nStep),
  createdAt: s.created_at ?? new Date().toISOString(),
  createdBy: s.created_by,
  updatedAt: s.updated_at,
  updatedBy: s.updated_by,
});

// ---- Denormalizer (domain → wire) ----------------------------------------
// Steps persist as-is (array order = step order). note/section MUST have an
// empty resource_id (api-spec.md §Story).
function toWireSteps(steps: StoryStep[]): WireStep[] {
  return steps.map((st) => ({
    id: st.id,
    type: st.type,
    resource_id: st.type === "endpoint" ? st.resourceId ?? "" : "",
    text: st.text ?? "",
  }));
}

// ---- API methods ----------------------------------------------------------
export const storyService = {
  async list(): Promise<Story[]> {
    const res = await apiClient.get("/stories");
    return unwrap<WireStory[]>(res.data).map(nStory);
  },

  async create(name: string, steps: StoryStep[] = []): Promise<Story> {
    const res = await apiClient.post("/stories", { name, steps: toWireSteps(steps) });
    return nStory(unwrap<WireStory>(res.data));
  },

  // Full replace of each field sent. Pass only what changed.
  async patch(id: string, patch: { name?: string; steps?: StoryStep[] }): Promise<Story> {
    const body: { name?: string; steps?: WireStep[] } = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.steps !== undefined) body.steps = toWireSteps(patch.steps);
    const res = await apiClient.patch(`/stories/${id}`, body);
    return nStory(unwrap<WireStory>(res.data));
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/stories/${id}`);
  },
};
