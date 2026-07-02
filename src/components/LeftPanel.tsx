"use client";

import { Box, Stack, Tooltip, Typography } from "@mui/material";
import ApiIcon from "@mui/icons-material/Api";
import StorageIcon from "@mui/icons-material/Storage";
import AddIcon from "@mui/icons-material/Add";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorderOutlined";
import { useState } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { useBookmarkStore } from "@/lib/bookmarks";
import { ENDPOINT_STATUSES, ENDPOINT_STATUS_META, DEFAULT_ENDPOINT_STATUS, useEndpointStatusStore } from "@/lib/endpointStatus";
import { MonoTag } from "@/components/common";
import { line, methodColor, stateColor } from "@/components/theme";
import type { EndpointStatus, Resource, ResourceKind } from "@/lib/types";

type StatusFilter = EndpointStatus | "all";

const GROUPS: { kind: ResourceKind; label: string; icon: React.ReactNode }[] = [
  { kind: "endpoint", label: "API Endpoints", icon: <ApiIcon sx={{ fontSize: 16 }} /> },
  { kind: "database", label: "Databases", icon: <StorageIcon sx={{ fontSize: 16 }} /> },
];

function StateDot({ state }: { state: Resource["state"] }) {
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        border: `2px solid ${line}`,
        bgcolor: stateColor[state].bg,
        flexShrink: 0,
      }}
    />
  );
}

function BookmarkStar({ resourceId }: { resourceId: string }) {
  const bookmarked = useBookmarkStore((s) => Boolean(s.ids[resourceId]));
  const toggle = useBookmarkStore((s) => s.toggle);
  return (
    <Tooltip title={bookmarked ? "Remove bookmark" : "Bookmark this endpoint"}>
      <Box
        role="button"
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
        onClick={(e) => {
          e.stopPropagation();
          toggle(resourceId);
        }}
        className="bookmark-star"
        sx={{
          display: "flex",
          flexShrink: 0,
          p: 0.25,
          borderRadius: "6px",
          color: bookmarked ? "#F59E0B" : "#A1A1AA",
          opacity: bookmarked ? 1 : 0,
          "&:hover": { color: "#F59E0B", bgcolor: "#FEF3C7" },
        }}
      >
        {bookmarked ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
      </Box>
    </Tooltip>
  );
}

// Clickable status pill that filters the explorer by endpoint workflow status.
function StatusFilterChip({
  status,
  active,
  count,
  onClick,
}: {
  status?: EndpointStatus;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const meta = status ? ENDPOINT_STATUS_META[status] : { label: "All", bg: "#0A0A0A", fg: "#fff" };
  return (
    <Box
      role="button"
      aria-pressed={active}
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.4,
        cursor: "pointer",
        px: 0.75,
        py: 0.2,
        borderRadius: "6px",
        border: `2px solid ${line}`,
        bgcolor: active ? meta.bg : "#fff",
        color: active ? meta.fg : "#71717A",
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        boxShadow: active ? "2px 2px 0 #0A0A0A" : "none",
        opacity: count || active ? 1 : 0.4,
        transition: "background .1s ease",
      }}
    >
      {meta.label}
      <Box component="span" sx={{ fontSize: 9, opacity: 0.7 }}>
        {count}
      </Box>
    </Box>
  );
}

function ResourceRow({ r, onNavigate }: { r: Resource; onNavigate?: () => void }) {
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const select = useWorkspaceStore((s) => s.select);
  const active = r.id === selectedId;
  return (
    <Box
      role="button"
      onClick={() => {
        select(r.id);
        onNavigate?.();
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1,
        py: 0.85,
        mb: 0.5,
        borderRadius: "8px",
        cursor: "pointer",
        border: `2px solid ${active ? line : "transparent"}`,
        bgcolor: active ? "#fff" : "transparent",
        boxShadow: active ? "3px 3px 0 #0A0A0A" : "none",
        transition: "background .1s ease",
        "&:hover": { bgcolor: active ? "#fff" : "#E9E9EC", "& .bookmark-star": { opacity: 1 } },
      }}
    >
      <StateDot state={r.state} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.name}
        </Typography>
        {r.kind === "endpoint" && r.path ? (
          <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 10.5, color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.path}
          </Typography>
        ) : null}
      </Box>
      {r.kind === "endpoint" && r.method ? (
        <MonoTag sx={{ color: methodColor[r.method], fontSize: 9.5, px: 0.5 }}>{r.method}</MonoTag>
      ) : null}
      <BookmarkStar resourceId={r.id} />
    </Box>
  );
}

