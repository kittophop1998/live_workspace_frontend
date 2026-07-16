"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar, relativeTime, useNow } from "@/components/common";
import { kindStyle } from "@/components/TaskUpdates";
import { blueSoft, ink, line, pastelInk, secondaryText } from "@/components/theme";
import { DoodleStar } from "@/components/doodles";
import type { TaskLog } from "@/lib/types";

// A teammate posted a backend update — announce it front and centre so it can't
// be missed while you're heads-down in the editor. Fired from useWorkspaceSync
// for *remote* task logs only (your own posts never announce: you just wrote it).
//
// Entries queue rather than replace: the overlay stays until dismissed (no
// auto-timeout), so an update landing while it's open must wait its turn
// instead of overwriting the one being read.
interface TaskUpdateAnnouncementState {
  queue: TaskLog[];
  announce: (entry: TaskLog) => void;
  dismiss: () => void;
  dismissAll: () => void;
}

export const useTaskUpdateAnnouncer = create<TaskUpdateAnnouncementState>((set) => ({
  queue: [],
  announce: (entry) =>
    set((s) => (s.queue.some((t) => t.id === entry.id) ? {} : { queue: [...s.queue, entry] })),
  dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
  dismissAll: () => set({ queue: [] }),
}));

// Imperative entry point for the sync layer (outside React).
export const announceTaskUpdate = (entry: TaskLog) =>
  useTaskUpdateAnnouncer.getState().announce(entry);

export function TaskUpdateAnnouncement() {
  const queue = useTaskUpdateAnnouncer((s) => s.queue);
  const dismiss = useTaskUpdateAnnouncer((s) => s.dismiss);
  const dismissAll = useTaskUpdateAnnouncer((s) => s.dismissAll);
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  const resources = useWorkspaceStore((s) => s.resources);
  const setRightTab = useWorkspaceStore((s) => s.setRightTab);
  const setView = useWorkspaceStore((s) => s.setView);
  useNow();

  const entry = queue[0];

  // Esc dismisses the current announcement, matching the backdrop click.
  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, dismiss]);

  if (!entry) return null;

  const ks = kindStyle[entry.kind] ?? kindStyle.note;
  const author = collaborators.find((c) => c.id === entry.authorId);
  const linked = entry.resourceId ? resources.find((r) => r.id === entry.resourceId)?.name : undefined;
  const remaining = queue.length - 1;

  // Jump to the full feed — the panel only exists in the workspace view, so
  // leave flows/story on the way there.
  const openUpdates = () => {
    setView("workspace");
    setRightTab("updates");
    dismissAll();
  };

  return (
    <Box
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label="New backend update"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "rgba(74,63,53,0.34)",
        backdropFilter: "blur(3px)",
        animation: "overlay-fade .2s ease",
      }}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: "relative",
          width: 460,
          maxWidth: "92vw",
          bgcolor: "#FFFDF8",
          border: `1.5px solid ${line}`,
          borderTop: `6px solid ${ks.fg}`,
          borderRadius: "18px",
          boxShadow: "0 20px 60px rgba(120,88,44,0.3)",
          p: 3,
          animation: "sticker-pop .32s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <DoodleStar size={18} className="animate-twinkle" style={{ position: "absolute", top: -9, left: 18 }} />
        <DoodleStar
          size={13}
          color="#F5799F"
          className="animate-twinkle"
          style={{ position: "absolute", top: 6, right: 42 }}
        />

        <Box
          role="button"
          aria-label="Dismiss"
          onClick={dismiss}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            p: 0.5,
            borderRadius: "50%",
            color: "#B8C1CD",
            cursor: "pointer",
            transition: "color .12s ease, background-color .12s ease",
            "&:hover": { color: ink, bgcolor: "#F3EEE2" },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </Box>

        {/* Banner headline — the "big sign" this popup exists to be. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center", mb: 2 }}>
          <CampaignRoundedIcon sx={{ fontSize: 26, color: ks.fg }} />
          <Typography
            variant="h2"
            className="font-hand"
            sx={{ fontSize: 26, color: ink, textAlign: "center", lineHeight: 1.2 }}
          >
            New backend update!
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.25, flexWrap: "wrap", gap: 0.75 }}>
          <Chip
            label={ks.label}
            sx={{
              height: 26,
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              bgcolor: ks.bg,
              color: ks.fg,
            }}
          />
          <Avatar name={entry.author} color={author?.color ?? "#94A3B8"} size={24} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: ink }}>{entry.author}</Typography>
          <Typography sx={{ fontSize: 11.5, color: "#B8C1CD", ml: "auto", pl: 1 }}>
            {relativeTime(entry.at)}
          </Typography>
        </Stack>

        <Typography
          sx={{
            fontSize: 16,
            lineHeight: 1.6,
            color: ink,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "38vh",
            overflowY: "auto",
          }}
        >
          {entry.body}
        </Typography>

        {entry.resourceId && (
          <Chip
            size="small"
            label={linked ?? "(deleted resource)"}
            sx={{
              mt: 1.5,
              height: 22,
              fontSize: 11.5,
              fontWeight: 700,
              bgcolor: blueSoft,
              color: pastelInk.purple,
              fontStyle: linked ? "normal" : "italic",
            }}
          />
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2.5, alignItems: "center" }}>
          {remaining > 0 && (
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: secondaryText }}>
              +{remaining} more update{remaining > 1 ? "s" : ""}
            </Typography>
          )}
          <Button size="small" onClick={openUpdates} sx={{ ml: "auto", fontSize: 12.5 }}>
            Open Updates
          </Button>
          <Button variant="contained" size="small" onClick={dismiss} sx={{ fontSize: 12.5, px: 2 }}>
            {remaining > 0 ? "Next" : "Got it"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
