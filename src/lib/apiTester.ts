"use client";

// Per-endpoint "Try it" request drafts + a shared target base URL. Like response
// schemas / bookmarks / schema trees, the tester is a client-side helper with no
// backend slot, so drafts persist in localStorage keyed by resource.id. The
// actual request is sent through the backend proxy (POST /http/test) — see
// src/services/testerService.ts. Hydrated once in WorkspaceLayout.

import { create } from "zustand";
import type { HttpMethod } from "@/lib/types";

const STORAGE_KEY = "live-workspace:api-tests";

// A toggleable key/value row (path param, query param, or header).
export interface KeyValueRow {
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestDraft {
  method: HttpMethod;
  path: string;
  pathParams: KeyValueRow[];
  queryParams: KeyValueRow[];
  headers: KeyValueRow[];
  body: string;
}

interface Persisted {
  baseUrl: string;
  drafts: Record<string, RequestDraft>;
}

function load(): Persisted {
  if (typeof window === "undefined") return { baseUrl: "", drafts: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
    return { baseUrl: parsed.baseUrl ?? "", drafts: parsed.drafts ?? {} };
  } catch {
    return { baseUrl: "", drafts: {} };
  }
}

interface ApiTesterState {
  baseUrl: string;
  drafts: Record<string, RequestDraft>;
  hydrate: () => void;
  setBaseUrl: (url: string) => void;
  saveDraft: (resourceId: string, draft: RequestDraft) => void;
}

export const useApiTesterStore = create<ApiTesterState>((set, get) => {
  const persist = () => {
    if (typeof window === "undefined") return;
    try {
      const { baseUrl, drafts } = get();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseUrl, drafts }));
    } catch {
      /* quota / serialization — non-fatal for a local convenience cache */
    }
  };
  return {
    baseUrl: "",
    drafts: {},
    hydrate: () => set(load()),
    setBaseUrl: (url) => {
      set({ baseUrl: url });
      persist();
    },
    saveDraft: (resourceId, draft) => {
      set((s) => ({ drafts: { ...s.drafts, [resourceId]: draft } }));
      persist();
    },
  };
});

// Extract path-parameter names from a templated path: both `{id}` (OpenAPI) and
// `:id` (Express-style) are recognized.
export function extractPathParams(path: string): string[] {
  const names = new Set<string>();
  const re = /\{([a-zA-Z0-9_]+)\}|:([a-zA-Z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path)) !== null) names.add(match[1] ?? match[2]);
  return [...names];
}
