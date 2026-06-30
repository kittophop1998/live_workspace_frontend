"use client";

import { Box } from "@mui/material";
import { useWorkspaceSync } from "@/lib/useWorkspaceSync";
import { TopBar } from "@/components/TopBar";
import { LeftPanel } from "@/components/LeftPanel";
import { CenterPanel } from "@/components/CenterPanel";
import { RightPanel } from "@/components/RightPanel";

// Mounted only once a room session exists (AppRoot gates auth + theme + the
// mount/hydration guard), so useWorkspaceSync hydrates with the bearer token.
export function WorkspaceLayout() {
  useWorkspaceSync(); // hydrate from backend + presence heartbeat over WS

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#F4F4F5" }}>
      <TopBar />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "280px minmax(0,1fr) 360px" },
          gridAutoRows: { xs: "minmax(0, 1fr)", md: "1fr" },
        }}
      >
        <Box sx={{ minHeight: 0, display: { xs: "none", md: "block" } }}>
          <LeftPanel />
        </Box>
        <Box sx={{ minHeight: 0, overflow: "hidden" }}>
          <CenterPanel />
        </Box>
        <Box sx={{ minHeight: 0, display: { xs: "none", md: "block" } }}>
          <RightPanel />
        </Box>
      </Box>
    </Box>
  );
}
