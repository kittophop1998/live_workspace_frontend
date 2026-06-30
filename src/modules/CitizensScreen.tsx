"use client";

import { Box } from "@mui/material";
import { CitizenPanel } from "@/components/CitizenPanel";
import { StatCards } from "@/components/StatCard";

export function CitizensScreen() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <StatCards />
      <CitizenPanel />
    </Box>
  );
}
