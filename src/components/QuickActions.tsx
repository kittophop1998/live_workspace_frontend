"use client";

import { Box, Typography } from "@mui/material";
import { useKingdomStore } from "@/lib/store";

function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        flex: "1 1 0",
        minWidth: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
        py: 1.25,
        px: 1,
        borderRadius: 3,
        border: "1px solid #E7DCC2",
        bgcolor: "#FFFDF6",
        cursor: "pointer",
        transition: "transform .12s ease, background .12s ease",
        "&:hover": { transform: "translateY(-2px)", bgcolor: "#FBF1D8" },
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#3B3026" }}>{label}</Typography>
    </Box>
  );
}

export function QuickActions() {
  const go = useKingdomStore((s) => s.go);
  const collectOffline = useKingdomStore((s) => s.collectOffline);
  const bulkAssignIdle = useKingdomStore((s) => s.bulkAssignIdle);
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <ActionButton icon="🏗️" label="Build" onClick={() => go("buildings")} />
      <ActionButton icon="🌙" label="Collect" onClick={collectOffline} />
      <ActionButton icon="🛡️" label="Train Guard" onClick={() => bulkAssignIdle("guard", 1)} />
      <ActionButton icon="🏪" label="Market" onClick={() => go("buildings")} />
    </Box>
  );
}
