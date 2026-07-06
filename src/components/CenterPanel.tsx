"use client";

import { Box, InputBase, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ApiIcon from "@mui/icons-material/Api";
import StorageIcon from "@mui/icons-material/Storage";
import SchemaOutlinedIcon from "@mui/icons-material/SchemaOutlined";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorderOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ReplyAllOutlinedIcon from "@mui/icons-material/ReplyAllOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { useBookmarkStore } from "@/lib/bookmarks";
import { ENDPOINT_STATUSES, ENDPOINT_STATUS_META, useEndpointStatusStore } from "@/lib/endpointStatus";
import { openProposalCount, useProposalStore } from "@/lib/proposals";
import { ImportSpecDialog } from "@/components/ImportSpecDialog";
import { SchemaWorkbench } from "@/components/schema/SchemaWorkbench";
import { ResponseTabs } from "@/components/schema/ResponseTabs";
import { RequestTester } from "@/components/tester/RequestTester";
import { ProposalPanel } from "@/components/proposals/ProposalPanel";
import { MonoTag, Sticker, type PastelName, relativeTime, useNow } from "@/components/common";
import { DoodleStar } from "@/components/doodles";
import { blue, blueSoft, ink, methodColor, pastel, secondaryText } from "@/components/theme";
import { PixelTabs } from "@/components/pixel/PixelTabs";
import { PixelEmptyState } from "@/components/pixel/PixelEmptyState";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelPanel } from "@/components/pixel/pixelBox";
import type { HttpMethod, Resource } from "@/lib/types";

const STATUS_META = ENDPOINT_STATUS_META;

