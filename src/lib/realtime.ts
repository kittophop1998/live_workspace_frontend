// Real-time layer over the backend WebSocket (api-spec.md §4). Replaces the old
// BroadcastChannel/localStorage sync: the server is now the single source of
// truth and pushes every change here. Handles reconnect + presence heartbeat.

import { streamUrl } from "@/lib/api";
import {
  nActivity,
  nChatMessage,
  nComment,
  nPresence,
  nResource,
  nSnapshot,
  nTaskLog,
} from "@/services/workspace.service";
import type { ActivityEvent, ChatMessage, Comment, Presence, Resource, TaskLog, WorkspaceSnapshot } from "@/lib/types";

export const HEARTBEAT_MS = 3000;
export const PRESENCE_TTL_MS = 8000;
const RECONNECT_MS = 2000;

export function newClientId(): string {
  return `c_${Math.random().toString(36).slice(2, 10)}`;
}

export interface RealtimeHandlers {
  onSnapshot: (snap: WorkspaceSnapshot) => void;
  onResourceUpsert: (rev: number, resource: Resource) => void;
  onResourceDelete: (rev: number, resourceId: string) => void;
  onResourcesCleared: (rev: number, resourceIds: string[]) => void;
  onResourcesImported: (rev: number, resources: Resource[]) => void;
  onCommentUpsert: (rev: number, comment: Comment) => void;
  onCommentDelete: (rev: number, commentId: string) => void;
  onActivity: (event: ActivityEvent) => void;
  onChatMessage: (message: ChatMessage) => void;
  onTaskLog: (entry: TaskLog) => void;
  onTaskLogUpdated: (entry: TaskLog) => void;
  onPresence: (presence: Presence) => void;
  onPresenceLeave: (clientId: string) => void;
  onStatus?: (connected: boolean) => void;
}

export interface RealtimeOptions {
  clientId: string;
  getCollaboratorId: () => string; // "me" id, resolved lazily after /me loads
  handlers: RealtimeHandlers;
}

export interface RealtimeConnection {
  close: () => void;
}

export function connectRealtime(opts: RealtimeOptions): RealtimeConnection {
  const { clientId, getCollaboratorId, handlers } = opts;
  let socket: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const sendHeartbeat = () => {
    const collaboratorId = getCollaboratorId();
    if (!collaboratorId || socket?.readyState !== WebSocket.OPEN) return;
    socket.send(
      JSON.stringify({
        type: "presence.heartbeat",
        payload: { client_id: clientId, collaborator_id: collaboratorId },
      }),
    );
  };

  const dispatch = (type: string, payload: Record<string, unknown>) => {
    const rev = payload.rev as number;
    switch (type) {
      case "snapshot":
        handlers.onSnapshot(nSnapshot(payload as never));
        break;
      case "resource.created":
      case "resource.updated":
      case "field.created":
      case "field.updated":
      case "field.removed":
        handlers.onResourceUpsert(rev, nResource(payload.resource as never));
        break;
      case "resource.deleted":
        handlers.onResourceDelete(rev, payload.resource_id as string);
        break;
      case "resource.cleared":
        handlers.onResourcesCleared(rev, (payload.resource_ids as string[]) ?? []);
        break;
      case "resource.imported":
        handlers.onResourcesImported(
          rev,
          ((payload.resources as unknown[]) ?? []).map((r) => nResource(r as never)),
        );
        break;
      case "comment.created":
        handlers.onCommentUpsert(rev, nComment(payload.comment as never));
        break;
      case "comment.deleted":
        handlers.onCommentDelete(rev, payload.comment_id as string);
        break;
      case "activity.created":
        // Backend nests the event under `activity` (api-spec §4); tolerate a flat
        // payload too so a malformed frame can't white-screen the app.
        handlers.onActivity(nActivity((payload.activity ?? payload) as never));
        break;
      case "chat.created":
        handlers.onChatMessage(nChatMessage(payload.message as never));
        break;
      case "task_log.created":
        handlers.onTaskLog(nTaskLog(payload.task_log as never));
        break;
      case "task_log.updated":
        handlers.onTaskLogUpdated(nTaskLog(payload.task_log as never));
        break;
      case "presence.update":
        handlers.onPresence(nPresence(payload as never));
        break;
      case "presence.leave":
        handlers.onPresenceLeave(payload.client_id as string);
        break;
    }
  };

  const open = () => {
    if (closed || typeof WebSocket === "undefined") return;
    socket = new WebSocket(streamUrl());

    socket.onopen = () => {
      handlers.onStatus?.(true);
      sendHeartbeat();
      heartbeat = setInterval(sendHeartbeat, HEARTBEAT_MS);
    };

    socket.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data) as { type: string; payload: Record<string, unknown> };
        dispatch(frame.type, frame.payload);
      } catch {
        /* ignore malformed frame */
      }
    };

    const onDown = () => {
      handlers.onStatus?.(false);
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      socket = null;
      if (!closed && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          open();
        }, RECONNECT_MS);
      }
    };

    socket.onclose = onDown;
    socket.onerror = () => socket?.close();
  };

  open();

  return {
    close: () => {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "presence.leave", payload: { client_id: clientId } }));
      }
      socket?.close();
    },
  };
}
