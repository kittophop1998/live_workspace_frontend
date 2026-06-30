"use client";

import { useMemo } from "react";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar } from "@/components/common";
import { line } from "@/components/theme";

export function TopBar() {
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  const presences = useWorkspaceStore((s) => s.presences);
  const me = useWorkspaceStore((s) => s.me);

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

      <Stack direction="row" spacing={0.75} sx={{ ml: "auto", alignItems: "center" }}>
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
      </Stack>
    </Box>
  );
}
