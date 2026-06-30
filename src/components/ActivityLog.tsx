"use client";

import { Box, Stack, Typography } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar, relativeTime, useNow } from "@/components/common";
import { line } from "@/components/theme";

export function ActivityLog() {
  const activity = useWorkspaceStore((s) => s.activity);
  const resources = useWorkspaceStore((s) => s.resources);
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  useNow();

  const resourceName = (id: string) => resources.find((r) => r.id === id)?.name ?? "deleted";
  const colorFor = (name: string) => collaborators.find((c) => c.name === name)?.color ?? "#71717A";

  return (
    <Box sx={{ p: 1.5, overflowY: "auto", height: "100%" }}>
      {activity.length === 0 ? (
        <Stack spacing={1} sx={{ alignItems: "center", mt: 5, color: "#A1A1AA" }}>
          <HistoryIcon sx={{ fontSize: 32 }} />
          <Typography sx={{ fontSize: 13 }}>No activity yet.</Typography>
        </Stack>
      ) : (
        <Stack spacing={0}>
          {activity.map((a, i) => (
            <Box
              key={a.id}
              sx={{
                display: "flex",
                gap: 1.25,
                py: 1.25,
                px: 0.5,
                borderBottom: i === activity.length - 1 ? "none" : `1.5px solid #E4E4E7`,
                animation: i === 0 ? "log-in .25s ease" : "none",
              }}
            >
              <Avatar name={a.actor} color={colorFor(a.actor)} size={26} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, lineHeight: 1.4 }}>
                  <b>{a.actor}</b> {a.verb}{" "}
                  <Box component="span" sx={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 700 }}>
                    {a.target}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: 11, color: "#71717A" }}>
                  in{" "}
                  <Box component="span" sx={{ fontWeight: 700, color: line }}>
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
  );
}
