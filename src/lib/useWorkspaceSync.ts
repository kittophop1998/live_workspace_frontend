"use client";

import { useEffect, useRef } from "react";
import { SEED_COLLABORATORS } from "@/data/mock";
import { useWorkspaceStore } from "@/lib/store";
import {
  HEARTBEAT_MS,
  broadcastHello,
  broadcastLeave,
  broadcastPresence,
  newClientId,
  subscribe,
} from "@/lib/sync";
import type { Collaborator } from "@/lib/types";

const ME_KEY = "live-workspace:me";

// Each browser tab adopts a stable collaborator identity (persisted per-tab in
// sessionStorage) so opening a second tab simulates a second teammate joining.
function resolveMe(): Collaborator {
  if (typeof window !== "undefined") {
    const saved = window.sessionStorage.getItem(ME_KEY);
    if (saved) {
      const found = SEED_COLLABORATORS.find((c) => c.id === saved);
      if (found) return found;
    }
  }
  const pick = SEED_COLLABORATORS[Math.floor(Math.random() * SEED_COLLABORATORS.length)];
  if (typeof window !== "undefined") window.sessionStorage.setItem(ME_KEY, pick.id);
  return pick;
}

export function useWorkspaceSync(): void {
  const clientIdRef = useRef<string>("");

  useEffect(() => {
    const store = useWorkspaceStore.getState();
    const clientId = newClientId();
    clientIdRef.current = clientId;

    // 1. Load any persisted doc, adopt an identity.
    store.hydrate();
    const me = resolveMe();
    store.setMe(me);

    // 2. Subscribe to cross-tab messages.
    const unsub = subscribe((msg) => {
      const s = useWorkspaceStore.getState();
      if (msg.kind === "doc") s.applyRemoteDoc(msg.doc);
      else if (msg.kind === "presence") s.upsertPresence(msg.presence);
      else if (msg.kind === "leave") s.dropPresence(msg.clientId);
      else if (msg.kind === "hello") heartbeat(); // re-announce to the newcomer
    });

    const heartbeat = () => {
      const beacon = { clientId, collaboratorId: me.id, ts: Date.now() };
      useWorkspaceStore.getState().upsertPresence(beacon); // include self
      broadcastPresence(beacon);
    };

    // 3. Announce arrival + start heartbeat / prune loops.
    heartbeat();
    broadcastHello();
    const beat = setInterval(heartbeat, HEARTBEAT_MS);
    const prune = setInterval(() => useWorkspaceStore.getState().prunePresences(), HEARTBEAT_MS);

    // 4. Pick up writes from other tabs of the SAME app via the storage event
    //    (covers browsers without BroadcastChannel).
    const onStorage = (e: StorageEvent) => {
      if (e.key === "live-workspace:doc") useWorkspaceStore.getState().hydrate();
    };
    window.addEventListener("storage", onStorage);

    const onUnload = () => broadcastLeave(clientId);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      unsub();
      clearInterval(beat);
      clearInterval(prune);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("beforeunload", onUnload);
      broadcastLeave(clientId);
    };
  }, []);
}
