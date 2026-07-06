"use client";

import { Box, Stack } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { ActivityLog } from "@/components/ActivityLog";
import { CommentThread } from "@/components/CommentThread";
import { BookmarkTab } from "@/components/common";
import { blue, line, wash } from "@/components/theme";
import type { RightTab } from "@/lib/types";

export function RightPanel() {
  const tab = useWorkspaceStore((s) => s.rightTab);
  const setTab = useWorkspaceStore((s) => s.setRightTab);
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const commentCount = useWorkspaceStore((s) => s.comments.filter((c) => c.resourceId === selectedId).length);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: `1px solid ${line}`, bgcolor: wash }}>
      <Stack direction="row" spacing={0.75} sx={{ px: 1.75, pt: 1.25, alignItems: "flex-end", borderBottom: `1px solid ${line}` }}>
        <BookmarkTab
          label="Activity"
          icon={<HistoryIcon sx={{ fontSize: 16 }} />}
          color="purple"
          active={tab === "activity"}
          onClick={() => setTab("activity" as RightTab)}
        />
        <BookmarkTab
          label={`Comments${commentCount ? ` (${commentCount})` : ""}`}
          icon={<ForumOutlinedIcon sx={{ fontSize: 16 }} />}
          color="orange"
          active={tab === "comments"}
          onClick={() => setTab("comments" as RightTab)}
        />
        <Box sx={{ ml: "auto", mb: 1.2, width: 6, height: 6, borderRadius: "50%", bgcolor: blue }} />
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {tab === "comments" ? <CommentThread /> : <ActivityLog />}
      </Box>
    </Box>
  );
}
