"use client";

import { Box, Drawer, Tooltip } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useEffect, useState } from "react";
import { useWorkspaceSync } from "@/lib/useWorkspaceSync";
import { useWorkspaceStore } from "@/lib/store";
import { useResponseSchemaStore } from "@/lib/responseSchemas";
import { useSchemaTreeStore } from "@/lib/schemaTree";
import { initSchemaTreeSync } from "@/lib/schemaTreeSync";
import { useBookmarkStore } from "@/lib/bookmarks";
import { useApiTesterStore } from "@/lib/apiTester";
import { useProposalStore } from "@/lib/proposals";
import { useApiStoryStore } from "@/lib/apiStory";
import { TopBar } from "@/components/TopBar";
import { LeftPanel } from "@/components/LeftPanel";
import { CenterPanel } from "@/components/CenterPanel";
import { RightPanel } from "@/components/RightPanel";
import { FlowTestingPage } from "@/components/flows/FlowTestingPage";
import { ApiStoryView } from "@/components/story/ApiStoryView";
import { MergeCelebration } from "@/components/proposals/MergeCelebration";
import { ink, line, secondaryText } from "@/components/theme";

// Persisted collapse state for the side panels (localStorage). WorkspaceLayout
// only mounts client-side (behind AppRoot's mount guard), so a guarded lazy
// initialiser reads storage safely without an effect.
function useCollapsed(key: string): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && window.localStorage.getItem(key) === "1",
  );
  const toggle = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  return [collapsed, toggle];
}

// A small circular control that sits on the seam between panels.
function SeamToggle({
  side,
  collapsed,
  onClick,
  offset,
}: {
  side: "left" | "right";
  collapsed: boolean;
  onClick: () => void;
  offset: number;
}) {
  const pointsRight = side === "left" ? collapsed : !collapsed;
  return (
    <Tooltip title={`${collapsed ? "Show" : "Hide"} ${side} panel`}>
      <Box
        role="button"
        aria-label={`${collapsed ? "Show" : "Hide"} ${side} panel`}
        onClick={onClick}
        sx={{
          display: { xs: "none", md: "flex" },
          position: "absolute",
          top: 14,
          [side]: offset,
          zIndex: 5,
          width: 22,
          height: 22,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          bgcolor: "#fff",
          border: `1px solid ${line}`,
          boxShadow: "0 1px 2px rgba(15,23,42,0.06), 0 4px 10px rgba(15,23,42,0.08)",
          color: secondaryText,
          cursor: "pointer",
          transition: "color .15s ease, box-shadow .15s ease",
          "&:hover": { color: ink, boxShadow: "0 2px 6px rgba(15,23,42,0.12)" },
        }}
      >
        {pointsRight ? <ChevronRightIcon sx={{ fontSize: 16 }} /> : <ChevronLeftIcon sx={{ fontSize: 16 }} />}
      </Box>
    </Tooltip>
  );
}

// Mounted only once a room session exists (AppRoot gates auth + theme + the
// mount/hydration guard), so useWorkspaceSync hydrates with the bearer token.
export function WorkspaceLayout() {
  useWorkspaceSync(); // hydrate from backend + presence heartbeat over WS
  const view = useWorkspaceStore((s) => s.view);

  // Mobile-only drawers for the side panels (hidden inline below md).
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // Desktop collapse state (persisted) — the center editor always keeps priority.
  const [leftCollapsed, toggleLeft] = useCollapsed("live-workspace:left-collapsed");
  const [rightCollapsed, toggleRight] = useCollapsed("live-workspace:right-collapsed");

  // Load locally-persisted response schemas (api-spec.md §2 ResponseSchema) once.
  const hydrateResponseSchemas = useResponseSchemaStore((s) => s.hydrate);
  // Load locally-persisted Visual Builder schema trees once.
  const hydrateSchemaTrees = useSchemaTreeStore((s) => s.hydrate);
  // Load locally-persisted bookmarks once.
  const hydrateBookmarks = useBookmarkStore((s) => s.hydrate);
  // Load locally-persisted API tester drafts + base URL once.
  const hydrateApiTester = useApiTesterStore((s) => s.hydrate);
  // Load locally-persisted Proposal Mode proposals once.
  const hydrateProposals = useProposalStore((s) => s.hydrate);
  // Load locally-persisted API Story flows once.
  const hydrateStories = useApiStoryStore((s) => s.hydrate);
  useEffect(() => {
    hydrateResponseSchemas();
    hydrateSchemaTrees();
    hydrateBookmarks();
    hydrateApiTester();
    hydrateProposals();
    hydrateStories();
    // Must run after hydrateSchemaTrees so the initial localStorage merge
    // isn't mistaken for a fresh local edit that needs saving.
    initSchemaTreeSync();
  }, [hydrateResponseSchemas, hydrateSchemaTrees, hydrateBookmarks, hydrateApiTester, hydrateProposals, hydrateStories]);

  const leftW = leftCollapsed ? "0px" : "280px";
  const rightW = rightCollapsed ? "0px" : "340px";

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "transparent" }}>
      <TopBar onOpenLeft={() => setLeftOpen(true)} onOpenRight={() => setRightOpen(true)} />
      {view === "flows" ? (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <FlowTestingPage />
        </Box>
      ) : view === "story" ? (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <ApiStoryView />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: `${leftW} minmax(0,1fr) ${rightW}` },
              gridAutoRows: { xs: "minmax(0, 1fr)", md: "1fr" },
              transition: "grid-template-columns .2s ease",
            }}
          >
            <Box sx={{ minHeight: 0, overflow: "hidden", display: { xs: "none", md: "block" } }}>
              <LeftPanel />
            </Box>
            <Box sx={{ minHeight: 0, overflow: "hidden" }}>
              <CenterPanel />
            </Box>
            <Box sx={{ minHeight: 0, overflow: "hidden", display: { xs: "none", md: "block" } }}>
              <RightPanel />
            </Box>

            <SeamToggle side="left" collapsed={leftCollapsed} onClick={toggleLeft} offset={leftCollapsed ? 8 : 269} />
            <SeamToggle side="right" collapsed={rightCollapsed} onClick={toggleRight} offset={rightCollapsed ? 8 : 329} />
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

      {/* Merge celebration overlay — fired by ProposalReview on a successful merge. */}
      <MergeCelebration />
    </Box>
  );
}
