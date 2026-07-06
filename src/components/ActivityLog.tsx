"use client";

import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar, EmptyState, relativeTime, useNow } from "@/components/common";
import { ink, line, pastel, pastelInk, secondaryText } from "@/components/theme";
import type { ActivityEvent } from "@/lib/types";

type ActivityFilter = "all" | "edits" | "comments" | "system";

const FILTERS: { id: ActivityFilter; label: string; color: keyof typeof pastel }[] = [
  { id: "all", label: "All", color: "pink" },
  { id: "edits", label: "Edits", color: "yellow" },
  { id: "comments", label: "Notes", color: "orange" },
  { id: "system", label: "System", color: "blue" },
];

// Classify a free-text verb into a coarse category for the quick filters.
function categoryOf(verb: string): Exclude<ActivityFilter, "all"> {
  const v = verb.toLowerCase();
  if (v.includes("comment")) return "comments";
  if (/(add|edit|remov|updat|renam|flag|delet|chang)/.test(v)) return "edits";
  return "system";
}

// A tiny doodle icon + pastel tint per activity kind.
function doodleFor(verb: string): { icon: React.ReactNode; color: keyof typeof pastel } {
  const v = verb.toLowerCase();
  if (v.includes("comment")) return { icon: <ChatBubbleOutlineIcon sx={{ fontSize: 13 }} />, color: "orange" };
  if (/(delet|remov)/.test(v)) return { icon: <DeleteOutlineIcon sx={{ fontSize: 14 }} />, color: "pink" };
  if (/(add|creat|new)/.test(v)) return { icon: <AutoAwesomeOutlinedIcon sx={{ fontSize: 13 }} />, color: "mint" };
  if (/(edit|updat|renam|chang|flag)/.test(v)) return { icon: <EditOutlinedIcon sx={{ fontSize: 13 }} />, color: "yellow" };
  return { icon: <AddCircleOutlineIcon sx={{ fontSize: 13 }} />, color: "blue" };
}

export function ActivityLog() {
  const activity = useWorkspaceStore((s) => s.activity);
  const resources = useWorkspaceStore((s) => s.resources);
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  useNow();

  const resourceName = (id: string) => resources.find((r) => r.id === id)?.name ?? "deleted";
  const colorFor = (name: string) => collaborators.find((c) => c.name === name)?.color ?? "#B49B7E";

  const shown = activity.filter((a: ActivityEvent) => filter === "all" || categoryOf(a.verb) === filter);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Quick filters */}
      <Stack direction="row" spacing={0.6} sx={{ px: 1.5, py: 1.25, flexWrap: "wrap", gap: 0.6 }}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Box
              key={f.id}
              role="button"
              aria-pressed={active}
              onClick={() => setFilter(f.id)}
              sx={{
                px: 1.1,
                py: 0.4,
                borderRadius: "999px",
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 700,
                color: active ? pastelInk[f.color] : secondaryText,
                bgcolor: active ? pastel[f.color] : "#FFF4E4",
                border: `1.5px solid ${active ? `${pastelInk[f.color]}33` : line}`,
                transition: "transform .15s ease, color .15s ease",
                "&:hover": { transform: "translateY(-1px)", color: pastelInk[f.color] },
              }}
            >
              {f.label}
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, pb: 1.5 }}>
        {shown.length === 0 ? (
          <EmptyState
            chibi="cat"
            chibiSize={92}
            color="purple"
            title={filter === "all" ? "Quiet in here… 💤" : `No ${filter} yet`}
            subtitle="Every edit, note and change your team makes will show up here like a little diary."
            sx={{ mt: 3 }}
          />
        ) : (
          <Stack spacing={1.1}>
            {shown.map((a, i) => {
              const d = doodleFor(a.verb);
              return (
                <Box
                  key={a.id}
                  sx={{
                    display: "flex",
                    gap: 1.1,
                    animation: i === 0 ? "log-in .25s ease" : "none",
                  }}
                >
                  <Avatar name={a.actor} color={colorFor(a.actor)} size={30} />
                  {/* chat/diary bubble */}
                  <Box
                    sx={{
                      position: "relative",
                      flex: 1,
                      minWidth: 0,
                      bgcolor: "#FFFDF8",
                      border: `1.5px solid ${line}`,
                      borderRadius: "4px 14px 14px 14px",
                      boxShadow: "0 1px 2px rgba(120,88,44,0.06)",
                      px: 1.25,
                      py: 1,
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        bgcolor: pastel[d.color],
                        color: pastelInk[d.color],
                        border: `1.5px solid ${pastelInk[d.color]}33`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: "rotate(-6deg)",
                      }}
                    >
                      {d.icon}
                    </Box>
                    <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: ink, pr: 2 }}>
                      <Box component="span" sx={{ fontWeight: 700 }}>{a.actor}</Box> {a.verb}{" "}
                      <Box component="span" sx={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 700 }}>
                        {a.target}
                      </Box>
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: secondaryText, mt: 0.25 }}>
                      in{" "}
                      <Box component="span" sx={{ fontWeight: 600 }}>{resourceName(a.resourceId)}</Box>{" "}
                      · {relativeTime(a.at)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
