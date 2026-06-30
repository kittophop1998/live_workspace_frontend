"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { connectRealtime, HEARTBEAT_MS, newClientId } from "@/lib/realtime";
import { apiErrorMessage } from "@/lib/api";
import { workspaceApi } from "@/services/workspace.service";

// Boot the workspace: hydrate from the backend (REST), then keep it live over
// the WebSocket. The server is the single source of truth — every change (ours
// or a teammate's) arrives back through the stream.
export function useWorkspaceSync(): void {
  useEffect(() => {
    const store = useWorkspaceStore.getState();
    const clientId = newClientId();
    let cancelled = false;

    // 1. Initial hydrate (snapshot + my identity).
    (async () => {
      try {
        const [snapshot, me] = await Promise.all([
          workspaceApi.getSnapshot(),
          workspaceApi.getMe(),
        ]);
        if (cancelled) return;
        store.applySnapshot(snapshot);
        store.setMe(me);
        store.setApiError(null);
      } catch (err) {
        if (!cancelled) store.setApiError(apiErrorMessage(err));
      }
    })();

    // 2. Live stream — presence + every mutation, merged by rev.
    const connection = connectRealtime({
      clientId,
      getCollaboratorId: () => useWorkspaceStore.getState().me?.id ?? "",
      handlers: {
        onSnapshot: (snap) => useWorkspaceStore.getState().applySnapshot(snap),
        onResourceUpsert: (rev, resource) =>
          useWorkspaceStore.getState().upsertResource(rev, resource, true),
        onResourceDelete: (rev, id) => useWorkspaceStore.getState().removeResource(rev, id, true),
        onCommentUpsert: (rev, comment) =>
          useWorkspaceStore.getState().upsertComment(rev, comment, true),
        onCommentDelete: (rev, id) => useWorkspaceStore.getState().removeComment(rev, id, true),
        onActivity: (event) => useWorkspaceStore.getState().pushActivity(event),
        onPresence: (presence) => useWorkspaceStore.getState().upsertPresence(presence),
        onPresenceLeave: (id) => useWorkspaceStore.getState().dropPresence(id),
      },
    });

    // 3. Prune stale presence beacons locally (the server prunes too).
    const prune = setInterval(() => useWorkspaceStore.getState().prunePresences(), HEARTBEAT_MS);

    return () => {
      cancelled = true;
      connection.close();
      clearInterval(prune);
    };
  }, []);
}
