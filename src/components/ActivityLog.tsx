"use client";

import { Box, Card, Typography } from "@mui/material";
import { useKingdomStore } from "@/lib/store";
import { relativeTime, SectionTitle } from "./common";
import type { LogType } from "@/lib/types";

const TYPE_COLOR: Record<LogType, string> = {
  production: "#6FAE5E",
  build: "#D9A441",
  event: "#9B6FD9",
  combat: "#D9534F",
  system: "#857A6B",
  trade: "#5B8DD9",
};

export function ActivityLog() {
  const logs = useKingdomStore((s) => s.logs);
  return (
    <Card sx={{ p: 1.5 }}>
      <SectionTitle icon="📰" title="Activity Log" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, maxHeight: 280, overflowY: "auto", pr: 0.5 }}>
        {logs.map((l) => (
          <Box
            key={l.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              py: 0.6,
              px: 1,
              borderRadius: 2,
              borderLeft: `3px solid ${TYPE_COLOR[l.type]}`,
              bgcolor: "#FFFDF6",
              animation: "log-in .35s ease",
            }}
          >
            <span style={{ fontSize: 15 }}>{l.icon}</span>
            <Typography sx={{ fontSize: 12.5, flex: 1 }} noWrap>
              {l.message}
            </Typography>
            <Typography variant="caption" sx={{ flexShrink: 0 }}>
              {relativeTime(l.at)}
            </Typography>
          </Box>
        ))}
        {!logs.length ? <Typography variant="caption">Quiet so far…</Typography> : null}
      </Box>
    </Card>
  );
}
