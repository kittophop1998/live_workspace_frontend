"use client";

import { Box, Tab, Tabs } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { ActivityLog } from "@/components/ActivityLog";
import { CommentThread } from "@/components/CommentThread";
import { blue, line } from "@/components/theme";
import type { RightTab } from "@/lib/types";

export function RightPanel() {
  const tab = useWorkspaceStore((s) => s.rightTab);
  const setTab = useWorkspaceStore((s) => s.setRightTab);
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const commentCount = useWorkspaceStore((s) => s.comments.filter((c) => c.resourceId === selectedId).length);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: `1px solid ${line}`, bgcolor: "#fff" }}>
      <Tabs
        value={tab}
        onChange={(_, v: RightTab) => setTab(v)}
        variant="fullWidth"
        sx={{
          minHeight: 48,
          borderBottom: `1px solid ${line}`,
          "& .MuiTab-root": { minHeight: 48, fontWeight: 500, fontSize: 13, flexDirection: "row" },
          "& .MuiTabs-indicator": { height: 2, borderRadius: 2, bgcolor: blue },
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
