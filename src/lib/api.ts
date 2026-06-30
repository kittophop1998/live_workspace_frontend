import axios from "axios";

// api-spec.md §1: all endpoints live under `/api/v1`. The env var may be the bare
// host, so normalize it to always include the prefix.
const API_VERSION_PREFIX = "/api/v1";

function resolveBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");
  return raw.endsWith(API_VERSION_PREFIX) ? raw : `${raw}${API_VERSION_PREFIX}`;
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "kingdom_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Standard envelope { success, message, data } → unwrap to `data`.
export type ApiEnvelope<T> = { success: boolean; message: string; data: T };

export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

// Endpoint map — kept 1:1 with api-spec.md §3. The MVP service reads from mock
// data; these are the paths the live Go backend will serve.
export const endpoints = {
  kingdom: "/kingdom",
  resources: "/kingdom/resources",
  tick: "/game/tick",
  collectOffline: "/game/collect-offline",
  citizens: "/citizens",
  assignCitizen: (id: string) => `/citizens/${id}/assign`,
  bulkAssign: "/citizens/bulk-assign",
  buildings: "/buildings",
  upgradeBuilding: (id: string) => `/buildings/${id}/upgrade`,
  tasks: "/tasks",
  logs: "/logs?limit=50",
  events: "/events",
  resolveEvent: (id: string) => `/events/${id}/resolve`,
  policies: "/policies",
  policy: (id: string) => `/policies/${id}`,
};
