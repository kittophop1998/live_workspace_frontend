"use client";

import { Box } from "@mui/material";
import { useKingdomStore } from "@/lib/store";
import { BuildingCard } from "./BuildingCard";
import { SectionTitle } from "./common";

export function VillageGrid() {
  const buildings = useKingdomStore((s) => s.buildings);
  return (
    <Box>
      <SectionTitle icon="🏘️" title="Village" />
      <Box
        sx={{
          display: "grid",
          gap: 1.25,
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(4, 1fr)" },
        }}
      >
        {buildings.map((b) => (
          <BuildingCard key={b.id} building={b} />
        ))}
        <EmptyPlot />
      </Box>
    </Box>
  );
}

function EmptyPlot() {
  return (
    <Box
      sx={{
        display: "grid",
        placeItems: "center",
        minHeight: 150,
        borderRadius: 4,
        border: "2px dashed #D7C9A6",
        color: "#A99C82",
        bgcolor: "rgba(255,253,246,0.5)",
        cursor: "pointer",
        transition: "background .15s ease",
        "&:hover": { bgcolor: "#FBF1D8" },
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <Box sx={{ fontSize: 26 }}>➕</Box>
        <Box sx={{ fontSize: 12, fontWeight: 700 }}>Build</Box>
      </Box>
    </Box>
  );
}
