"use client";

// API Story — ordered business flows that POINT at existing endpoint Resources.
// A Story is an ORDERED list of steps; the only "real" step type is an endpoint
// reference (a resource id), plus lightweight annotation steps (notes / section
// headers). Stories never duplicate endpoint data — an endpoint step is just a
// pointer back to the Resource (single source of truth).
//
// Persisted in the backend `stories` collection (api-spec.md §API Story). Like
// flows, stories are NOT embedded in the rev-guarded workspace doc.
//
// EDIT MODEL — draft then save: every mutation edits an in-memory DRAFT and
// marks the story `dirty`. Nothing hits the backend until `saveStory` runs,
// which sends the WHOLE story in ONE request (POST for a never-saved story,
// PATCH for an existing one). Drafts live only in memory — a refresh before
// Save discards unsaved changes.

import { create } from "zustand";
import { apiErrorMessage } from "@/lib/api";
import { useWorkspaceStore } from "@/lib/store";
import { storyService } from "@/services/storyService";

export type StoryStepType = "endpoint" | "note" | "section";

export interface StoryStep {
  id: string;
  type: StoryStepType;
  resourceId?: string; // type === "endpoint" — pointer to the Resource
  text?: string; // type === "note" | "section", or an optional note on an endpoint step
}

export interface Story {
  id: string;
  workspaceId?: string;
  name: string;
  steps: StoryStep[];
  createdAt: string; // ISO
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

function uid(prefix: string): string {
  try {
    return `${prefix}_${crypto.randomUUID()}`;
  } catch {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function reportError(err: unknown): void {
  useWorkspaceStore.getState().setApiError(apiErrorMessage(err));
}

// Drop a key from a Record immutably.
function omit(rec: Record<string, boolean>, key: string): Record<string, boolean> {
  const rest = { ...rec };
  delete rest[key];
  return rest;
}

interface ApiStoryState {
  stories: Story[];
  // Which story the Story view has open (UI-only, not persisted).
  selectedId: string | null;
  // storyId → has local edits not yet saved to the backend.
  dirty: Record<string, boolean>;
  // storyId → never persisted (created locally, awaiting its first save).
  unsaved: Record<string, boolean>;
  // storyId → a save request is in flight.
  saving: Record<string, boolean>;
  select: (storyId: string | null) => void;
  hydrate: () => void;
  createStory: (name?: string) => string; // returns the (local) story id
  renameStory: (storyId: string, name: string) => void;
  deleteStory: (storyId: string) => void;
  duplicateStory: (storyId: string) => string | null;
  addStep: (storyId: string, step: Omit<StoryStep, "id">, atIndex?: number) => void;
  updateStep: (storyId: string, stepId: string, patch: Partial<Omit<StoryStep, "id">>) => void;
  removeStep: (storyId: string, stepId: string) => void;
  // Move a step by delta (-1 up, +1 down) — clamped to bounds.
  moveStep: (storyId: string, stepId: string, delta: number) => void;
  // Persist the whole story in one request (POST if new, else PATCH).
  saveStory: (storyId: string) => void;
}

function withStory(stories: Story[], storyId: string, fn: (s: Story) => Story): Story[] {
  return stories.map((s) => (s.id === storyId ? fn(s) : s));
}

export const useApiStoryStore = create<ApiStoryState>((set, get) => {
  // Apply a local edit to the draft and mark it dirty. No backend I/O.
  const mutateLocal = (storyId: string, fn: (s: Story) => Story) =>
    set((st) => ({
      stories: withStory(st.stories, storyId, fn),
      dirty: { ...st.dirty, [storyId]: true },
    }));

  // Insert a brand-new local story (dirty + unsaved until first save).
  const insertDraft = (story: Story) =>
    set((st) => ({
      stories: [story, ...st.stories],
      selectedId: story.id,
      dirty: { ...st.dirty, [story.id]: true },
      unsaved: { ...st.unsaved, [story.id]: true },
    }));

  return {
    stories: [],
    selectedId: null,
    dirty: {},
    unsaved: {},
    saving: {},

    select: (storyId) => set({ selectedId: storyId }),

    hydrate: () => {
      void storyService
        .list()
        .then((stories) => set({ stories, dirty: {}, unsaved: {}, saving: {} }))
        .catch((err) => reportError(err));
    },

    createStory: (name) => {
      const id = uid("story");
      insertDraft({
        id,
        name: name?.trim() || "Untitled Flow",
        steps: [],
        createdAt: new Date().toISOString(),
      });
      return id;
    },

    renameStory: (storyId, name) =>
      mutateLocal(storyId, (s) => ({ ...s, name: name.trim() || s.name })),

    deleteStory: (storyId) => {
      const wasUnsaved = !!get().unsaved[storyId];
      const prev = get().stories;
      set((st) => ({
        stories: st.stories.filter((s) => s.id !== storyId),
        selectedId: st.selectedId === storyId ? null : st.selectedId,
        dirty: omit(st.dirty, storyId),
        unsaved: omit(st.unsaved, storyId),
        saving: omit(st.saving, storyId),
      }));
      // Never-saved drafts have no backend row to delete.
      if (wasUnsaved) return;
      void storyService.remove(storyId).catch((err) => {
        set({ stories: prev });
        reportError(err);
      });
    },

    duplicateStory: (storyId) => {
      const src = get().stories.find((s) => s.id === storyId);
      if (!src) return null;
      const id = uid("story");
      insertDraft({
        id,
        name: `${src.name} (copy)`,
        createdAt: new Date().toISOString(),
        steps: src.steps.map((st) => ({ ...st, id: uid("step") })),
      });
      return id;
    },

    addStep: (storyId, step, atIndex) =>
      mutateLocal(storyId, (s) => {
        const next = [...s.steps];
        const entry: StoryStep = { ...step, id: uid("step") };
        if (atIndex === undefined || atIndex < 0 || atIndex > next.length) next.push(entry);
        else next.splice(atIndex, 0, entry);
        return { ...s, steps: next };
      }),

    updateStep: (storyId, stepId, patch) =>
      mutateLocal(storyId, (s) => ({
        ...s,
        steps: s.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)),
      })),

    removeStep: (storyId, stepId) =>
      mutateLocal(storyId, (s) => ({
        ...s,
        steps: s.steps.filter((st) => st.id !== stepId),
      })),

    moveStep: (storyId, stepId, delta) =>
      mutateLocal(storyId, (s) => {
        const i = s.steps.findIndex((st) => st.id === stepId);
        if (i < 0) return s;
        const j = i + delta;
        if (j < 0 || j >= s.steps.length) return s;
        const next = [...s.steps];
        [next[i], next[j]] = [next[j], next[i]];
        return { ...s, steps: next };
      }),

    saveStory: (storyId) => {
      const st = get();
      const story = st.stories.find((s) => s.id === storyId);
      if (!story || st.saving[storyId]) return;
      const isNew = !!st.unsaved[storyId];
      set((s) => ({ saving: { ...s.saving, [storyId]: true } }));
      const req = isNew
        ? storyService.create(story.name, story.steps)
        : storyService.patch(storyId, { name: story.name, steps: story.steps });
      void req
        .then((saved) =>
          set((s) => ({
            // A new story swaps its temp id for the server-assigned one.
            stories: s.stories.map((x) => (x.id === storyId ? saved : x)),
            selectedId: s.selectedId === storyId ? saved.id : s.selectedId,
            dirty: omit(s.dirty, storyId),
            unsaved: omit(s.unsaved, storyId),
            saving: omit(s.saving, storyId),
          })),
        )
        .catch((err) => {
          set((s) => ({ saving: omit(s.saving, storyId) }));
          reportError(err);
        });
    },
  };
});

// Stories that reference a given endpoint (for the endpoint page's "Used in
// Stories" panel). Pure so components can memoize against the raw stories array.
export function storiesForResource(stories: Story[], resourceId: string): Story[] {
  return stories.filter((s) => s.steps.some((st) => st.type === "endpoint" && st.resourceId === resourceId));
}
