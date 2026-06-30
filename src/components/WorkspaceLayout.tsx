"use client";

import { Box } from "@mui/material";
import { useEffect } from "react";
import { useWorkspaceSync } from "@/lib/useWorkspaceSync";
import { useResponseSchemaStore } from "@/lib/responseSchemas";
import { useSchemaTreeStore } from "@/lib/schemaTree";
import { useBookmarkStore } from "@/lib/bookmarks";
import { TopBar } from "@/components/TopBar";
import { LeftPanel } from "@/components/LeftPanel";
import { CenterPanel } from "@/components/CenterPanel";
import { RightPanel } from "@/components/RightPanel";

// Mounted only once a room session exists (AppRoot gates auth + theme + the
// mount/hydration guard), so useWorkspaceSync hydrates with the bearer token.
export function WorkspaceLayout() {
  useWorkspaceSync(); // hydrate from backend + presence heartbeat over WS

  // Load locally-persisted response schemas (api-spec.md §2 ResponseSchema) once.
  const hydrateResponseSchemas = useResponseSchemaStore((s) => s.hydrate);
  // Load locally-persisted Visual Builder schema trees once.
  const hydrateSchemaTrees = useSchemaTreeStore((s) => s.hydrate);
  // Load locally-persisted bookmarks once.
  const hydrateBookmarks = useBookmarkStore((s) => s.hydrate);
  useEffect(() => {
    hydrateResponseSchemas();
    hydrateSchemaTrees();
    hydrateBookmarks();
  }, [hydrateResponseSchemas, hydrateSchemaTrees, hydrateBookmarks]);

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
