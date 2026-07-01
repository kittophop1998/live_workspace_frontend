"use client";

import { useMemo, useState } from "react";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import LogoutIcon from "@mui/icons-material/Logout";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar } from "@/components/common";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { line } from "@/components/theme";

export function TopBar() {
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

  // Online collaborators first, then offline.
  const ordered = [...collaborators].sort((a, b) => Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id)));
  const onlineCount = collaborators.filter((c) => onlineIds.has(c.id)).length;

  return (
    <Box
      sx={{
        height: 56,
        flexShrink: 0,
        borderBottom: `2px solid ${line}`,
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        px: 2,
        gap: 1.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: line, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #71717A" }}>
          <BoltIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="h2" sx={{ lineHeight: 1 }}>
            Live Workspace
          </Typography>
          <Typography variant="caption" sx={{ color: "#71717A" }}>
            Schema collaboration hub
          </Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ ml: 3, p: 0.4, borderRadius: "10px", border: `2px solid ${line}`, bgcolor: "#F4F4F5" }}>
        {([
          { key: "workspace", label: "Workspace" },
          { key: "flows", label: "E2E Flow Testing" },
        ] as const).map((tab) => (
          <Box
            key={tab.key}
            role="button"
            aria-pressed={view === tab.key}
            onClick={() => setView(tab.key)}
            sx={{
              px: 1.5, py: 0.5, borderRadius: "7px", cursor: "pointer", fontSize: 13, fontWeight: 700,
              color: view === tab.key ? "#fff" : "#52525B",
              bgcolor: view === tab.key ? line : "transparent",
              "&:hover": { bgcolor: view === tab.key ? line : "#E4E4E7" },
            }}
          >
            {tab.label}
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
              display: "flex",
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

      <Stack direction="row" spacing={0.75} sx={{ ml: 1.5, alignItems: "center" }}>
        <Box
          sx={{
            display: "flex",
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
        {ordered.map((c) => (
          <Tooltip key={c.id} title={`${c.name} · ${c.role}${onlineIds.has(c.id) ? " · online" : " · offline"}${c.id === me?.id ? " (you)" : ""}`}>
            <Box sx={{ opacity: onlineIds.has(c.id) ? 1 : 0.4, ml: -0.5 }}>
              <Avatar name={c.name} color={c.color} online={onlineIds.has(c.id)} size={30} />
            </Box>
          </Tooltip>
        ))}
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
