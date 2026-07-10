"use client";

import { Box } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { ActivityLog } from "@/components/ActivityLog";
import { CommentThread } from "@/components/CommentThread";
import { TeamChat } from "@/components/TeamChat";
import { TaskUpdates } from "@/components/TaskUpdates";
import { BookmarkTab } from "@/components/common";
import { line } from "@/components/theme";
import type { RightTab } from "@/lib/types";

export function RightPanel() {
  const tab = useWorkspaceStore((s) => s.rightTab);
  const setTab = useWorkspaceStore((s) => s.setRightTab);
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const commentCount = useWorkspaceStore((s) => s.comments.filter((c) => c.resourceId === selectedId).length);
  const taskLogCount = useWorkspaceStore((s) => s.taskLogs.length);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: `1px solid ${line}`, bgcolor: "#FBFAF7" }}>
      {/* Tabs wrap to a second row when the panel is too narrow to hold all four
          on one line (desktop 340px column / mobile drawer) — so no tab is ever
          clipped past the edge and left unclickable. */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          columnGap: 0.75,
          rowGap: 0.75,
          px: 1.75,
          pt: 1.25,
          alignItems: "flex-end",
          borderBottom: `1px solid ${line}`,
        }}
      >
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
        <BookmarkTab
          label="Chat"
          icon={<ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />}
          color="blue"
          active={tab === "chat"}
          onClick={() => setTab("chat" as RightTab)}
        />
        <BookmarkTab
          label={`Updates${taskLogCount ? ` (${taskLogCount})` : ""}`}
          icon={<BuildOutlinedIcon sx={{ fontSize: 16 }} />}
          color="mint"
          active={tab === "updates"}
          onClick={() => setTab("updates" as RightTab)}
        />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {tab === "comments" ? (
          <CommentThread />
        ) : tab === "chat" ? (
          <TeamChat />
        ) : tab === "updates" ? (
          <TaskUpdates />
        ) : (
          <ActivityLog />
        )}
      </Box>
    </Box>
  );
}
