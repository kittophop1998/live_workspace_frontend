"use client";

// Per-endpoint workflow status (draft → in progress → testing → done). This is a
// planning/progress attribute distinct from `Resource.state` (the server-derived
// field rollup: draft | ready | breaking). The backend Resource model has no slot
// for it yet (api-spec.md §2), so — like bookmarks and response schemas — it lives
// entirely client-side in localStorage, keyed by resource.id. Hydrated once in
// WorkspaceLayout.

import { create } from "zustand";
import type { EndpointStatus } from "@/lib/types";

const STORAGE_KEY = "live-workspace:endpoint-status";

export const ENDPOINT_STATUSES: EndpointStatus[] = ["draft", "inprogress", "testing", "done"];
export const DEFAULT_ENDPOINT_STATUS: EndpointStatus = "draft";

type ByResource = Record<string, EndpointStatus>;

function load(): ByResource {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ByResource) : {};
  } catch {
    return {};
  }
}

function persist(byResource: ByResource): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(byResource));
  } catch {
    /* quota / serialization — non-fatal for a local convenience cache */
  }
}

interface EndpointStatusState {
  byResource: ByResource;
  hydrate: () => void;
  statusFor: (resourceId: string) => EndpointStatus;
  setStatus: (resourceId: string, status: EndpointStatus) => void;
}

export const useEndpointStatusStore = create<EndpointStatusState>((set, get) => ({
  byResource: {},
  hydrate: () => set({ byResource: load() }),
  statusFor: (resourceId) => get().byResource[resourceId] ?? DEFAULT_ENDPOINT_STATUS,
  setStatus: (resourceId, status) =>
    set((s) => {
      const byResource = { ...s.byResource, [resourceId]: status };
      persist(byResource);
      return { byResource };
    }),
}));