// Endpoint workflow status pill with a dropdown — frontend-local (endpointStatus.ts).
function EndpointStatusPicker({ resourceId }: { resourceId: string }) {
  const status = useEndpointStatusStore((s) => s.byResource[resourceId] ?? "draft");
  const setStatus = useEndpointStatusStore((s) => s.setStatus);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const meta = STATUS_META[status];

  return (
    <>
      <Tooltip title="Change endpoint status">
        <Box
          role="button"
          aria-label="Change endpoint status"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.25,
            cursor: "pointer",
            pl: 1.2,
            pr: 0.7,
            py: 0.55,
            borderRadius: "999px",
            bgcolor: meta.bg,
            color: meta.fg,
            border: `1.5px solid ${meta.fg}2E`,
            fontSize: 11.5,
            fontWeight: 700,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            transition: "transform .15s ease",
            "&:hover": { transform: "translateY(-1px) rotate(-1deg)" },
          }}
        >
          {meta.label}
          <ArrowDropDownIcon sx={{ fontSize: 17, mr: -0.25 }} />
        </Box>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {ENDPOINT_STATUSES.map((s) => (
          <MenuItem
            key={s}
            selected={s === status}
            onClick={() => {
              setStatus(resourceId, s);
              setAnchorEl(null);
            }}
            sx={{ fontSize: 13, fontWeight: 600, color: STATUS_META[s].fg }}
          >
            {STATUS_META[s].label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

const KIND_LABEL: Record<Resource["kind"], string> = {
  endpoint: "API Endpoint",
  database: "Database Table",
  model: "Schema Model",
};

const KIND_COLOR: Record<Resource["kind"], PastelName> = {
  endpoint: "blue",
  database: "mint",
  model: "purple",
};

const KIND_ICON: Record<Resource["kind"], React.ReactNode> = {
  endpoint: <ApiIcon sx={{ fontSize: 16 }} />,
  database: <StorageIcon sx={{ fontSize: 16 }} />,
  model: <SchemaOutlinedIcon sx={{ fontSize: 16 }} />,
};

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
// Methods that carry a request body; the rest (GET) send data as query params.
const BODY_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH", "DELETE"]);

// Pick the method from a dropdown; click the path to edit it inline.
function EndpointMeta({ resource }: { resource: Resource }) {
  const updateEndpoint = useWorkspaceStore((s) => s.updateEndpoint);
  const [draft, setDraft] = useState(resource.path ?? "");
  const [editing, setEditing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const currentMethod = resource.method ?? "GET";

  const pickMethod = (m: HttpMethod) => {
    setAnchorEl(null);
    if (m !== resource.method) updateEndpoint(resource.id, { method: m });
  };

  const commitPath = () => {
    const path = draft.trim();
    if (path && path !== resource.path) updateEndpoint(resource.id, { path });
    setEditing(false);
  };

  return (
    <>
      <Tooltip title="Change method">
        <Box
          role="button"
          aria-label="Change method"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
        >
          <MonoTag sx={{ color: methodColor[currentMethod], bgcolor: `${methodColor[currentMethod]}18`, borderColor: `${methodColor[currentMethod]}44`, display: "inline-flex", alignItems: "center", gap: 0.1 }}>
            {currentMethod}
            <ArrowDropDownIcon sx={{ fontSize: 16, ml: -0.25 }} />
          </MonoTag>
        </Box>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {HTTP_METHODS.map((m) => (
          <MenuItem
            key={m}
            selected={m === currentMethod}
            onClick={() => pickMethod(m)}
            sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: methodColor[m] }}
          >
            {m}
          </MenuItem>
        ))}
      </Menu>
      {editing ? (
        <InputBase
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitPath}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          sx={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, fontWeight: 500, border: `1.5px solid ${blue}`, borderRadius: "9px", px: 0.9, py: 0.25, boxShadow: `0 0 0 3px ${blueSoft}` }}
        />
      ) : (
        <Tooltip title="Click to edit path">
          <Box component="span" onClick={() => { setDraft(resource.path ?? ""); setEditing(true); }} sx={{ cursor: "pointer" }}>
            <MonoTag>{resource.path || "(no path)"}</MonoTag>
          </Box>
        </Tooltip>
      )}
    </>
  );
}

function BookmarkToggle({ resourceId }: { resourceId: string }) {
  const bookmarked = useBookmarkStore((s) => Boolean(s.ids[resourceId]));
  const toggle = useBookmarkStore((s) => s.toggle);
  return (
    <Tooltip title={bookmarked ? "Remove favorite" : "Add to favorites"}>
      <Box
        role="button"
        aria-label={bookmarked ? "Remove favorite" : "Favorite"}
        onClick={() => toggle(resourceId)}
        sx={{
          display: "flex",
          cursor: "pointer",
          p: 0.6,
          borderRadius: "10px",
          color: bookmarked ? "#F0A93C" : secondaryText,
          transition: "color .15s ease, transform .15s ease",
          "&:hover": { color: "#F0A93C", transform: "rotate(-12deg) scale(1.1)" },
        }}
      >
        {bookmarked ? <StarIcon sx={{ fontSize: 20 }} /> : <StarBorderIcon sx={{ fontSize: 20 }} />}
      </Box>
    </Tooltip>
  );
}

// Overflow menu — tucks the destructive Delete action away.
function MoreMenu({ resource }: { resource: Resource }) {
  const deleteResource = useWorkspaceStore((s) => s.deleteResource);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title="More">
        <Box
          role="button"
          aria-label="More actions"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ display: "flex", cursor: "pointer", p: 0.6, borderRadius: "10px", color: secondaryText, "&:hover": { color: ink, bgcolor: pastel.cream } }}
        >
          <MoreHorizIcon sx={{ fontSize: 20 }} />
        </Box>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            if (window.confirm(`Delete "${resource.name}"? This cannot be undone.`)) {
              deleteResource(resource.id);
            }
          }}
          sx={{ fontSize: 13, fontWeight: 600, color: "#E86A6A", gap: 1 }}
        >
          <DeleteIcon sx={{ fontSize: 18 }} />
          Delete {resource.kind}
        </MenuItem>
      </Menu>
    </>
  );
}

