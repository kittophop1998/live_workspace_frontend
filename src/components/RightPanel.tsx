"use client";

import type { ReactNode } from "react";
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
import type { PastelName } from "@/components/common";
import { line, pastel, pastelInk, secondaryText } from "@/components/theme";
import type { RightTab } from "@/lib/types";

const NAV: { key: RightTab; label: string; color: PastelName; icon: ReactNode }[] = [
  { key: "activity", label: "Activity", color: "purple", icon: <HistoryIcon sx={{ fontSize: 16 }} /> },
  { key: "comments", label: "Comments", color: "orange", icon: <ForumOutlinedIcon sx={{ fontSize: 16 }} /> },
  { key: "chat", label: "Chat", color: "blue", icon: <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} /> },
  { key: "updates", label: "Updates", color: "mint", icon: <BuildOutlinedIcon sx={{ fontSize: 16 }} /> },
];

// A pill button for the right-panel switcher. Buttons (vs. notebook tabs) stay
// tidy when they reflow on a narrow panel/drawer — no half-connected tab seams.
function NavButton({
  label,
  icon,
  color,
  count,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  color: PastelName;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      role="button"
      aria-pressed={active}
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.6,
        cursor: "pointer",
        px: 1,
        py: 0.85,
        borderRadius: "10px",
        fontSize: 12.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
        userSelect: "none",
        bgcolor: active ? pastel[color] : "#FFFFFF",
        color: active ? pastelInk[color] : secondaryText,
        border: `1.5px solid ${active ? `${pastelInk[color]}44` : line}`,
        boxShadow: active ? `0 1px 2px ${pastelInk[color]}22` : "none",
        transition: "background-color .15s ease, color .15s ease, border-color .15s ease, transform .15s ease",
        "&:hover": {
          color: pastelInk[color],
          borderColor: `${pastelInk[color]}44`,
          transform: "translateY(-1px)",
        },
      }}
    >
      {icon}
      <Box component="span">{label}</Box>
      {count ? (
        <Box component="span" sx={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>
          {count}
        </Box>
      ) : null}
    </Box>
  );
}

export function RightPanel() {
  const tab = useWorkspaceStore((s) => s.rightTab);
  const setTab = useWorkspaceStore((s) => s.setRightTab);
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const commentCount = useWorkspaceStore((s) => s.comments.filter((c) => c.resourceId === selectedId).length);
  const taskLogCount = useWorkspaceStore((s) => s.taskLogs.length);

  const countFor = (key: RightTab) =>
    key === "comments" ? commentCount : key === "updates" ? taskLogCount : 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: `1px solid ${line}`, bgcolor: "#FBFAF7" }}>
      {/* Button switcher — an auto-fit grid so the four controls sit in a neat
          2×2 block on a narrow panel/drawer and spread out when there's room,
          instead of tabs that reflow into a broken-looking second row. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
          gap: 0.75,
          p: 1.25,
          borderBottom: `1px solid ${line}`,
        }}
      >
        {NAV.map((n) => (
          <NavButton
            key={n.key}
            label={n.label}
            icon={n.icon}
            color={n.color}
            count={countFor(n.key)}
            active={tab === n.key}
            onClick={() => setTab(n.key)}
          />
        ))}
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
