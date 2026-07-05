"use client";

import { useMemo, useState } from "react";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar } from "@/components/common";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { blue, ink, line, secondaryText } from "@/components/theme";

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

  // Only show avatars for collaborators who are currently online — anyone not
  // connected is hidden entirely (not dimmed).
  const online = collaborators.filter((c) => onlineIds.has(c.id));
  const onlineCount = online.length;

  return (
    <Box
      sx={{
        height: 52,
        flexShrink: 0,
        borderBottom: `1px solid ${line}`,
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        px: { xs: 1.5, sm: 2.5 },
        gap: { xs: 1, sm: 2 },
      }}
    >
      <Tooltip title="Open explorer">
        <IconButton
          onClick={onOpenLeft}
          sx={{ display: { xs: "inline-flex", md: "none" }, width: 34, height: 34 }}
          aria-label="Open explorer"
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      {/* Brand */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: "9px", bgcolor: blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(59,130,246,0.35)" }}>
          <BoltIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ display: { xs: "none", sm: "block" }, lineHeight: 1.15 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.1 }}>
            Live Workspace
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 400, color: secondaryText, lineHeight: 1.1 }}>
            Schema collaboration hub
          </Typography>
        </Box>
      </Box>

      {/* Center nav */}
      <Stack direction="row" spacing={0.5} sx={{ ml: { xs: 0.5, md: 2 }, p: 0.5, borderRadius: "10px", bgcolor: "#F1F5F9", flexShrink: 0 }}>
        {([
          { key: "workspace", label: "Workspace", short: "Workspace" },
          { key: "flows", label: "Flow Testing", short: "Flows" },
        ] as const).map((tab) => {
          const active = view === tab.key;
          return (
            <Box
              key={tab.key}
              role="button"
              aria-pressed={active}
              onClick={() => setView(tab.key)}
              sx={{
                px: { xs: 1.25, sm: 1.75 }, py: 0.55, borderRadius: "8px", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 500, whiteSpace: "nowrap",
                color: active ? ink : secondaryText,
                bgcolor: active ? "#fff" : "transparent",
                boxShadow: active ? "0 1px 2px rgba(15,23,42,0.08)" : "none",
                transition: "color .15s ease, background-color .15s ease",
                "&:hover": { color: ink, bgcolor: active ? "#fff" : "rgba(255,255,255,0.6)" },
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{tab.label}</Box>
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>{tab.short}</Box>
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ ml: "auto" }}>{view === "workspace" ? <ImportApiDialog /> : null}</Box>

      {/* Room badge */}
      {roomCode && (
        <Tooltip title={copied ? "Copied!" : "Copy room code to share"}>
          <Box
            onClick={copyCode}
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: "999px",
              bgcolor: "#F1F5F9",
              cursor: "pointer",
              transition: "background-color .15s ease",
              "&:hover": { bgcolor: "#E9EEF4" },
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: secondaryText }}>
              Room
            </Typography>
            <Typography sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, fontSize: 12.5, letterSpacing: "0.06em", color: ink }}>
              {roomCode}
            </Typography>
            {copied ? (
              <CheckIcon sx={{ fontSize: 15, color: "#22C55E" }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: 13, color: secondaryText }} />
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
            bgcolor: "#F0FDF4",
          }}
        >
          <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#22C55E", boxShadow: "0 0 0 3px rgba(34,197,94,0.18)" }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "#166534" }}>{onlineCount} online</Typography>
        </Box>
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", pl: 0.5 }}>
          {online.map((c) => (
            <Tooltip key={c.id} title={`${c.name} · ${c.role} · online${c.id === me?.id ? " (you)" : ""}`}>
              <Box sx={{ ml: -0.6 }}>
                <Avatar name={c.name} color={c.color} online size={28} />
              </Box>
            </Tooltip>
          ))}
        </Box>
        {view === "workspace" ? (
          <Tooltip title="Activity & comments">
            <IconButton
              onClick={onOpenRight}
              sx={{ display: { xs: "inline-flex", md: "none" }, width: 34, height: 34 }}
              aria-label="Open activity and comments"
            >
              <ForumOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : null}
        <Tooltip title="Leave room">
          <IconButton onClick={signOut} sx={{ width: 34, height: 34 }}>
            <LogoutIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
