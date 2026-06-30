"use client";

import { Box } from "@mui/material";
import { ActivityLog } from "@/components/ActivityLog";
import { EventPanel } from "@/components/EventPanel";

export function EventsScreen() {
  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexDirection: { xs: "column", md: "row" } }}>
      <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
        <EventPanel />
      </Box>
      <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
        <ActivityLog />
      </Box>
    </Box>
  );
}
