// Pure-frontend real-time layer. No backend: the shared document lives in
// localStorage (durable) and is broadcast to other open tabs over BroadcastChannel
// (instant). Presence is a heartbeat each tab emits so we know who is "online".

import type { Presence, WorkspaceDoc } from "@/lib/types";

const DOC_KEY = "live-workspace:doc";
const CHANNEL = "live-workspace";

type DocMessage = { kind: "doc"; doc: WorkspaceDoc };
type PresenceMessage = { kind: "presence"; presence: Presence };
type PresenceLeaveMessage = { kind: "leave"; clientId: string };
type HelloMessage = { kind: "hello" }; // new tab asking others to re-announce
export type SyncMessage = DocMessage | PresenceMessage | PresenceLeaveMessage | HelloMessage;

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL);
  return channel;
}

export function loadDoc(): WorkspaceDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DOC_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceDoc) : null;
  } catch {
    return null;
  }
}

export function persistDoc(doc: WorkspaceDoc): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DOC_KEY, JSON.stringify(doc));
  } catch {
    /* quota / disabled storage — broadcast still works in-session */
  }
}

export function broadcastDoc(doc: WorkspaceDoc): void {
  getChannel()?.postMessage({ kind: "doc", doc } satisfies SyncMessage);
}

export function broadcastPresence(presence: Presence): void {
  getChannel()?.postMessage({ kind: "presence", presence } satisfies SyncMessage);
}

export function broadcastLeave(clientId: string): void {
  getChannel()?.postMessage({ kind: "leave", clientId } satisfies SyncMessage);
}

export function broadcastHello(): void {
  getChannel()?.postMessage({ kind: "hello" } satisfies SyncMessage);
}

export function subscribe(handler: (msg: SyncMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (e: MessageEvent<SyncMessage>) => handler(e.data);
  ch.addEventListener("message", listener);
  return () => ch.removeEventListener("message", listener);
}

export const PRESENCE_TTL_MS = 8000;
export const HEARTBEAT_MS = 3000;

export function newClientId(): string {
  return `c_${Math.random().toString(36).slice(2, 10)}`;
}
