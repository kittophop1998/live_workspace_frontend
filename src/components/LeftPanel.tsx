"use client";

import { Box, InputBase, Stack, Tooltip, Typography } from "@mui/material";
import ApiIcon from "@mui/icons-material/Api";
import StorageIcon from "@mui/icons-material/Storage";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorderOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { useState } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { useBookmarkStore } from "@/lib/bookmarks";
import { ENDPOINT_STATUSES, ENDPOINT_STATUS_META, DEFAULT_ENDPOINT_STATUS, useEndpointStatusStore } from "@/lib/endpointStatus";
import { blue, blueSoft, ink, line, methodColor, secondaryText } from "@/components/theme";
import type { EndpointStatus, Resource, ResourceKind } from "@/lib/types";

type StatusFilter = EndpointStatus | "all";

const GROUPS: { kind: ResourceKind; label: string; icon: React.ReactNode }[] = [
  { kind: "endpoint", label: "API Endpoints", icon: <ApiIcon sx={{ fontSize: 15 }} /> },
  { kind: "database", label: "Databases", icon: <StorageIcon sx={{ fontSize: 15 }} /> },
];

const STATE_DOT: Record<Resource["state"], string> = {
  draft: "#F59E0B",
  ready: "#22C55E",
  breaking: "#EF4444",
};

