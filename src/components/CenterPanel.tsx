"use client";

import { Box, InputBase, Menu, MenuItem, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ApiIcon from "@mui/icons-material/Api";
import StorageIcon from "@mui/icons-material/Storage";
import SchemaOutlinedIcon from "@mui/icons-material/SchemaOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorderOutlined";
import { useState } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { useBookmarkStore } from "@/lib/bookmarks";
import { ENDPOINT_STATUSES, ENDPOINT_STATUS_META, useEndpointStatusStore } from "@/lib/endpointStatus";
import { ImportSpecDialog } from "@/components/ImportSpecDialog";
import { SchemaWorkbench } from "@/components/schema/SchemaWorkbench";
import { ResponseTabs } from "@/components/schema/ResponseTabs";
import { RequestTester } from "@/components/tester/RequestTester";
import { MonoTag, relativeTime, useNow } from "@/components/common";
import { blue, blueSoft, ink, line, methodColor, secondaryText } from "@/components/theme";
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
            pl: 1.1,
            pr: 0.6,
            py: 0.5,
            borderRadius: "8px",
            bgcolor: meta.bg,
            color: meta.fg,
            fontSize: 11.5,
            fontWeight: 600,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            transition: "filter .15s ease",
            "&:hover": { filter: "brightness(0.97)" },
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
            sx={{ fontSize: 13, fontWeight: 500, color: STATUS_META[s].fg }}
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

const KIND_ICON: Record<Resource["kind"], React.ReactNode> = {
  endpoint: <ApiIcon sx={{ fontSize: 18 }} />,
  database: <StorageIcon sx={{ fontSize: 18 }} />,
  model: <SchemaOutlinedIcon sx={{ fontSize: 18 }} />,
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
          <MonoTag sx={{ color: methodColor[currentMethod], display: "inline-flex", alignItems: "center", gap: 0.1 }}>
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
            sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, color: methodColor[m] }}
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
          sx={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, fontWeight: 500, border: `1px solid ${blue}`, borderRadius: "7px", px: 0.9, py: 0.25, boxShadow: `0 0 0 3px ${blueSoft}` }}
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
          borderRadius: "9px",
          color: bookmarked ? "#F59E0B" : secondaryText,
          transition: "color .15s ease, background-color .15s ease",
          "&:hover": { color: "#F59E0B", bgcolor: "#FEF6E7" },
        }}
      >
        {bookmarked ? <StarIcon sx={{ fontSize: 19 }} /> : <StarBorderIcon sx={{ fontSize: 19 }} />}
      </Box>
    </Tooltip>
  );
}

// Overflow menu — tucks the destructive Delete action away so it never competes
// with the primary editing surface.
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
          sx={{ display: "flex", cursor: "pointer", p: 0.6, borderRadius: "9px", color: secondaryText, "&:hover": { color: ink, bgcolor: "#F1F5F9" } }}
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
          sx={{ fontSize: 13, fontWeight: 500, color: "#EF4444", gap: 1 }}
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
        <Typography variant="h1">{resource.name}</Typography>
        <EditIcon
          onClick={() => {
            setDraft(resource.name);
            setEditing(true);
          }}
          sx={{ fontSize: 16, color: "#B8C1CD", cursor: "pointer", "&:hover": { color: ink } }}
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
      sx={{ fontSize: 22, fontWeight: 600, border: `1px solid ${blue}`, borderRadius: "9px", px: 1, py: 0.25, boxShadow: `0 0 0 3px ${blueSoft}` }}
    />
  );
}

type CenterTab = "request" | "responses" | "try";

export function CenterPanel() {
  const resource = useWorkspaceStore((s) => s.resources.find((r) => r.id === s.selectedId));
  const [tab, setTab] = useState<CenterTab>("request");
  useNow(); // keep "updated Xs ago" fresh

  if (!resource) {
    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 2, alignItems: "center", justifyContent: "center", color: secondaryText, p: 4, textAlign: "center" }}>
        <Box sx={{ width: 72, height: 72, borderRadius: "18px", bgcolor: "#fff", border: `1px solid ${line}`, boxShadow: "0 1px 2px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: blue }}>
          <LayersOutlinedIcon sx={{ fontSize: 32 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 16, color: ink }}>Nothing selected</Typography>
          <Typography sx={{ fontSize: 13.5, color: secondaryText, mt: 0.5 }}>Pick an endpoint or schema from the Explorer to start editing.</Typography>
        </Box>
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

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#F8FAFC" }}>
      {/* Hero header */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: { xs: 2, sm: 3 }, pb: 0, bgcolor: "#fff", borderBottom: `1px solid ${line}` }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
            <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: "11px", bgcolor: blueSoft, color: blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {KIND_ICON[resource.kind]}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 500, color: secondaryText, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {KIND_LABEL[resource.kind]}
              </Typography>
              <EditableName resource={resource} key={resource.id} />
            </Box>
          </Stack>
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
          <Typography sx={{ fontSize: 12, color: secondaryText }}>
            updated {relativeTime(resource.updatedAt)} by {resource.updatedBy}
          </Typography>
        </Stack>

        {/* Secondary navigation — endpoints only */}
        {isEndpoint ? (
          <Tabs
            value={activeTab}
            onChange={(_, v: CenterTab) => setTab(v)}
            sx={{
              mt: 1.5,
              minHeight: 40,
              "& .MuiTab-root": { minHeight: 40, py: 1, px: 0, mr: 3, fontSize: 13.5, fontWeight: 500, minWidth: 0 },
              "& .MuiTabs-indicator": { height: 2, borderRadius: 2, bgcolor: blue },
            }}
          >
            <Tab value="request" label="Request" />
            <Tab value="responses" label="Responses" />
            <Tab value="try" label="Try it" />
          </Tabs>
        ) : null}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 4 } }}>
        {activeTab === "request" ? (
          <Box sx={{ animation: "fade-in .2s ease" }}>
            <Box sx={{ bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "16px", boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px rgba(15,23,42,0.07)", p: { xs: 2, sm: 3 } }}>
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="h2">{bodyLabel}</Typography>
                <Typography sx={{ fontSize: 13, color: secondaryText, mt: 0.5 }}>{bodyDescription}</Typography>
              </Box>
              <SchemaWorkbench
                key={`${resource.id}::req`}
                scope={`${resource.id}::req`}
                seedFields={resource.fields}
                typeName={isEndpoint ? `${resource.name}${endpointHasBody ? "Request" : "Query"}` : resource.name}
              />
            </Box>
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
      </Box>
    </Box>
  );
}
