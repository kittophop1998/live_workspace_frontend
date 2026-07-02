"use client";

import { Box, Drawer } from "@mui/material";
import { useEffect, useState } from "react";
import { useWorkspaceSync } from "@/lib/useWorkspaceSync";
import { useWorkspaceStore } from "@/lib/store";
import { useResponseSchemaStore } from "@/lib/responseSchemas";
import { useSchemaTreeStore } from "@/lib/schemaTree";
import { useBookmarkStore } from "@/lib/bookmarks";
import { useEndpointStatusStore } from "@/lib/endpointStatus";
import { useApiTesterStore } from "@/lib/apiTester";
import { TopBar } from "@/components/TopBar";
import { LeftPanel } from "@/components/LeftPanel";
import { CenterPanel } from "@/components/CenterPanel";
import { RightPanel } from "@/components/RightPanel";
import { FlowTestingPage } from "@/components/flows/FlowTestingPage";

// Mounted only once a room session exists (AppRoot gates auth + theme + the
// mount/hydration guard), so useWorkspaceSync hydrates with the bearer token.
export function WorkspaceLayout() {
  useWorkspaceSync(); // hydrate from backend + presence heartbeat over WS
  const view = useWorkspaceStore((s) => s.view);

  // Mobile-only drawers for the side panels (hidden inline below md).
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // Load locally-persisted response schemas (api-spec.md §2 ResponseSchema) once.
  const hydrateResponseSchemas = useResponseSchemaStore((s) => s.hydrate);
  // Load locally-persisted Visual Builder schema trees once.
  const hydrateSchemaTrees = useSchemaTreeStore((s) => s.hydrate);
  // Load locally-persisted bookmarks once.
  const hydrateBookmarks = useBookmarkStore((s) => s.hydrate);
  // Load locally-persisted per-endpoint workflow status once.
  const hydrateEndpointStatus = useEndpointStatusStore((s) => s.hydrate);
  // Load locally-persisted API tester drafts + base URL once.
  const hydrateApiTester = useApiTesterStore((s) => s.hydrate);
  useEffect(() => {
    hydrateResponseSchemas();
    hydrateSchemaTrees();
    hydrateBookmarks();
    hydrateEndpointStatus();
    hydrateApiTester();
  }, [hydrateResponseSchemas, hydrateSchemaTrees, hydrateBookmarks, hydrateEndpointStatus, hydrateApiTester]);

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#F4F4F5" }}>
      <TopBar onOpenLeft={() => setLeftOpen(true)} onOpenRight={() => setRightOpen(true)} />
      {view === "flows" ? (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <FlowTestingPage />
        </Box>
      ) : (
        <>
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

          {/* Mobile: side panels live in swipe-away drawers (they're hidden inline above). */}
          <Drawer
            anchor="left"
            open={leftOpen}
            onClose={() => setLeftOpen(false)}
            sx={{ display: { xs: "block", md: "none" } }}
            slotProps={{ root: { keepMounted: true }, paper: { sx: { width: "84vw", maxWidth: 320 } } }}
          >
            {/* Picking a resource reveals the center editor — close the drawer. */}
            <LeftPanel onNavigate={() => setLeftOpen(false)} />
          </Drawer>
          <Drawer
            anchor="right"
            open={rightOpen}
            onClose={() => setRightOpen(false)}
            sx={{ display: { xs: "block", md: "none" } }}
            slotProps={{ root: { keepMounted: true }, paper: { sx: { width: "88vw", maxWidth: 380 } } }}
          >
            <RightPanel />
          </Drawer>
        </>
      )}
    </Box>
  );
}
