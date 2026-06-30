"use client";

import { Box, Card, Typography } from "@mui/material";
import { useKingdomStore } from "@/lib/store";
import { AnimatedNumber, ProgressBar } from "./common";

function Stat({ icon, label, value, color, max }: { icon: string; label: string; value: number; color: string; max?: number }) {
  return (
    <Card sx={{ p: 1.25, flex: "1 1 0", minWidth: 120 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <Box>
          <Typography variant="caption">{label}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.1 }}>
            <AnimatedNumber value={value} />
            {max ? <span style={{ fontSize: 12, color: "#857A6B", fontWeight: 600 }}> /{max}</span> : null}
          </Typography>
        </Box>
      </Box>
      {max ? <Box sx={{ mt: 0.75 }}><ProgressBar value={value / max} color={color} height={5} /></Box> : null}
    </Card>
  );
}

export function StatCards() {
  const kingdom = useKingdomStore((s) => s.kingdom);
  if (!kingdom) return null;
  const { stats } = kingdom;
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <Stat icon="😊" label="Happiness" value={stats.happiness} color="#6FAE5E" max={100} />
      <Stat icon="🛡️" label="Defense" value={stats.defense} color="#5B8DD9" />
      <Stat icon="⚠️" label="Threat" value={stats.threatLevel} color="#D9534F" max={100} />
      <Stat icon="👥" label="Citizens" value={stats.citizenCount} color="#D9A441" max={stats.citizenLimit} />
    </Box>
  );
}
