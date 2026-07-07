"use client";

// Contextual inspector for the selected graph node. Replaces the old inline
// relationship editor with a tabbed reader: Overview · Relationships · Stories ·
// Activity. It never duplicates endpoint data — every row links BACK to the
// endpoint editor / story view / another node. Edge creation happens on the
// canvas (drag), so there is no relationship dropdown here.

import { useMemo, useState } from "react";
import { Box, IconButton, MenuItem, Select, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SouthIcon from "@mui/icons-material/South";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import {
  RELATION_KINDS,
  RELATION_META,
  activityForResource,
  edgesForResource,
  useApiGraphStore,
  type RelationKind,
} from "@/lib/apiGraph";
import { RELATION_ICON } from "@/components/graph/relationIcons";
import { storiesForResource, useApiStoryStore } from "@/lib/apiStory";
import {
  DEFAULT_ENDPOINT_STATUS,
  ENDPOINT_STATUS_META,
  useEndpointStatusStore,
} from "@/lib/endpointStatus";
import { ink, line, methodColor, pastel, secondaryText } from "@/components/theme";
import type { Resource } from "@/lib/types";

type Tab4 = "overview" | "relationships" | "stories" | "activity";

export function GraphInspector({
  resource,
  byId,
  groups,
  currentGroupId,
  actor,
  onOpenNode,
  onOpenEditor,
  onOpenStory,
  onSetGroup,
  onClose,
}: {
  resource: Resource;
  byId: Map<string, Resource>;
  groups: { id: string; label: string; color: string }[];
  currentGroupId: string;
  actor?: string;
  onOpenNode: (id: string) => void;
  onOpenEditor: () => void;
  onOpenStory: (storyId: string) => void;
  onSetGroup: (groupId: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab4>("overview");

  const edges = useApiGraphStore((s) => s.edges);
  const activity = useApiGraphStore((s) => s.activity);
  const removeEdge = useApiGraphStore((s) => s.removeEdge);
  const stories = useApiStoryStore((s) => s.stories);
  const status = useEndpointStatusStore((s) => s.byResource[resource.id] ?? DEFAULT_ENDPOINT_STATUS);

  const related = useMemo(() => edgesForResource(edges, resource.id), [edges, resource.id]);
  const usedIn = useMemo(() => storiesForResource(stories, resource.id), [stories, resource.id]);
  const history = useMemo(() => activityForResource(activity, resource.id), [activity, resource.id]);

  const grouped = useMemo(() => {
    const map = new Map<RelationKind, { edgeId: string; other: Resource; outgoing: boolean }[]>();
    for (const e of related) {
      const outgoing = e.from === resource.id;
      const other = byId.get(outgoing ? e.to : e.from);
      if (!other) continue;
      const arr = map.get(e.kind) ?? [];
      arr.push({ edgeId: e.id, other, outgoing });
      map.set(e.kind, arr);
    }
    return map;
  }, [related, resource.id, byId]);

  const st = ENDPOINT_STATUS_META[status];

  return (
    <Box
      sx={{
        width: 312,
        flexShrink: 0,
        height: "100%",
        borderLeft: `1px solid ${line}`,
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", p: 1.75, pb: 1.25 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: ink, lineHeight: 1.2 }}>{resource.name}</Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 0.4 }}>
            <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: methodColor[resource.method ?? "GET"] }}>
              {resource.method ?? "GET"}
            </Box>
            <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11.5, color: secondaryText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {resource.path || "(no path)"}
            </Box>
          </Stack>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ minHeight: 36, borderBottom: `1px solid ${line}`, "& .MuiTab-root": { minHeight: 36, fontSize: 12, fontWeight: 700, textTransform: "none", minWidth: 0, px: 0.5 } }}
      >
        <Tab value="overview" label="Overview" />
        <Tab value="relationships" label={`Links (${related.length})`} />
        <Tab value="stories" label={`Stories (${usedIn.length})`} />
        <Tab value="activity" label="Activity" />
      </Tabs>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.75 }}>
        {tab === "overview" ? (
          <Stack spacing={1.5}>
            <MetaRow label="Method" value={<Box component="span" sx={{ fontFamily: "monospace", fontWeight: 800, color: methodColor[resource.method ?? "GET"] }}>{resource.method ?? "GET"}</Box>} />
            <MetaRow label="Path" value={<Box component="span" sx={{ fontFamily: "monospace", fontSize: 12, color: ink }}>{resource.path || "—"}</Box>} />
            <MetaRow label="Status" value={<Box component="span" sx={{ px: 0.9, py: 0.2, borderRadius: "6px", fontSize: 11, fontWeight: 700, bgcolor: st.bg, color: st.fg }}>{st.label}</Box>} />
            <MetaRow label="Owner" value={<Typography sx={{ fontSize: 12.5, color: ink }}>{resource.updatedBy || "—"}</Typography>} />
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: secondaryText, mb: 0.5, letterSpacing: "0.05em", textTransform: "uppercase" }}>Feature Group</Typography>
              <Select
                size="small"
                fullWidth
                value={groups.some((g) => g.id === currentGroupId) ? currentGroupId : ""}
                onChange={(e) => onSetGroup(e.target.value)}
                sx={{ fontSize: 13 }}
              >
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id} sx={{ fontSize: 13 }}>
                    <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: g.color, display: "inline-block", mr: 1 }} />
                    {g.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
            <Box
              role="button"
              onClick={onOpenEditor}
              sx={{ mt: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 0.9, borderRadius: "10px", bgcolor: pastel.purple, color: "#6D5DD3", fontSize: 13, fontWeight: 800, cursor: "pointer", "&:hover": { bgcolor: "#E3DCFB" } }}
            >
              <OpenInNewIcon sx={{ fontSize: 15 }} /> Open Endpoint Editor
            </Box>
          </Stack>
        ) : null}

        {tab === "relationships" ? (
          related.length === 0 ? (
            <EmptyHint>No relationships yet. Drag from this node’s handle to another to link them.</EmptyHint>
          ) : (
            <Stack spacing={1.75}>
              {RELATION_KINDS.filter((k) => grouped.has(k)).map((k) => {
                const meta = RELATION_META[k];
                const Icon = RELATION_ICON[k];
                return (
                  <Box key={k}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.75 }}>
                      <Icon sx={{ fontSize: 15, color: meta.color }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: meta.color }}>{meta.label}</Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      {grouped.get(k)!.map(({ edgeId, other, outgoing }) => (
                        <Stack key={edgeId} direction="row" spacing={0.5} sx={{ alignItems: "center", px: 0.75, py: 0.5, borderRadius: "8px", "&:hover": { bgcolor: pastel.cream } }}>
                          <SouthIcon sx={{ fontSize: 13, color: meta.color, flexShrink: 0, transform: outgoing ? "none" : "rotate(180deg)" }} />
                          <Box sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpenNode(other.id)}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {other.name}
                            </Typography>
                            <Typography sx={{ fontSize: 10.5, fontFamily: "monospace", color: secondaryText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {other.method ?? "GET"} {other.path || ""}
                            </Typography>
                          </Box>
                          <Tooltip title="Remove"><IconButton size="small" onClick={() => removeEdge(edgeId, actor)}><CloseIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )
        ) : null}

        {tab === "stories" ? (
          usedIn.length === 0 ? (
            <EmptyHint>Not part of any flow yet. Add it to a flow in API Story.</EmptyHint>
          ) : (
            <Stack spacing={0.5}>
              {usedIn.map((s) => (
                <Box
                  key={s.id}
                  role="button"
                  onClick={() => onOpenStory(s.id)}
                  sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.85, borderRadius: "10px", cursor: "pointer", "&:hover": { bgcolor: pastel.purple } }}
                >
                  <AutoStoriesOutlinedIcon sx={{ fontSize: 16, color: "#8B7CF6" }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: ink, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</Typography>
                  <ArrowForwardIcon sx={{ fontSize: 15, color: secondaryText }} />
                </Box>
              ))}
            </Stack>
          )
        ) : null}

        {tab === "activity" ? (
          history.length === 0 ? (
            <EmptyHint>No graph activity for this endpoint yet.</EmptyHint>
          ) : (
            <Stack spacing={1}>
              {history.map((a) => (
                <Stack key={a.id} direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#8B7CF6", mt: 0.7, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, color: ink }}>
                      <b>{a.actor}</b> {a.action}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: secondaryText }}>{relTime(a.at)}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          )
        ) : null}
      </Box>
    </Box>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: secondaryText, width: 66, flexShrink: 0 }}>{label}</Typography>
      <Box sx={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{value}</Box>
    </Stack>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontSize: 12.5, color: secondaryText, lineHeight: 1.5 }}>{children}</Typography>;
}

function relTime(iso: string): string {
  const d = +new Date(iso);
  if (Number.isNaN(d)) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
