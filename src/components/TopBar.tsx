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
import { line } from "@/components/theme";

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
        height: 56,
        flexShrink: 0,
        borderBottom: `2px solid ${line}`,
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        px: { xs: 1, sm: 2 },
        gap: { xs: 0.75, sm: 1.5 },
      }}
    >
      <Tooltip title="Open explorer">
        <IconButton
          onClick={onOpenLeft}
          sx={{ display: { xs: "inline-flex", md: "none" }, border: `2px solid ${line}`, width: 34, height: 34 }}
          aria-label="Open explorer"
        >
          <MenuIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: "8px", bgcolor: line, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #71717A" }}>
          <BoltIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <Typography variant="h2" sx={{ lineHeight: 1 }}>
            Live Workspace
          </Typography>
          <Typography variant="caption" sx={{ color: "#71717A" }}>
            Schema collaboration hub
          </Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ ml: { xs: 0.5, md: 3 }, p: 0.4, borderRadius: "10px", border: `2px solid ${line}`, bgcolor: "#F4F4F5", flexShrink: 0 }}>
        {([
          { key: "workspace", label: "Workspace", short: "Schema" },
          { key: "flows", label: "E2E Flow Testing", short: "Flows" },
        ] as const).map((tab) => (
          <Box
            key={tab.key}
            role="button"
            aria-pressed={view === tab.key}
            onClick={() => setView(tab.key)}
            sx={{
              px: { xs: 1, sm: 1.5 }, py: 0.5, borderRadius: "7px", cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
              color: view === tab.key ? "#fff" : "#52525B",
              bgcolor: view === tab.key ? line : "transparent",
              "&:hover": { bgcolor: view === tab.key ? line : "#E4E4E7" },
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{tab.label}</Box>
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>{tab.short}</Box>
          </Box>
        ))}
      </Stack>

      <Box sx={{ ml: "auto" }}>{view === "workspace" ? <ImportApiDialog /> : null}</Box>

      {roomCode && (
        <Tooltip title={copied ? "Copied!" : "Copy room code to share"}>
          <Box
            onClick={copyCode}
            sx={{
              ml: 1.5,
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 0.75,
              px: 1,
              py: 0.4,
              border: `2px solid ${line}`,
              borderRadius: "8px",
              bgcolor: "#F4F4F5",
              cursor: "pointer",
            }}
          >
            <Typography variant="caption" sx={{ color: "#71717A" }}>
              Room
            </Typography>
            <Typography sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 800, fontSize: 13, letterSpacing: "0.06em" }}>
              {roomCode}
            </Typography>
            {copied ? (
              <CheckIcon sx={{ fontSize: 15, color: "#16A34A" }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            )}
          </Box>
        </Tooltip>
      )}

      <Stack direction="row" spacing={0.75} sx={{ ml: { xs: "auto", sm: 1.5 }, alignItems: "center" }}>
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 0.75,
            mr: 1,
            px: 1,
            py: 0.4,
            border: `2px solid ${line}`,
            borderRadius: "999px",
            bgcolor: "#DCFCE7",
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#16A34A", boxShadow: "0 0 0 2px #16A34A33" }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>{onlineCount} online</Typography>
        </Box>
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
          {online.map((c) => (
            <Tooltip key={c.id} title={`${c.name} · ${c.role} · online${c.id === me?.id ? " (you)" : ""}`}>
              <Box sx={{ ml: -0.5 }}>
                <Avatar name={c.name} color={c.color} online size={30} />
              </Box>
            </Tooltip>
          ))}
        </Box>
        {view === "workspace" ? (
          <Tooltip title="Activity & comments">
            <IconButton
              onClick={onOpenRight}
              sx={{ display: { xs: "inline-flex", md: "none" }, border: `2px solid ${line}`, width: 34, height: 34 }}
              aria-label="Open activity and comments"
            >
              <ForumOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        ) : null}
        <Tooltip title="Leave room">
          <IconButton
            onClick={signOut}
            sx={{ ml: 1, border: `2px solid ${line}`, width: 34, height: 34 }}
          >
            <LogoutIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
