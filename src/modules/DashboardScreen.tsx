"use client";

import { Box } from "@mui/material";
import { ActivityLog } from "@/components/ActivityLog";
import { CitizenPanel } from "@/components/CitizenPanel";
import { EventPanel } from "@/components/EventPanel";
import { KingdomHeader } from "@/components/KingdomHeader";
import { QuickActions } from "@/components/QuickActions";
import { StatCards } from "@/components/StatCard";
import { TaskQueue } from "@/components/TaskQueue";
import { VillageGrid } from "@/components/VillageGrid";

// Main dashboard (village screen) — center column + right panel on desktop,
// fully stacked on mobile.
export function DashboardScreen() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <KingdomHeader />
      <QuickActions />
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <VillageGrid />
          <StatCards />
          <ActivityLog />
        </Box>
        <Box sx={{ width: 320, flexShrink: 0, display: { xs: "none", md: "flex" }, flexDirection: "column", gap: 2 }}>
          <TaskQueue />
          <EventPanel />
          <CitizenPanel />
        </Box>
      </Box>
      {/* Mobile: right-panel content stacked below */}
      <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column", gap: 2 }}>
        <TaskQueue />
        <EventPanel />
        <CitizenPanel />
      </Box>
    </Box>
  );
}
