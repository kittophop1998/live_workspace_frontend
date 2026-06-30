"use client";

import { Box, Typography } from "@mui/material";
import { useKingdomStore } from "@/lib/store";
import { ProgressBar } from "./common";

function StatPill({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1, py: 0.5, borderRadius: 2, bgcolor: "#FFFFFF", border: "1px solid #EFE7D2" }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <Box sx={{ lineHeight: 1 }}>
        <Typography sx={{ fontSize: 10, color: "#857A6B", fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color }}>{value}</Typography>
      </Box>
    </Box>
  );
}

export function KingdomHeader() {
  const kingdom = useKingdomStore((s) => s.kingdom);
  if (!kingdom) return null;
  const { stats } = kingdom;
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 4,
        border: "1px solid #E7DCC2",
        background: "linear-gradient(135deg, #FBF1D8 0%, #F6E8C8 100%)",
        boxShadow: "0 4px 16px rgba(59,48,38,0.06)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 46, height: 46, display: "grid", placeItems: "center", fontSize: 26, borderRadius: 3, bgcolor: "#FFFDF6", border: "1px solid #E7DCC2" }}>🏰</Box>
          <Box>
            <Typography variant="h1" sx={{ fontSize: 22 }}>
              {kingdom.name}
            </Typography>
            <Typography variant="caption">A cozy little kingdom</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 0.75 }}>
          <StatPill icon="😊" label="Happiness" value={stats.happiness} color="#B07A1E" />
          <StatPill icon="🛡️" label="Defense" value={stats.defense} color="#3A6BB5" />
          <StatPill icon="⚠️" label="Threat" value={stats.threatLevel} color="#C0413D" />
          <StatPill icon="👥" label="Pop." value={stats.citizenCount} color="#4F8A3E" />
        </Box>
      </Box>
      <Box sx={{ mt: 1.5 }}>
        <ProgressBar
          value={kingdom.xp / kingdom.xpToNext}
          color="#D9A441"
          height={9}
          label={
            <>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#3B3026" }}>
                Level {kingdom.level}
              </Typography>
              <Typography variant="caption">
                {kingdom.xp} / {kingdom.xpToNext} XP
              </Typography>
            </>
          }
        />
      </Box>
    </Box>
  );
}
