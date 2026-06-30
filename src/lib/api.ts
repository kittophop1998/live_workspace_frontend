import axios, { type AxiosInstance } from "axios";

// Live Workspace talks to the Go backend (see ../backend, api-spec.md). REST for
// reads/mutations, a WebSocket (/stream) for real-time. Both share this base URL.
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const TOKEN_KEY = "live-workspace:token";
const ROOM_KEY = "live-workspace:room";

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}

export function getRoomCode(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ROOM_KEY) ?? "";
}

export function setRoomCode(code: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(ROOM_KEY, code);
}

// Clear room session (token + code) — used on sign out.
export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROOM_KEY);
}

// Primary client against our own backend. Bearer token is optional in dev
// (empty JWT_SECRET on the server resolves a fixed collaborator).
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response envelope: { success, message, data }. unwrap returns `data`.
interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  error?: { code: string; details?: unknown };
}

export function unwrap<T>(payload: Envelope<T>): T {
  return payload.data;
}

// Turn an axios/server error into a human message for the store's apiError.
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const env = err.response?.data as Envelope<unknown> | undefined;
    if (env?.message) return env.message;
    return err.message;
  }
  return err instanceof Error ? err.message : "Unknown error";
}

// ws(s)://host/api/v1/stream — derived from BASE_URL, token passed as query
// (browsers can't set WS headers).
export function streamUrl(): string {
  const base = BASE_URL.replace(/^http/, "ws") + "/stream";
  const token = getToken();
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

// --- Outgoing integration (unchanged) -------------------------------------
// Optional webhook export — unrelated to the backend, used by CodeExport to
// POST a generated schema/mock to Slack/n8n/a mock server.
export const httpClient: AxiosInstance = axios.create({
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL ?? "";

export interface WebhookResult {
  ok: boolean;
  message: string;
}

export async function pushToWebhook(payload: unknown): Promise<WebhookResult> {
  if (!WEBHOOK_URL) {
    await new Promise((r) => setTimeout(r, 450));
    return { ok: true, message: "Simulated: set NEXT_PUBLIC_WEBHOOK_URL to POST for real." };
  }
  try {
    const res = await httpClient.post(WEBHOOK_URL, payload);
    return { ok: true, message: `Sent — ${res.status} ${res.statusText}` };
  } catch (err) {
    return { ok: false, message: apiErrorMessage(err) };
  }
}
