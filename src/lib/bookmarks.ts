"use client";

// Bookmarked resources (pinned to the top of the explorer). Bookmarks are a
// per-user convenience and have no backend slot (api-spec.md §2), so — like the
// response schemas and schema trees — they live entirely client-side in
// localStorage, keyed by resource.id. Hydrated once in WorkspaceLayout.

import { create } from "zustand";

const STORAGE_KEY = "live-workspace:bookmarks";

function load(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, true>) : {};
  } catch {
    return {};
  }
}

function persist(ids: Record<string, true>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* quota / serialization — non-fatal for a local convenience cache */
  }
}

interface BookmarkState {
  ids: Record<string, true>;
  hydrate: () => void;
  toggle: (resourceId: string) => void;
}

export const useBookmarkStore = create<BookmarkState>((set) => ({
  ids: {},
  hydrate: () => set({ ids: load() }),
  toggle: (resourceId) =>
    set((s) => {
      const ids = { ...s.ids };
      if (ids[resourceId]) delete ids[resourceId];
      else ids[resourceId] = true;
      persist(ids);
      return { ids };
    }),
}));
