"use client";

import { Box, InputBase, Stack, Tooltip, Typography } from "@mui/material";
import ApiIcon from "@mui/icons-material/Api";
import StorageIcon from "@mui/icons-material/Storage";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorderOutlined";
import { useState } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { useBookmarkStore } from "@/lib/bookmarks";
import { openProposalCount, useProposalStore } from "@/lib/proposals";
import { ENDPOINT_STATUSES, ENDPOINT_STATUS_META, DEFAULT_ENDPOINT_STATUS, useEndpointStatusStore } from "@/lib/endpointStatus";
import { Sticker, EmptyState } from "@/components/common";
import { DoodleSparkle } from "@/components/doodles";
import { ink, line, methodColor, pastel, pastelInk, secondaryText } from "@/components/theme";
import type { EndpointStatus, Resource, ResourceKind } from "@/lib/types";

type StatusFilter = EndpointStatus | "all";

const GROUPS: { kind: ResourceKind; label: string; icon: React.ReactNode; color: keyof typeof pastel }[] = [
  { kind: "endpoint", label: "API Endpoints", icon: <ApiIcon sx={{ fontSize: 15 }} />, color: "blue" },
  { kind: "database", label: "Databases", icon: <StorageIcon sx={{ fontSize: 15 }} />, color: "mint" },
];

const STATE_DOT: Record<Resource["state"], string> = {
  draft: "#E0A13C",
  ready: "#4FB477",
  breaking: "#E86A6A",
};

// Map endpoint workflow status onto a pastel crayon for the filter pills.
const STATUS_PASTEL: Record<EndpointStatus, keyof typeof pastel> = {
  draft: "cream",
  inprogress: "blue",
  testing: "yellow",
  done: "mint",
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
          borderRadius: "8px",
          color: bookmarked ? "#F0A93C" : "#D3C3A6",
          opacity: bookmarked ? 1 : 0,
          transition: "opacity .15s ease, color .15s ease, transform .15s ease",
          "&:hover": { color: "#F0A93C", transform: "rotate(-12deg) scale(1.15)" },
        }}
      >
        {bookmarked ? <StarIcon sx={{ fontSize: 17 }} /> : <StarBorderIcon sx={{ fontSize: 17 }} />}
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
  const label = status ? ENDPOINT_STATUS_META[status].label : "All";
  const crayon = status ? STATUS_PASTEL[status] : "pink";
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
        px: 1.1,
        py: 0.4,
        borderRadius: "999px",
        bgcolor: active ? pastel[crayon] : "#FFF4E4",
        color: active ? pastelInk[crayon] : secondaryText,
        border: `1.5px solid ${active ? `${pastelInk[crayon]}33` : line}`,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        opacity: count || active ? 1 : 0.55,
        transition: "background-color .15s ease, color .15s ease, transform .15s ease",
        "&:hover": { transform: "translateY(-1px) rotate(-1deg)", color: pastelInk[crayon] },
      }}
    >
      {label}
      <Box component="span" sx={{ fontSize: 10.5, fontWeight: 800, opacity: 0.8 }}>{count}</Box>
    </Box>
  );
}

