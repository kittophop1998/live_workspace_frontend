"use client";

import { Box, InputBase, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
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
import { line, methodColor } from "@/components/theme";
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
            gap: 0.1,
            cursor: "pointer",
            px: 0.9,
            py: 0.15,
            borderRadius: "6px",
            border: "2px solid #0A0A0A",
            bgcolor: meta.bg,
            color: meta.fg,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            lineHeight: 1.5,
            whiteSpace: "nowrap",
          }}
        >
          {meta.label}
          <ArrowDropDownIcon sx={{ fontSize: 16, mr: -0.5 }} />
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
            sx={{ fontSize: 13, fontWeight: 700, color: STATUS_META[s].fg }}
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
          sx={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, fontWeight: 700, border: `2px solid ${line}`, borderRadius: "5px", px: 0.75, py: 0.1 }}
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
    <Tooltip title={bookmarked ? "Remove bookmark" : "Bookmark this endpoint"}>
      <Box
        role="button"
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
        onClick={() => toggle(resourceId)}
        sx={{
          display: "flex",
          cursor: "pointer",
          p: 0.5,
          borderRadius: "8px",
          color: bookmarked ? "#F59E0B" : "#71717A",
          "&:hover": { color: "#F59E0B", bgcolor: "#FEF3C7" },
        }}
      >
        {bookmarked ? <StarIcon sx={{ fontSize: 20 }} /> : <StarBorderIcon sx={{ fontSize: 20 }} />}
      </Box>
    </Tooltip>
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
          sx={{ fontSize: 16, color: "#A1A1AA", cursor: "pointer", "&:hover": { color: line } }}
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
      sx={{ fontSize: 22, fontWeight: 800, border: `2px solid ${line}`, borderRadius: "8px", px: 1, py: 0.25 }}
    />
  );
}

export function CenterPanel() {
  const resource = useWorkspaceStore((s) => s.resources.find((r) => r.id === s.selectedId));
  const deleteResource = useWorkspaceStore((s) => s.deleteResource);
  useNow(); // keep "updated Xs ago" fresh

  if (!resource) {
    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1.5, alignItems: "center", justifyContent: "center", color: "#A1A1AA" }}>
        <Box sx={{ width: 64, height: 64, borderRadius: "16px", border: `2px dashed #C4C4CC`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LayersOutlinedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Typography sx={{ fontWeight: 600 }}>Select a schema from the left to inspect it.</Typography>
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

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#F4F4F5" }}>
      {/* Header */}
      <Box sx={{ p: { xs: 1.5, sm: 3 }, pb: { xs: 1.5, sm: 2 }, borderBottom: `2px solid ${line}`, bgcolor: "#fff" }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: "10px", border: `2px solid ${line}`, bgcolor: "#F4F4F5", color: line, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #0A0A0A" }}>
              {KIND_ICON[resource.kind]}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: "#71717A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {KIND_LABEL[resource.kind]}
              </Typography>
              <EditableName resource={resource} key={resource.id} />
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            {resource.kind === "endpoint" ? <BookmarkToggle resourceId={resource.id} /> : null}
            {resource.kind === "endpoint" ? <ImportSpecDialog resourceId={resource.id} /> : null}
            {resource.kind === "endpoint" ? <EndpointStatusPicker resourceId={resource.id} /> : null}
            <Tooltip title={`Delete this ${resource.kind}`}>
              <Box
                role="button"
                aria-label="Delete resource"
                onClick={() => {
                  if (window.confirm(`Delete "${resource.name}"? This cannot be undone.`)) {
                    deleteResource(resource.id);
                  }
                }}
                sx={{
                  display: "flex",
                  cursor: "pointer",
                  p: 0.5,
                  borderRadius: "8px",
                  color: "#71717A",
                  "&:hover": { color: "#DC2626", bgcolor: "#FEE2E2" },
                }}
              >
                <DeleteIcon sx={{ fontSize: 20 }} />
              </Box>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          {resource.kind === "endpoint" ? (
            <EndpointMeta resource={resource} />
          ) : resource.path ? (
            <MonoTag>{resource.path}</MonoTag>
          ) : null}
          <Typography variant="caption" sx={{ color: "#71717A" }}>
            updated {relativeTime(resource.updatedAt)} by {resource.updatedBy}
          </Typography>
        </Stack>
      </Box>

      {/* Editor — card-based schema workbench */}
      <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 1.5, sm: 3 } }}>
        <Box sx={{ border: `2px solid ${line}`, borderRadius: "16px", boxShadow: "4px 4px 0 #0A0A0A", bgcolor: "#fff", p: { xs: 1.5, sm: 2.5 } }}>
          <Typography variant="h2" sx={{ mb: 2 }}>{bodyLabel}</Typography>
          <SchemaWorkbench
            key={`${resource.id}::req`}
            scope={`${resource.id}::req`}
            seedFields={resource.fields}
            typeName={isEndpoint ? `${resource.name}${endpointHasBody ? "Request" : "Query"}` : resource.name}
          />
        </Box>

        {isEndpoint ? <ResponseTabs key={resource.id} resourceId={resource.id} typeName={resource.name} /> : null}

        {isEndpoint ? <RequestTester key={`${resource.id}::tester`} resource={resource} /> : null}
      </Box>
    </Box>
  );
}
