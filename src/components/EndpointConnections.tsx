"use client";

// Additive endpoint-page panel: "Used in Stories". Reads from the client-side
// story store and links BACK to the story view — no endpoint data is duplicated
// here. Rendered as a dedicated CenterPanel tab so the existing tabs are untouched.

import { useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useWorkspaceStore } from "@/lib/store";
import { storiesForResource, useApiStoryStore } from "@/lib/apiStory";
import { PixelPanel } from "@/components/pixel/pixelBox";
import { ink, pastel, secondaryText } from "@/components/theme";
import type { Resource } from "@/lib/types";

export function EndpointConnections({ resource }: { resource: Resource }) {
  const setView = useWorkspaceStore((s) => s.setView);

  const stories = useApiStoryStore((s) => s.stories);
  const selectStory = useApiStoryStore((s) => s.select);

  const usedIn = useMemo(() => storiesForResource(stories, resource.id), [stories, resource.id]);

  const openStory = (storyId: string) => {
    selectStory(storyId);
    setView("story");
  };

  return (
    <Stack spacing={2.5} sx={{ animation: "fade-in .2s ease" }}>
      {/* ── Used in Stories ─────────────────────────────────────────────── */}
      <PixelPanel>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <AutoStoriesOutlinedIcon sx={{ fontSize: 18, color: secondaryText }} />
          <Typography variant="h2" sx={{ fontSize: 16 }}>Used in Stories</Typography>
          <Box sx={{ ml: "auto", fontSize: 12, color: secondaryText }}>{usedIn.length}</Box>
        </Stack>
        {usedIn.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: secondaryText }}>
            Not part of any flow yet. Add this endpoint to a flow in <b>API Story</b>.
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {usedIn.map((s) => (
              <Box
                key={s.id}
                role="button"
                onClick={() => openStory(s.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.25,
                  py: 0.9,
                  borderRadius: "10px",
                  cursor: "pointer",
                  "&:hover": { bgcolor: pastel.purple },
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#8B7CF6" }} />
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: ink }}>{s.name}</Typography>
                <ArrowForwardIcon sx={{ fontSize: 15, color: secondaryText, ml: "auto" }} />
              </Box>
            ))}
          </Stack>
        )}
      </PixelPanel>
    </Stack>
  );
}