function BookmarkStar({ resourceId }: { resourceId: string }) {
  const bookmarked = useBookmarkStore((s) => Boolean(s.ids[resourceId]));
  const toggle = useBookmarkStore((s) => s.toggle);
  return (
    <Tooltip title={bookmarked ? "Remove favorite" : "Add to favorites"}>
      <Box
        role="button"
        aria-label={bookmarked ? "Remove favorite" : "Favorite"}
        onClick={(e) => {
          e.stopPropagation();
          toggle(resourceId);
        }}
        className="bookmark-star"
        sx={{
          display: "flex",
          flexShrink: 0,
          p: 0.3,
          borderRadius: "7px",
          color: bookmarked ? "#F59E0B" : "#B8C1CD",
          opacity: bookmarked ? 1 : 0,
          transition: "opacity .15s ease, color .15s ease, background-color .15s ease",
          "&:hover": { color: "#F59E0B", bgcolor: "#FEF6E7" },
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
  const meta = status ? ENDPOINT_STATUS_META[status] : { label: "All", bg: blueSoft, fg: blue };
  return (
    <Box
      role="button"
      aria-pressed={active}
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        cursor: "pointer",
        px: 1,
        py: 0.4,
        borderRadius: "999px",
        bgcolor: active ? meta.bg : "#F4F6F9",
        color: active ? meta.fg : secondaryText,
        fontSize: 11,
        fontWeight: active ? 600 : 500,
        whiteSpace: "nowrap",
        opacity: count || active ? 1 : 0.55,
        transition: "background-color .15s ease, color .15s ease",
        "&:hover": { bgcolor: active ? meta.bg : "#EAEEF3" },
      }}
    >
      {meta.label}
      <Box component="span" sx={{ fontSize: 10.5, fontWeight: 600, opacity: 0.8 }}>
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
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.25,
        py: 1,
        mb: 0.25,
        borderRadius: "10px",
        cursor: "pointer",
        bgcolor: active ? blueSoft : "transparent",
        transition: "background-color .15s ease",
        "&:hover": { bgcolor: active ? blueSoft : "#F4F6F9", "& .bookmark-star": { opacity: 1 } },
        "&::before": active
          ? { content: '""', position: "absolute", left: 3, top: "50%", transform: "translateY(-50%)", width: 3, height: 18, borderRadius: 2, bgcolor: blue }
          : {},
      }}
    >
      {r.kind === "endpoint" && r.method ? (
        <Box
          sx={{
            flexShrink: 0,
            width: 46,
            textAlign: "center",
            fontFamily: "var(--font-mono,monospace)",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: methodColor[r.method],
            bgcolor: `${methodColor[r.method]}14`,
            borderRadius: "6px",
            py: 0.35,
          }}
        >
          {r.method}
        </Box>
      ) : (
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATE_DOT[r.state], flexShrink: 0, ml: 0.5, mr: 0.5 }} />
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: active ? 600 : 500, fontSize: 13, color: ink, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.name}
        </Typography>
        {r.kind === "endpoint" && r.path ? (
          <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 10.5, color: secondaryText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.path}
          </Typography>
        ) : null}
      </Box>
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
  const [nameQuery, setNameQuery] = useState("");

  const statusOf = (r: Resource): EndpointStatus => statusByResource[r.id] ?? DEFAULT_ENDPOINT_STATUS;

  // Status filter only applies to endpoints (databases have no workflow status).
  const matchesStatus = (r: Resource) =>
    statusFilter === "all" || (r.kind === "endpoint" && statusOf(r) === statusFilter);

  // Client-side name filter (matches name or path, case-insensitive).
  const q = nameQuery.trim().toLowerCase();
  const matchesName = (r: Resource) =>
    !q || r.name.toLowerCase().includes(q) || (r.path?.toLowerCase().includes(q) ?? false);

  const endpoints = resources.filter((r) => r.kind === "endpoint");
  const statusCounts = ENDPOINT_STATUSES.reduce(
    (acc, s) => ((acc[s] = endpoints.filter((r) => statusOf(r) === s).length), acc),
    {} as Record<EndpointStatus, number>,
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", borderRight: `1px solid ${line}`, bgcolor: "#fff" }}>
      <Box sx={{ px: 2, pt: 2.5, pb: 1.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: ink, letterSpacing: "0.02em" }}>Explorer</Typography>
        <Box
          sx={{
            mt: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.25,
            height: 40,
            borderRadius: "10px",
            bgcolor: "#F4F6F9",
            border: "1px solid transparent",
            transition: "border-color .15s ease, background-color .15s ease, box-shadow .15s ease",
            "&:focus-within": { bgcolor: "#fff", borderColor: blue, boxShadow: `0 0 0 3px ${blueSoft}` },
          }}
        >
          <SearchIcon sx={{ fontSize: 17, color: secondaryText }} />
          <InputBase
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Search endpoints…"
            sx={{ flex: 1, fontSize: 13 }}
          />
          {nameQuery ? (
            <Box
              role="button"
              aria-label="Clear search"
              onClick={() => setNameQuery("")}
              sx={{ display: "flex", cursor: "pointer", color: "#B8C1CD", "&:hover": { color: ink } }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </Box>
          ) : null}
        </Box>
        <Stack direction="row" sx={{ mt: 1.25, flexWrap: "wrap", gap: 0.6 }}>
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

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.25, pb: 2 }}>
        {GROUPS.map(({ kind, label, icon }) => {
          // A status filter is endpoint-only — collapse the other groups.
          if (statusFilter !== "all" && kind !== "endpoint") return null;
          // Keep bookmarks inline (no separate section) but pinned to the top of
          // the group. Array.sort is stable, so non-bookmarked order is preserved.
          const items = resources
            .filter((r) => r.kind === kind && matchesStatus(r) && matchesName(r))
            .sort((a, b) => (bookmarkIds[b.id] ? 1 : 0) - (bookmarkIds[a.id] ? 1 : 0));
          return (
            <Box key={kind} sx={{ mb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.25, mt: 1.5, mb: 0.5 }}>
                <Stack direction="row" spacing={0.75} sx={{ color: secondaryText, alignItems: "center" }}>
                  {icon}
                  <Typography sx={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: secondaryText }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#B8C1CD" }}>
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
                      cursor: "pointer",
                      color: secondaryText,
                      transition: "all .15s ease",
                      "&:hover": { color: blue, bgcolor: blueSoft },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 17 }} />
                  </Box>
                </Tooltip>
              </Box>
              {items.length === 0 ? (
                <Stack spacing={0.75} sx={{ alignItems: "center", py: 3, px: 2, color: "#B8C1CD", textAlign: "center" }}>
                  <InboxOutlinedIcon sx={{ fontSize: 24 }} />
                  <Typography sx={{ fontSize: 12, color: secondaryText }}>
                    {q || statusFilter !== "all" ? "No matches" : `No ${kind}s yet`}
                  </Typography>
                </Stack>
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
