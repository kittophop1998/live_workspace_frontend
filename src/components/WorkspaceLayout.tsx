"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress, CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "@/components/theme";
import { useWorkspaceSync } from "@/lib/useWorkspaceSync";
import { TopBar } from "@/components/TopBar";
import { LeftPanel } from "@/components/LeftPanel";
import { CenterPanel } from "@/components/CenterPanel";
import { RightPanel } from "@/components/RightPanel";

export function WorkspaceLayout() {
  useWorkspaceSync(); // mounts cross-tab sync + presence heartbeat

  // The UI renders time-relative text ("2m ago") and reads cross-tab state, which
  // differ between server and client. Gate on mount so the first client paint
  // matches the server HTML (a loader) — avoids React hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#F4F4F5" }}>
          <CircularProgress sx={{ color: "#0A0A0A" }} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
}
