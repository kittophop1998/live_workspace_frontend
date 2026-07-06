"use client";

import { useMemo, useState } from "react";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar } from "@/components/common";
import { DoodleStar } from "@/components/doodles";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { ink, line, pastel, pastelInk, secondaryText } from "@/components/theme";

export function TopBar({ onOpenLeft, onOpenRight }: { onOpenLeft?: () => void; onOpenRight?: () => void } = {}) {
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  const presences = useWorkspaceStore((s) => s.presences);
  const me = useWorkspaceStore((s) => s.me);
  const roomCode = useWorkspaceStore((s) => s.roomCode);
  const signOut = useWorkspaceStore((s) => s.signOut);
  const view = useWorkspaceStore((s) => s.view);
  const setView = useWorkspaceStore((s) => s.setView);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!roomCode) return;
    void navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Derive the online set here (memoized) so we never hand the store a fresh
  // object as a snapshot — doing that would loop infinitely.
  const onlineIds = useMemo(
    () => new Set(Object.values(presences).map((p) => p.collaboratorId)),
    [presences],
  );

  // Only show avatars for collaborators who are currently online.
  const online = collaborators.filter((c) => onlineIds.has(c.id));
  const onlineCount = online.length;

  return (
    <Box
      sx={{
        height: 58,
        flexShrink: 0,
        borderBottom: `1px solid ${line}`,
        bgcolor: "rgba(255,255,255,.92)",
        display: "flex",
        alignItems: "center",
        px: { xs: 1.5, sm: 2.5 },
        gap: { xs: 1, sm: 2 },
      }}
    >
      <Tooltip title="Open explorer">
        <IconButton
          onClick={onOpenLeft}
          sx={{ display: { xs: "inline-flex", md: "none" }, width: 36, height: 36 }}
          aria-label="Open explorer"
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      {/* Brand — a little notebook you flip open every day */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box
          sx={{
            position: "relative",
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: "12px",
            bgcolor: pastel.pink,
            color: pastelInk.pink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1.5px solid ${pastelInk.pink}33`,
            boxShadow: "0 2px 0 rgba(194,78,124,0.18)",
            transform: "rotate(-4deg)",
          }}
        >
          <MenuBookRoundedIcon sx={{ fontSize: 20 }} />
          <DoodleStar size={13} style={{ position: "absolute", top: -6, right: -6 }} />
        </Box>
        <Box sx={{ display: { xs: "none", sm: "block" }, lineHeight: 1.1 }}>
          <Typography className="font-hand" sx={{ fontSize: 16, fontWeight: 700, color: ink, lineHeight: 1.05 }}>
            Kingdom Workspace
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 500, color: secondaryText, lineHeight: 1.1 }}>
            Collaborative API notebook
          </Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ ml: { xs: 0.5, md: 2 }, p: 0.4, borderRadius: "10px", bgcolor: "#F5F3FA", flexShrink: 0 }}>
        {([
          { key: "workspace", label: "Workspace", short: "Workspace" },
          { key: "flows", label: "E2E Flow Testing", short: "Flows" },
        ] as const).map((tab) => {
          const active = view === tab.key;
          return (
            <Box
              key={tab.key}
              role="button"
              aria-pressed={active}
              onClick={() => setView(tab.key)}
              sx={{
                px: { xs: 1.25, sm: 1.75 }, py: 0.55, borderRadius: "8px", cursor: "pointer", fontSize: 13, fontWeight: 650, whiteSpace: "nowrap",
                color: active ? pastelInk.purple : secondaryText,
                bgcolor: active ? "#FFFFFF" : "transparent",
                border: "1px solid transparent",
                boxShadow: active ? "0 1px 3px rgba(46,46,46,.08)" : "none",
                transition: "color .15s ease, background-color .15s ease, transform .15s ease",
                "&:hover": { color: pastelInk.purple, transform: "translateY(-1px)" },
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{tab.label}</Box>
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>{tab.short}</Box>
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ ml: "auto" }}>{view === "workspace" ? <ImportApiDialog /> : null}</Box>

      {/* Room badge — a taped luggage tag */}
      {roomCode && (
        <Tooltip title={copied ? "Copied!" : "Copy room code to share"}>
          <Box
            onClick={copyCode}
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.55,
              borderRadius: "999px",
              bgcolor: pastel.mint,
              border: `1.5px solid ${pastelInk.mint}33`,
              cursor: "pointer",
              transition: "transform .15s ease",
              "&:hover": { transform: "rotate(-1.5deg)" },
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: pastelInk.mint }}>Room</Typography>
            <Typography sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: 12.5, letterSpacing: "0.06em", color: pastelInk.mint }}>
              {roomCode}
            </Typography>
            {copied ? (
              <CheckIcon sx={{ fontSize: 15, color: pastelInk.mint }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: 13, color: pastelInk.mint }} />
            )}
          </Box>
        </Tooltip>
      )}

      {/* Presence */}
      <Stack direction="row" spacing={1} sx={{ ml: { xs: "auto", sm: 0.5 }, alignItems: "center" }}>
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 0.6,
            px: 1.1,
            py: 0.45,
            borderRadius: "999px",
            bgcolor: pastel.mint,
          }}
        >
          <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#4FB477", boxShadow: "0 0 0 3px rgba(79,180,119,0.22)" }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: pastelInk.mint }}>{onlineCount} here</Typography>
        </Box>
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", pl: 0.5 }}>
          {online.map((c) => (
            <Tooltip key={c.id} title={`${c.name} · ${c.role} · online${c.id === me?.id ? " (you)" : ""}`}>
              <Box sx={{ ml: -0.6 }}>
                <Avatar name={c.name} color={c.color} online size={30} />
              </Box>
            </Tooltip>
          ))}
        </Box>
        {view === "workspace" ? (
          <Tooltip title="Activity & comments">
            <IconButton
              onClick={onOpenRight}
              sx={{ display: { xs: "inline-flex", md: "none" }, width: 36, height: 36 }}
              aria-label="Open activity and comments"
            >
              <ForumOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : null}
        <Tooltip title="Leave room">
          <IconButton onClick={signOut} sx={{ width: 36, height: 36 }}>
            <LogoutIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
