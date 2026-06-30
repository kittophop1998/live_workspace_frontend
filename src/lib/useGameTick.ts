"use client";

import { useEffect } from "react";
import { useKingdomStore } from "@/lib/store";

// Local production loop. In production this is replaced by polling GET /game/tick
// (api-spec §3) — the backend is authoritative; this only keeps the mock alive.
const TICK_MS = 3000;

export function useGameTick() {
  const ready = useKingdomStore((s) => s.ready);
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => useKingdomStore.getState().tick(TICK_MS / 1000), TICK_MS);
    return () => clearInterval(id);
  }, [ready]);
}
