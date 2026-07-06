"use client";

// API Story — client-side store of business flows. A Story is an ORDERED list
// of steps; the only "real" step type is an endpoint reference (a resource id),
// plus lightweight annotation steps (notes / section headers). Stories never
// duplicate endpoint data — an endpoint step is just a pointer back to the
// Resource, which stays the single source of truth. No backend slot yet
// (api-spec.md §2) → localStorage, hydrated once in WorkspaceLayout.

import { create } from "zustand";

const STORAGE_KEY = "live-workspace:api-stories";

export type StoryStepType = "endpoint" | "note" | "section";

export interface StoryStep {
  id: string;
  type: StoryStepType;
  resourceId?: string; // type === "endpoint" — pointer to the Resource
  text?: string; // type === "note" | "section", or an optional note on an endpoint step
}

export interface Story {
  id: string;
  name: string;
  steps: StoryStep[];
  createdAt: string; // ISO
}

function uid(prefix: string): string {
  try {
    return `${prefix}_${crypto.randomUUID()}`;
  } catch {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function load(): Story[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Story[]) : [];
  } catch {
    return [];
  }
}

function persist(stories: Story[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  } catch {
    /* quota / serialization — non-fatal for a local convenience cache */
  }
}

interface ApiStoryState {
  stories: Story[];
  // Which story the Story view has open (UI-only, not persisted).
  selectedId: string | null;
  select: (storyId: string | null) => void;
  hydrate: () => void;
  createStory: (name?: string) => string; // returns new story id
  renameStory: (storyId: string, name: string) => void;
  deleteStory: (storyId: string) => void;
  duplicateStory: (storyId: string) => string | null;
  addStep: (storyId: string, step: Omit<StoryStep, "id">, atIndex?: number) => void;
  updateStep: (storyId: string, stepId: string, patch: Partial<Omit<StoryStep, "id">>) => void;
  removeStep: (storyId: string, stepId: string) => void;
  // Move a step by delta (-1 up, +1 down) — clamped to bounds.
  moveStep: (storyId: string, stepId: string, delta: number) => void;
}

function withStory(stories: Story[], storyId: string, fn: (s: Story) => Story): Story[] {
  return stories.map((s) => (s.id === storyId ? fn(s) : s));
}

export const useApiStoryStore = create<ApiStoryState>((set, get) => {
  const commit = (stories: Story[]) => {
    persist(stories);
    set({ stories });
  };
  return {
    stories: [],
    selectedId: null,

    select: (storyId) => set({ selectedId: storyId }),

    hydrate: () => set({ stories: load() }),

    createStory: (name) => {
      const id = uid("story");
      const story: Story = {
        id,
        name: name?.trim() || "Untitled Flow",
        steps: [],
        createdAt: new Date().toISOString(),
      };
      commit([story, ...get().stories]);
      set({ selectedId: id });
      return id;
    },

    renameStory: (storyId, name) =>
      commit(withStory(get().stories, storyId, (s) => ({ ...s, name: name.trim() || s.name }))),

    deleteStory: (storyId) => {
      commit(get().stories.filter((s) => s.id !== storyId));
      if (get().selectedId === storyId) set({ selectedId: null });
    },

    duplicateStory: (storyId) => {
      const src = get().stories.find((s) => s.id === storyId);
      if (!src) return null;
      const id = uid("story");
      const copy: Story = {
        id,
        name: `${src.name} (copy)`,
        createdAt: new Date().toISOString(),
        steps: src.steps.map((st) => ({ ...st, id: uid("step") })),
      };
      commit([copy, ...get().stories]);
      return id;
    },

    addStep: (storyId, step, atIndex) =>
      commit(
        withStory(get().stories, storyId, (s) => {
          const next = [...s.steps];
          const entry: StoryStep = { ...step, id: uid("step") };
          if (atIndex === undefined || atIndex < 0 || atIndex > next.length) next.push(entry);
          else next.splice(atIndex, 0, entry);
          return { ...s, steps: next };
        }),
      ),

    updateStep: (storyId, stepId, patch) =>
      commit(
        withStory(get().stories, storyId, (s) => ({
          ...s,
          steps: s.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)),
        })),
      ),

    removeStep: (storyId, stepId) =>
      commit(
        withStory(get().stories, storyId, (s) => ({
          ...s,
          steps: s.steps.filter((st) => st.id !== stepId),
        })),
      ),

    moveStep: (storyId, stepId, delta) =>
      commit(
        withStory(get().stories, storyId, (s) => {
          const i = s.steps.findIndex((st) => st.id === stepId);
          if (i < 0) return s;
          const j = i + delta;
          if (j < 0 || j >= s.steps.length) return s;
          const next = [...s.steps];
          [next[i], next[j]] = [next[j], next[i]];
          return { ...s, steps: next };
        }),
      ),
  };
});

// Stories that reference a given endpoint (for the endpoint page's "Used in
// Stories" panel). Pure so components can memoize against the raw stories array.
export function storiesForResource(stories: Story[], resourceId: string): Story[] {
  return stories.filter((s) => s.steps.some((st) => st.type === "endpoint" && st.resourceId === resourceId));
}
