"use client";

// Additive endpoint-page panel: "Used in Stories" + "Related Endpoints".
// Both read from the client-side graph/story stores and link BACK to the
// existing endpoint editor / story view — no endpoint data is duplicated here.
// Rendered as a dedicated CenterPanel tab so the existing tabs are untouched.

import { useMemo, useState } from "react";
import { Box, IconButton, MenuItem, Select, Stack, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SouthIcon from "@mui/icons-material/South";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useWorkspaceStore } from "@/lib/store";
import {
  RELATION_KINDS,
  RELATION_META,
  edgesForResource,
  useApiGraphStore,
  type RelationKind,
} from "@/lib/apiGraph";
import { storiesForResource, useApiStoryStore } from "@/lib/apiStory";
import { MonoTag } from "@/components/common";
import { PixelPanel } from "@/components/pixel/pixelBox";
import { ink, line, methodColor, pastel, secondaryText } from "@/components/theme";
import type { Resource } from "@/lib/types";

function EndpointChip({ resource, onClick }: { resource: Resource; onClick?: () => void }) {
  const method = resource.method ?? "GET";
  return (
    <Box
      role={onClick ? "button" : undefined}
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        py: 0.6,
        borderRadius: "10px",
        border: `1px solid ${line}`,
        bgcolor: "#fff",
        cursor: onClick ? "pointer" : "default",
        transition: "transform .12s ease, box-shadow .12s ease",
        "&:hover": onClick ? { transform: "translateY(-1px)", boxShadow: "0 2px 8px rgba(46,46,46,.1)" } : {},
      }}
    >
      <Box
        component="span"
        sx={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 11,
          fontWeight: 800,
          color: methodColor[method],
        }}
      >
        {method}
      </Box>
      <MonoTag sx={{ border: "none", bgcolor: "transparent", px: 0 }}>{resource.path || resource.name}</MonoTag>
    </Box>
  );
}

export function EndpointConnections({ resource }: { resource: Resource }) {
  const resources = useWorkspaceStore((s) => s.resources);
  const select = useWorkspaceStore((s) => s.select);
  const setView = useWorkspaceStore((s) => s.setView);

  const edges = useApiGraphStore((s) => s.edges);
  const addEdge = useApiGraphStore((s) => s.addEdge);
  const removeEdge = useApiGraphStore((s) => s.removeEdge);

  const stories = useApiStoryStore((s) => s.stories);
  const selectStory = useApiStoryStore((s) => s.select);

  const byId = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);
  const endpoints = useMemo(() => resources.filter((r) => r.kind === "endpoint" && r.id !== resource.id), [resources, resource.id]);

  const related = useMemo(() => edgesForResource(edges, resource.id), [edges, resource.id]);
  const usedIn = useMemo(() => storiesForResource(stories, resource.id), [stories, resource.id]);

  // Group related edges by relation kind for the labelled columns in the spec.
  const grouped = useMemo(() => {
    const map = new Map<RelationKind, { edgeId: string; other: Resource; outgoing: boolean }[]>();
    for (const e of related) {
      const outgoing = e.from === resource.id;
      const otherId = outgoing ? e.to : e.from;
      const other = byId.get(otherId);
      if (!other) continue;
      const arr = map.get(e.kind) ?? [];
      arr.push({ edgeId: e.id, other, outgoing });
      map.set(e.kind, arr);
    }
    return map;
  }, [related, resource.id, byId]);

  const [targetId, setTargetId] = useState("");
  const [kind, setKind] = useState<RelationKind>("related");

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

      {/* ── Related Endpoints ───────────────────────────────────────────── */}
      <PixelPanel>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
          <HubOutlinedIcon sx={{ fontSize: 18, color: secondaryText }} />
          <Typography variant="h2" sx={{ fontSize: 16 }}>Related Endpoints</Typography>
          <Box sx={{ ml: "auto", fontSize: 12, color: secondaryText }}>{related.length}</Box>
        </Stack>

        {related.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: secondaryText, mb: 2 }}>
            No relationships yet. Connect this endpoint to others below or in the <b>API Graph</b>.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {RELATION_KINDS.filter((k) => grouped.has(k)).map((k) => {
              const meta = RELATION_META[k];
              const items = grouped.get(k)!;
              return (
                <Box key={k}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: meta.color }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: meta.color, letterSpacing: "0.02em" }}>
                      {meta.label}
                    </Typography>
                  </Stack>
                  <Stack spacing={0.75} sx={{ pl: 0.5 }}>
                    {items.map(({ edgeId, other, outgoing }) => (
                      <Stack key={edgeId} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                        <SouthIcon sx={{ fontSize: 14, color: meta.color, transform: outgoing ? "none" : "rotate(180deg)" }} />
                        <EndpointChip resource={other} onClick={() => select(other.id)} />
                        <Tooltip title="Remove relationship">
                          <IconButton size="small" onClick={() => removeEdge(edgeId)} sx={{ ml: "auto" }}>
                            <CloseIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Add-relationship row (graph is the single store of relationships). */}
        {endpoints.length > 0 ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${line}`, alignItems: { sm: "center" } }}>
            <Select
              size="small"
              value={kind}
              onChange={(e) => setKind(e.target.value as RelationKind)}
              sx={{ minWidth: 168, fontSize: 13 }}
            >
              {RELATION_KINDS.map((k) => (
                <MenuItem key={k} value={k} sx={{ fontSize: 13, color: RELATION_META[k].color, fontWeight: 700 }}>
                  {RELATION_META[k].label}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              displayEmpty
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              sx={{ flex: 1, minWidth: 0, fontSize: 13 }}
              renderValue={(v) => {
                if (!v) return <Box component="span" sx={{ color: secondaryText }}>Choose an endpoint…</Box>;
                const r = byId.get(v);
                return r ? `${r.method ?? ""} ${r.path || r.name}` : "";
              }}
            >
              {endpoints.map((r) => (
                <MenuItem key={r.id} value={r.id} sx={{ fontSize: 13 }}>
                  <Box component="span" sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 800, color: methodColor[r.method ?? "GET"], mr: 1 }}>
                    {r.method ?? "GET"}
                  </Box>
                  {r.path || r.name}
                </MenuItem>
              ))}
            </Select>
            <Tooltip title="Add relationship">
              <span>
                <IconButton
                  disabled={!targetId}
                  onClick={() => {
                    if (!targetId) return;
                    addEdge(resource.id, targetId, kind);
                    setTargetId("");
                  }}
                  sx={{ bgcolor: pastel.purple, borderRadius: "10px", "&:hover": { bgcolor: "#E3DCFB" } }}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ) : null}
      </PixelPanel>
    </Stack>
  );
}
