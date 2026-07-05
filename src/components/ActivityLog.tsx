"use client";

import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar, relativeTime, useNow } from "@/components/common";
import { blue, blueSoft, ink, secondaryText } from "@/components/theme";
import type { ActivityEvent } from "@/lib/types";

type ActivityFilter = "all" | "edits" | "comments" | "system";

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "edits", label: "Edits" },
  { id: "comments", label: "Comments" },
  { id: "system", label: "System" },
];

// Classify a free-text verb into a coarse category for the quick filters.
function categoryOf(verb: string): Exclude<ActivityFilter, "all"> {
  const v = verb.toLowerCase();
  if (v.includes("comment")) return "comments";
  if (/(add|edit|remov|updat|renam|flag|delet|chang)/.test(v)) return "edits";
  return "system";
}

export function ActivityLog() {
  const activity = useWorkspaceStore((s) => s.activity);
  const resources = useWorkspaceStore((s) => s.resources);
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  useNow();

  const resourceName = (id: string) => resources.find((r) => r.id === id)?.name ?? "deleted";
  const colorFor = (name: string) => collaborators.find((c) => c.name === name)?.color ?? "#94A3B8";

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
                fontWeight: active ? 600 : 500,
                color: active ? blue : secondaryText,
                bgcolor: active ? blueSoft : "#F4F6F9",
                transition: "background-color .15s ease, color .15s ease",
                "&:hover": { bgcolor: active ? blueSoft : "#EAEEF3" },
              }}
            >
              {f.label}
            </Box>
          );
        })}
      </Stack>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 1.5 }}>
        {shown.length === 0 ? (
          <Stack spacing={1.25} sx={{ alignItems: "center", mt: 6, color: "#B8C1CD", textAlign: "center", px: 3 }}>
            <HistoryIcon sx={{ fontSize: 30 }} />
            <Typography sx={{ fontSize: 13, color: secondaryText }}>
              {filter === "all" ? "No activity yet." : `No ${filter} activity yet.`}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={0}>
            {shown.map((a, i) => (
              <Box
                key={a.id}
                sx={{
                  display: "flex",
                  gap: 1.25,
                  py: 1.25,
                  px: 1,
                  borderRadius: "10px",
                  animation: i === 0 ? "log-in .25s ease" : "none",
                  transition: "background-color .15s ease",
                  "&:hover": { bgcolor: "#F4F6F9" },
                }}
              >
                <Avatar name={a.actor} color={colorFor(a.actor)} size={28} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: ink }}>
                    <Box component="span" sx={{ fontWeight: 600 }}>{a.actor}</Box> {a.verb}{" "}
                    <Box component="span" sx={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 600 }}>
                      {a.target}
                    </Box>
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: secondaryText, mt: 0.15 }}>
                    in{" "}
                    <Box component="span" sx={{ fontWeight: 600, color: secondaryText }}>
                      {resourceName(a.resourceId)}
                    </Box>{" "}
                    · {relativeTime(a.at)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