function EditableName({ resource }: { resource: Resource }) {
  const [draft, setDraft] = useState(resource.name);
  const [editing, setEditing] = useState(false);
  const rename = useWorkspaceStore((s) => s.renameResource);

  if (!editing) {
    return (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
        <Typography variant="h1" className="font-hand" sx={{ fontSize: 26 }}>{resource.name}</Typography>
        <EditIcon
          onClick={() => {
            setDraft(resource.name);
            setEditing(true);
          }}
          sx={{ fontSize: 17, color: "#D3C3A6", cursor: "pointer", transition: "transform .15s ease", "&:hover": { color: ink, transform: "rotate(-10deg)" } }}
        />
      </Stack>
    );
  }
  return (
    <InputBase
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim()) rename(resource.id, draft.trim());
        setEditing(false);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      sx={{ fontSize: 24, fontWeight: 700, border: `1.5px solid ${blue}`, borderRadius: "11px", px: 1, py: 0.25, boxShadow: `0 0 0 3px ${blueSoft}` }}
    />
  );
}

type CenterTab = "request" | "responses" | "try" | "docs" | "history" | "settings" | "proposals";

const TABS: { value: CenterTab; label: string; color: PastelName; icon: React.ReactNode }[] = [
  { value: "request", label: "Request", color: "pink", icon: <DescriptionOutlinedIcon sx={{ fontSize: 16 }} /> },
  { value: "responses", label: "Responses", color: "blue", icon: <ReplyAllOutlinedIcon sx={{ fontSize: 16 }} /> },
  { value: "try", label: "Try it", color: "mint", icon: <ScienceOutlinedIcon sx={{ fontSize: 16 }} /> },
  { value: "docs", label: "Docs", color: "yellow", icon: <ArticleOutlinedIcon sx={{ fontSize: 16 }} /> },
  { value: "history", label: "History", color: "orange", icon: <HistoryOutlinedIcon sx={{ fontSize: 16 }} /> },
  { value: "settings", label: "Settings", color: "blue", icon: <SettingsOutlinedIcon sx={{ fontSize: 16 }} /> },
  { value: "proposals", label: "Proposals", color: "purple", icon: <RateReviewOutlinedIcon sx={{ fontSize: 16 }} /> },
];

