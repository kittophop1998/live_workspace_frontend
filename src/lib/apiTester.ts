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
  // Sent as `Authorization: Bearer <token>` when non-empty. Optional so drafts
  // persisted before this field existed still deserialize.
  bearerToken?: string;
}

interface Persisted {
  baseUrl: string;
  drafts: Record<string, RequestDraft>;
  // Workspace-wide auth token, auto-captured from any test response whose body
  // carries `data.accessToken` (the login endpoint). Attached as
  // `Authorization: Bearer <token>` to every request that doesn't set its own.
  authToken: string;
}

function load(): Persisted {
  if (typeof window === "undefined") return { baseUrl: "", drafts: {}, authToken: "" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
    return { baseUrl: parsed.baseUrl ?? "", drafts: parsed.drafts ?? {}, authToken: parsed.authToken ?? "" };
  } catch {
    return { baseUrl: "", drafts: {}, authToken: "" };
  }
}

interface ApiTesterState {
  baseUrl: string;
  drafts: Record<string, RequestDraft>;
  authToken: string;
  hydrate: () => void;
  setBaseUrl: (url: string) => void;
  saveDraft: (resourceId: string, draft: RequestDraft) => void;
  setAuthToken: (token: string) => void;
}

export const useApiTesterStore = create<ApiTesterState>((set, get) => {
  const persist = () => {
    if (typeof window === "undefined") return;
    try {
      const { baseUrl, drafts, authToken } = get();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseUrl, drafts, authToken }));
    } catch {
      /* quota / serialization — non-fatal for a local convenience cache */
    }
  };
  return {
    baseUrl: "",
    drafts: {},
    authToken: "",
    hydrate: () => set(load()),
    setBaseUrl: (url) => {
      set({ baseUrl: url });
      persist();
    },
    saveDraft: (resourceId, draft) => {
      set((s) => ({ drafts: { ...s.drafts, [resourceId]: draft } }));
      persist();
    },
    setAuthToken: (token) => {
      set({ authToken: token });
      persist();
    },
  };
});

// Pull an access token out of a test-response body. The login endpoint always
// returns it at `data.accessToken`; anything else yields null.
export function extractAccessToken(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { data?: { accessToken?: unknown } };
    const token = parsed?.data?.accessToken;
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

// Extract path-parameter names from a templated path: both `{id}` (OpenAPI) and
// `:id` (Express-style) are recognized.
export function extractPathParams(path: string): string[] {
  const names = new Set<string>();
  const re = /\{([a-zA-Z0-9_]+)\}|:([a-zA-Z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path)) !== null) names.add(match[1] ?? match[2]);
  return [...names];
}
