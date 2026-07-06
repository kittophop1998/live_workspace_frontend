"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { Box, Typography } from "@mui/material";
import { Confetti, ChibiRobot, DoodleStar } from "@/components/doodles";
import { SpeechBubble } from "@/components/common";
import { ink, line } from "@/components/theme";

// A tiny one-shot signal: ProposalReview fires it on a successful merge; the
// overlay host (mounted once in WorkspaceLayout) plays the animation.
interface MergeCelebrationState {
  open: boolean;
  title: string;
  fire: (title: string) => void;
  close: () => void;
}
export const useMergeCelebration = create<MergeCelebrationState>((set) => ({
  open: false,
  title: "",
  fire: (title) => set({ open: true, title }),
  close: () => set({ open: false }),
}));

// Full-screen merge moment: confetti rains, the notebook page closes over the
// content, and a mascot celebrates. Auto-dismisses after ~1.9s.
export function MergeCelebration() {
  const open = useMergeCelebration((s) => s.open);
  const title = useMergeCelebration((s) => s.title);
  const close = useMergeCelebration((s) => s.close);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(close, 1900);
    return () => clearTimeout(id);
  }, [open, close]);

  if (!open) return null;

  return (
    <Box
      onClick={close}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(74,63,53,0.28)",
        backdropFilter: "blur(2px)",
        animation: "overlay-fade .2s ease",
      }}
    >
      <Confetti count={26} />
      <Box
        sx={{
          position: "relative",
          width: 320,
          maxWidth: "88vw",
          bgcolor: "#FFFDF8",
          border: `1.5px solid ${line}`,
          borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(120,88,44,0.28)",
          p: 4,
          textAlign: "center",
          animation: "page-close 1.9s ease forwards",
        }}
      >
        <Box className="mascot-jump" sx={{ display: "inline-block", position: "relative" }}>
          <ChibiRobot size={92} />
          <DoodleStar size={18} style={{ position: "absolute", top: -6, left: -10 }} className="animate-twinkle" />
          <DoodleStar size={14} color="#F5799F" style={{ position: "absolute", top: 6, right: -12 }} className="animate-twinkle" />
        </Box>
        <Typography variant="h2" className="font-hand" sx={{ fontSize: 22, mt: 1.5, color: ink }}>
          Merged! 🎉
        </Typography>
        <SpeechBubble color="mint" tail="none" sx={{ mt: 1.5, display: "inline-block" }}>
          Everyone can use the new API now!
        </SpeechBubble>
        {title ? (
          <Typography sx={{ fontSize: 12.5, color: "#9A8A76", mt: 1.25 }}>“{title}”</Typography>
        ) : null}
      </Box>
    </Box>
  );
}
