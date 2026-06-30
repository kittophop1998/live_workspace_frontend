"use client";

import { Box } from "@mui/material";
import { TaskQueue } from "@/components/TaskQueue";
import { VillageGrid } from "@/components/VillageGrid";

export function BuildingsScreen() {
  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexDirection: { xs: "column", md: "row" } }}>
      <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
        <VillageGrid />
      </Box>
      <Box sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0 }}>
        <TaskQueue />
      </Box>
    </Box>
  );
}
