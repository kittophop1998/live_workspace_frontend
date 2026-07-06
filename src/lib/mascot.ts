"use client";

// The API Manga mascot's mood. The corner mascot (AiMascot.tsx) renders a chibi
// + speech bubble driven by this store. Two layers:
//   • a *contextual* mood the mascot derives itself from the workspace (idle /
//     reading / prompting for a first field / panic on apiError), and
//   • a *transient* reaction any component can trigger via `say(...)` — e.g.
//     "proposal created → celebrate" — that overrides the contextual mood for a
//     few seconds, then clears back to contextual.
// This is presentation only: no business logic, no persistence.

import { create } from "zustand";

export type MascotMood =
  | "idle"
  | "reading"
  | "writing"
  | "celebrate"
  | "confetti"
  | "surprised"
  | "panic"
  | "jump";

interface MascotState {
  // Active transient reaction, or null when the mascot should show its
  // contextual mood (derived in the component from the workspace).
  mood: MascotMood | null;
  message: string | null;
  until: number; // epoch ms the transient reaction expires
  say: (mood: MascotMood, message: string, ms?: number) => void;
  clear: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useMascotStore = create<MascotState>((set) => ({
  mood: null,
  message: null,
  until: 0,
  say: (mood, message, ms = 4200) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => set({ mood: null, message: null, until: 0 }), ms);
    set({ mood, message, until: Date.now() + ms });
  },
  clear: () => {
    if (timer) clearTimeout(timer);
    set({ mood: null, message: null, until: 0 });
  },
}));

// Convenience wrapper so callers don't import the hook just to fire a reaction.
export const mascotSay = (mood: MascotMood, message: string, ms?: number) =>
  useMascotStore.getState().say(mood, message, ms);