export function CenterPanel() {
  const resource = useWorkspaceStore((s) => s.resources.find((r) => r.id === s.selectedId));
  const [tab, setTab] = useState<CenterTab>("request");
  const openCount = useProposalStore((s) => (resource ? openProposalCount(s.byId, resource.id) : 0));
  useNow(); // keep "updated Xs ago" fresh

  // The mascot's "Review proposals" action jumps straight to the Proposals tab.
  useEffect(() => {
    const go = () => setTab("proposals");
    window.addEventListener("kingdom:open-proposals", go);
    return () => window.removeEventListener("kingdom:open-proposals", go);
  }, []);

  if (!resource) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
        <PixelEmptyState pose="reading" mascotSize={132} title="Open a page from the explorer" subtitle="Choose an endpoint or schema and its notebook page will appear here." />
      </Box>
    );
  }

  const isEndpoint = resource.kind === "endpoint";
  // GET has no request body — its schema describes query parameters instead.
  const endpointHasBody = BODY_METHODS.has(resource.method ?? "GET");
  const bodyLabel = isEndpoint
    ? endpointHasBody
      ? "Request Body"
      : "Query Parameters"
    : resource.kind === "database"
      ? "Columns"
      : "Schema";
  const bodyDescription = isEndpoint
    ? endpointHasBody
      ? "The JSON payload clients send with this request."
      : "Parameters appended to the request URL."
    : resource.kind === "database"
      ? "Columns and types for this table."
      : "Fields that make up this schema model.";

  const activeTab: CenterTab = isEndpoint ? tab : "request";
  const kindColor = KIND_COLOR[resource.kind];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "transparent" }}>
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: { xs: 2, sm: 2.5 }, pb: 0, bgcolor: "#FFFFFF", borderBottom: "1px solid #E9E2D0", position: "relative" }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Sticker color={kindColor} sx={{ mb: 0.75 }}>
              {KIND_ICON[resource.kind]}
              {KIND_LABEL[resource.kind]}
            </Sticker>
            <EditableName resource={resource} key={resource.id} />
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            {resource.kind === "endpoint" ? <EndpointStatusPicker resourceId={resource.id} /> : null}
            {resource.kind === "endpoint" ? <BookmarkToggle resourceId={resource.id} /> : null}
            {resource.kind === "endpoint" ? <ImportSpecDialog resourceId={resource.id} /> : null}
            <MoreMenu resource={resource} />
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.25} sx={{ mt: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          {resource.kind === "endpoint" ? (
            <EndpointMeta resource={resource} />
          ) : resource.path ? (
            <MonoTag>{resource.path}</MonoTag>
          ) : null}
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <DoodleStar size={13} />
            <Typography sx={{ fontSize: 12, color: secondaryText }}>
              Updated {relativeTime(resource.updatedAt)} by {resource.updatedBy}
            </Typography>
          </Stack>
        </Stack>

        {isEndpoint ? (
          <PixelTabs
            value={activeTab}
            onChange={setTab}
            sx={{ mt: 1.5, overflowX: "auto" }}
            tabs={TABS.map((t) => ({
              value: t.value,
              icon: t.icon,
              label: t.value === "proposals" && openCount ? `Proposals (${openCount})` : t.label,
            }))}
          />
        ) : (
          <Box sx={{ height: 12 }} />
        )}
      </Box>

      {/* Notebook page content */}
      <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
        {activeTab === "request" ? (
          <Box sx={{ animation: "fade-in .2s ease" }}>
            <PixelPanel>
              <Box sx={{ mb: 2.5, display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h2" sx={{ fontSize: 18 }}>{bodyLabel}</Typography>
                  <Typography sx={{ fontSize: 13, color: secondaryText, mt: 0.5 }}>{bodyDescription}</Typography>
                </Box>
                <PixelButton size="small" variant="outlined" startIcon={<AutoAwesomeOutlinedIcon />}>Generate with AI</PixelButton>
              </Box>
              <SchemaWorkbench
                key={`${resource.id}::req`}
                scope={`${resource.id}::req`}
                seedFields={resource.fields}
                typeName={isEndpoint ? `${resource.name}${endpointHasBody ? "Request" : "Query"}` : resource.name}
              />
            </PixelPanel>
          </Box>
        ) : null}

        {isEndpoint && activeTab === "responses" ? (
          <Box sx={{ animation: "fade-in .2s ease" }}>
            <ResponseTabs key={resource.id} resourceId={resource.id} typeName={resource.name} />
          </Box>
        ) : null}

        {isEndpoint && activeTab === "try" ? (
          <Box sx={{ animation: "fade-in .2s ease" }}>
            <RequestTester key={`${resource.id}::tester`} resource={resource} />
          </Box>
        ) : null}

        {isEndpoint && activeTab === "proposals" ? (
          <ProposalPanel key={`${resource.id}::proposals`} resource={resource} />
        ) : null}

        {isEndpoint && activeTab === "docs" ? (
          <PixelPanel>
            <PixelEmptyState pose="reading" title="Documentation starts here." subtitle="Turn this endpoint into a clear guide for your team." action={<PixelButton startIcon={<AutoAwesomeOutlinedIcon />}>Generate Documentation</PixelButton>} />
          </PixelPanel>
        ) : null}

        {isEndpoint && activeTab === "history" ? (
          <PixelPanel>
            <PixelEmptyState pose="reading" title="No saved versions yet." subtitle="Changes to this endpoint will become a readable timeline." />
          </PixelPanel>
        ) : null}

        {isEndpoint && activeTab === "settings" ? (
          <PixelPanel>
            <PixelEmptyState pose="coding" title="Endpoint settings" subtitle="Advanced endpoint controls will live on this quiet page." />
          </PixelPanel>
        ) : null}
      </Box>
    </Box>
  );
}
