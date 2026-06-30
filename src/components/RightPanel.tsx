"use client";

import { Box, Tab, Tabs } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { ActivityLog } from "@/components/ActivityLog";
import { CommentThread } from "@/components/CommentThread";
import { line } from "@/components/theme";
import type { RightTab } from "@/lib/types";

export function RightPanel() {
  const tab = useWorkspaceStore((s) => s.rightTab);
  const setTab = useWorkspaceStore((s) => s.setRightTab);
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const commentCount = useWorkspaceStore((s) => s.comments.filter((c) => c.resourceId === selectedId).length);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: `2px solid ${line}`, bgcolor: "#fff" }}>
      <Tabs
        value={tab}
        onChange={(_, v: RightTab) => setTab(v)}
        variant="fullWidth"
        sx={{
          minHeight: 46,
          borderBottom: `2px solid ${line}`,
          "& .MuiTab-root": { minHeight: 46, fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.03em", flexDirection: "row" },
          "& .Mui-selected": { color: `${line} !important`, bgcolor: "#F4F4F5" },
          "& .MuiTabs-indicator": { height: 3, bgcolor: line },
        }}
      >
        <Tab value="activity" icon={<HistoryIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Activity" />
        <Tab value="comments" icon={<ForumOutlinedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label={`Comments${commentCount ? ` (${commentCount})` : ""}`} />
      </Tabs>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {tab === "comments" ? <CommentThread /> : <ActivityLog />}
      </Box>
    </Box>
  );
}
