"use client";

import { Box, Card, Typography } from "@mui/material";
import { useKingdomStore } from "@/lib/store";
import { ProgressBar, SectionTitle, StatusBadge, formatSec } from "./common";

const TYPE_ICON = { build: "🏗️", upgrade: "🔨", train: "🛡️", repair: "🧰" } as const;

export function TaskQueue() {
  const tasks = useKingdomStore((s) => s.tasks);
  const slots = 3;
  return (
    <Card sx={{ p: 1.5 }}>
      <SectionTitle icon="📋" title="Task Queue" action={<StatusBadge tone="info">{tasks.length}/{slots}</StatusBadge>} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {tasks.map((t) => (
          <Box key={t.id} sx={{ p: 1, borderRadius: 2.5, border: "1px solid #EFE7D2", bgcolor: "#FFFFFF" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} noWrap>
                {TYPE_ICON[t.type]} {t.label}
              </Typography>
              <Typography variant="caption" sx={{ flexShrink: 0, fontWeight: 700, color: "#5B8DD9" }}>
                {formatSec(t.remainingSec)}
              </Typography>
            </Box>
            <ProgressBar value={t.progress} color="#5B8DD9" height={6} />
          </Box>
        ))}
        {!tasks.length ? (
          <Typography variant="caption" sx={{ textAlign: "center", py: 1 }}>
            No active tasks. Upgrade a building to get started.
          </Typography>
        ) : null}
      </Box>
    </Card>
  );
}
