"use client";

import { useMemo, useState } from "react";
import { Box, Collapse, Stack, Typography } from "@mui/material";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import { useWorkspaceStore, selectSelected } from "@/lib/store";
import { useMascotStore, type MascotMood } from "@/lib/mascot";
import { CHIBI, Confetti, DoodleSparkle, type ChibiName } from "@/components/doodles";
import { SpeechBubble, type PastelName } from "@/components/common";
import { ink, pastel } from "@/components/theme";

// How each mood renders: which chibi, which animation class, and the bubble tint.
const MOOD_STYLE: Record<MascotMood, { chibi: ChibiName; anim: string; color: PastelName; confetti?: boolean }> = {
  idle: { chibi: "robot", anim: "animate-float", color: "blue" },
  reading: { chibi: "reader", anim: "animate-float", color: "blue" },
  writing: { chibi: "robot", anim: "animate-float", color: "blue" },
  celebrate: { chibi: "robot", anim: "mascot-celebrate", color: "pink" },
  confetti: { chibi: "robot", anim: "mascot-celebrate", color: "mint", confetti: true },
  surprised: { chibi: "ghost", anim: "animate-float", color: "yellow" },
  panic: { chibi: "ghost", anim: "mascot-panic", color: "pink", confetti: false },
  jump: { chibi: "robot", anim: "mascot-jump", color: "mint", confetti: true },
};

interface MascotView {
  mood: MascotMood;
  message: string;
}

function openProposals() {
  window.dispatchEvent(new CustomEvent("kingdom:open-proposals"));
}

// The friendly API-manga assistant. Naps in the corner and reacts to workspace
// events (proposal created/merged, API errors, empty schemas) with a chibi +
// speech bubble.
export function AiMascot() {
  const transientMood = useMascotStore((s) => s.mood);
  const transientMessage = useMascotStore((s) => s.message);
  const apiError = useWorkspaceStore((s) => s.apiError);
  const resource = useWorkspaceStore(selectSelected);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Transient reactions (say(...)) win; otherwise derive a contextual mood.
  const view: MascotView = useMemo(() => {
    if (transientMood) return { mood: transientMood, message: transientMessage ?? "" };
    if (apiError) return { mood: "panic", message: "This endpoint seems broken — check the last action." };
    if (resource && resource.kind === "endpoint" && resource.fields.length === 0)
      return { mood: "reading", message: "Waiting for your first parameter — let's build this endpoint together!" };
    return { mood: "idle", message: "All quiet — your API looks happy ✨" };
  }, [transientMood, transientMessage, apiError, resource]);

  const style = MOOD_STYLE[view.mood];
  const Chibi = CHIBI[style.chibi];
  const showBubble = open || hovered || Boolean(transientMood);
  const isEndpoint = resource?.kind === "endpoint";

  const actions = [
    { icon: <RateReviewOutlinedIcon sx={{ fontSize: 16 }} />, label: "Review proposals", onClick: openProposals, show: isEndpoint },
  ].filter((a) => a.show);

  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 14, sm: 22 },
        bottom: { xs: 14, sm: 22 },
        zIndex: 1200,
        display: { xs: "none", sm: "flex" },
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
        pointerEvents: "none",
      }}
    >
      <Collapse in={showBubble} timeout={220} unmountOnExit>
        <Box sx={{ pointerEvents: "auto", maxWidth: 250 }}>
          <SpeechBubble color={style.color} tail="none" sx={{ mb: open ? 1 : 0, display: "block" }}>
            {view.message}
          </SpeechBubble>
          {/* Action menu — only when poked, and only where it makes sense */}
          <Collapse in={open && actions.length > 0} timeout={200} unmountOnExit>
            <Box sx={{ mt: 1, p: 0.75, bgcolor: "#FFFDF8", border: `1.5px solid ${pastel.pink}`, borderRadius: "16px", boxShadow: "0 8px 22px rgba(120,88,44,0.16)" }}>
              <Stack spacing={0.25}>
                {actions.map((a) => (
                  <Stack
                    key={a.label}
                    direction="row"
                    spacing={1}
                    role="button"
                    onClick={() => { a.onClick(); setOpen(false); }}
                    sx={{
                      alignItems: "center",
                      px: 1.1,
                      py: 0.7,
                      borderRadius: "10px",
                      cursor: "pointer",
                      color: ink,
                      transition: "background-color .15s ease, transform .15s ease",
                      "&:hover": { bgcolor: pastel.cream, transform: "translateX(2px)" },
                    }}
                  >
                    <Box sx={{ color: "#C24E7C", display: "flex" }}>{a.icon}</Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{a.label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Collapse>
        </Box>
      </Collapse>

      <Box
        role="button"
        aria-label="AI assistant"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          pointerEvents: "auto",
          cursor: "pointer",
          position: "relative",
          width: 68,
          height: 68,
          borderRadius: "50%",
          bgcolor: "#FFFDF8",
          border: `1.5px solid ${open ? pastel.pink : "#EADBC2"}`,
          boxShadow: "0 6px 18px rgba(120,88,44,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform .18s cubic-bezier(.34,1.56,.64,1), border-color .15s ease",
          "&:hover": { transform: "scale(1.06) rotate(-3deg)" },
        }}
      >
        {style.confetti ? <Confetti count={14} /> : null}
        <Box className={style.anim} sx={{ display: "flex" }}>
          <Chibi size={48} />
        </Box>
        <DoodleSparkle size={16} style={{ position: "absolute", top: -2, right: -2 }} className="animate-twinkle" />
      </Box>
    </Box>
  );
}