export function LeftPanel({ onNavigate }: { onNavigate?: () => void } = {}) {
  const resources = useWorkspaceStore((s) => s.resources);
  const addResource = useWorkspaceStore((s) => s.addResource);
  const bookmarkIds = useBookmarkStore((s) => s.ids);
  const statusByResource = useEndpointStatusStore((s) => s.byResource);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const statusOf = (r: Resource): EndpointStatus => statusByResource[r.id] ?? DEFAULT_ENDPOINT_STATUS;

  // Status filter only applies to endpoints (databases have no workflow status).
  const matchesStatus = (r: Resource) =>
    statusFilter === "all" || (r.kind === "endpoint" && statusOf(r) === statusFilter);

  const endpoints = resources.filter((r) => r.kind === "endpoint");
  const statusCounts = ENDPOINT_STATUSES.reduce(
    (acc, s) => ((acc[s] = endpoints.filter((r) => statusOf(r) === s).length), acc),
    {} as Record<EndpointStatus, number>,
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", borderRight: `2px solid ${line}`, bgcolor: "#FAFAFA" }}>
      <Box sx={{ p: 2, borderBottom: `2px solid ${line}` }}>
        <Typography variant="h2">Explorer</Typography>
        <Stack direction="row" sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
          <StatusFilterChip
            active={statusFilter === "all"}
            count={endpoints.length}
            onClick={() => setStatusFilter("all")}
          />
          {ENDPOINT_STATUSES.map((s) => (
            <StatusFilterChip
              key={s}
              status={s}
              active={statusFilter === s}
              count={statusCounts[s]}
              onClick={() => setStatusFilter((prev) => (prev === s ? "all" : s))}
            />
          ))}
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
        {GROUPS.map(({ kind, label, icon }) => {
          // A status filter is endpoint-only — collapse the other groups.
          if (statusFilter !== "all" && kind !== "endpoint") return null;
          // Keep bookmarks inline (no separate section) but pinned to the top of
          // the group. Array.sort is stable, so non-bookmarked order is preserved.
          const items = resources
            .filter((r) => r.kind === kind && matchesStatus(r))
            .sort((a, b) => (bookmarkIds[b.id] ? 1 : 0) - (bookmarkIds[a.id] ? 1 : 0));
          return (
            <Box key={kind} sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, mb: 0.75 }}>
                <Stack direction="row" spacing={0.75} sx={{ color: line, alignItems: "center" }}>
                  {icon}
                  <Typography variant="h3" sx={{ fontSize: 11 }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#A1A1AA" }}>
                    {items.length}
                  </Typography>
                </Stack>
                <Tooltip title={`New ${kind}`}>
                  <Box
                    role="button"
                    aria-label={`New ${kind}`}
                    onClick={() => addResource(kind)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "7px",
                      border: "2px solid transparent",
                      cursor: "pointer",
                      color: "#71717A",
                      transition: "all .12s ease",
                      "&:hover": { color: line, borderColor: line, bgcolor: "#fff", boxShadow: "2px 2px 0 #0A0A0A" },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Tooltip>
              </Box>
              {items.length === 0 ? (
                <Typography sx={{ px: 1, fontSize: 12, color: "#A1A1AA", fontStyle: "italic" }}>None yet</Typography>
              ) : (
                items.map((r) => <ResourceRow key={r.id} r={r} onNavigate={onNavigate} />)
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