// A little "📝 n" tag on endpoints with open (unpublished) proposals.
function ProposalBadge({ resourceId }: { resourceId: string }) {
  const count = useProposalStore((s) => openProposalCount(s.byId, resourceId));
  if (!count) return null;
  return (
    <Tooltip title={`${count} open proposal${count > 1 ? "s" : ""}`}>
      <Box
        component="span"
        sx={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          px: 0.6,
          py: 0.15,
          borderRadius: "999px",
          bgcolor: pastel.purple,
          color: pastelInk.purple,
          border: `1.5px solid ${pastelInk.purple}33`,
          fontSize: 10,
          fontWeight: 800,
          lineHeight: 1.4,
        }}
      >
        📝 {count}
      </Box>
    </Tooltip>
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
        mb: 0.6,
        borderRadius: "14px",
        cursor: "pointer",
        bgcolor: active ? "#FFFDF8" : "transparent",
        border: `1.5px solid ${active ? pastel.pink : "transparent"}`,
        boxShadow: active ? "0 3px 12px rgba(120,88,44,0.12)" : "none",
        transform: active ? "rotate(-0.6deg)" : "none",
        transition: "background-color .15s ease, border-color .15s ease, transform .15s ease",
        "&:hover": {
          bgcolor: active ? "#FFFDF8" : "#FFF6E9",
          "& .bookmark-star": { opacity: 1 },
        },
        // highlighter marker down the selected page edge
        "&::before": active
          ? { content: '""', position: "absolute", left: -1, top: 8, bottom: 8, width: 4, borderRadius: 999, bgcolor: "#F5799F" }
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
            fontWeight: 800,
            letterSpacing: "0.02em",
            color: methodColor[r.method],
            bgcolor: `${methodColor[r.method]}1A`,
            border: `1.5px solid ${methodColor[r.method]}33`,
            borderRadius: "8px",
            py: 0.35,
          }}
        >
          {r.method}
        </Box>
      ) : (
        <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: STATE_DOT[r.state], flexShrink: 0, ml: 0.5, mr: 0.5, border: "1.5px solid #fff", boxShadow: "0 0 0 1.5px rgba(120,88,44,0.15)" }} />
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: active ? 700 : 600, fontSize: 13, color: ink, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.name}
        </Typography>
        {r.kind === "endpoint" && r.path ? (
          <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 10.5, color: secondaryText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.path}
          </Typography>
        ) : null}
      </Box>
      {r.kind === "endpoint" ? <ProposalBadge resourceId={r.id} /> : null}
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

  const matchesStatus = (r: Resource) =>
    statusFilter === "all" || (r.kind === "endpoint" && statusOf(r) === statusFilter);

  const q = nameQuery.trim().toLowerCase();
  const matchesName = (r: Resource) =>
    !q || r.name.toLowerCase().includes(q) || (r.path?.toLowerCase().includes(q) ?? false);

  const endpoints = resources.filter((r) => r.kind === "endpoint");
  const statusCounts = ENDPOINT_STATUSES.reduce(
    (acc, s) => ((acc[s] = endpoints.filter((r) => statusOf(r) === s).length), acc),
    {} as Record<EndpointStatus, number>,
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", borderRight: `2px dashed ${line}`, bgcolor: "#FFFAF0" }}>
      <Box sx={{ px: 2, pt: 2.25, pb: 1.5 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Sticker color="pink">✎ My Pages</Sticker>
          <DoodleSparkle size={15} className="animate-twinkle" />
        </Stack>
        <Box
          sx={{
            mt: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.4,
            height: 42,
            borderRadius: "999px",
            bgcolor: "#FFFDF8",
            border: `1.5px solid ${line}`,
            transition: "border-color .15s ease, box-shadow .15s ease",
            "&:focus-within": { borderColor: "#F5799F", boxShadow: `0 0 0 3px #FFE6EE` },
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: secondaryText }} />
          <InputBase
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="find a page…"
            sx={{ flex: 1, fontSize: 13 }}
          />
          {nameQuery ? (
            <Box
              role="button"
              aria-label="Clear search"
              onClick={() => setNameQuery("")}
              sx={{ display: "flex", cursor: "pointer", color: "#D3C3A6", "&:hover": { color: ink } }}
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

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, pb: 2 }}>
        {GROUPS.map(({ kind, label, icon, color }) => {
          if (statusFilter !== "all" && kind !== "endpoint") return null;
          const items = resources
            .filter((r) => r.kind === kind && matchesStatus(r) && matchesName(r))
            .sort((a, b) => (bookmarkIds[b.id] ? 1 : 0) - (bookmarkIds[a.id] ? 1 : 0));
          return (
            <Box key={kind} sx={{ mb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 0.5, mt: 1.5, mb: 0.75 }}>
                <Sticker color={color}>
                  {icon}
                  {label}
                  <Box component="span" sx={{ opacity: 0.65 }}>{items.length}</Box>
                </Sticker>
                <Tooltip title={`New ${kind}`}>
                  <Box
                    role="button"
                    aria-label={`New ${kind}`}
                    onClick={() => addResource(kind)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: "9px",
                      cursor: "pointer",
                      color: pastelInk[color],
                      bgcolor: pastel[color],
                      border: `1.5px solid ${pastelInk[color]}33`,
                      transition: "transform .15s ease",
                      "&:hover": { transform: "rotate(90deg) scale(1.05)" },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 17 }} />
                  </Box>
                </Tooltip>
              </Box>
              {items.length === 0 ? (
                <EmptyState
                  chibi={kind === "endpoint" ? "bird" : "cat"}
                  chibiSize={60}
                  color={color}
                  title={q || statusFilter !== "all" ? "Nothing matches…" : "Let's start a page!"}
                  sx={{ py: 2, px: 1, gap: 1 }}
                />
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
