"use client";

import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, InputBase, Menu, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DataObjectIcon from "@mui/icons-material/DataObject";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useState } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { FieldRow } from "@/components/FieldRow";
import { MonoTag, StateBadge, relativeTime, useNow } from "@/components/common";
import { changeColor, line, methodColor } from "@/components/theme";
import type { HttpMethod, JsonValue, Resource } from "@/lib/types";

const JSON_PLACEHOLDER = `{
  "id": "uuid",
  "email": "string",
  "profile": {
    "name": "string",
    "address": { "city": "string" }
  }
}`;

// Paste a JSON object → fields are generated with inferred types. Nested objects
// become `json` fields whose shape is preserved (and editable per field).
function PasteJsonButton({ resourceId }: { resourceId: string }) {
  const importJsonFields = useWorkspaceStore((s) => s.importJsonFields);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setDraft("");
    setError(null);
  };

  const apply = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setError("Invalid JSON");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setError('Paste a JSON object, e.g. { "id": "uuid" }');
      return;
    }
    importJsonFields(resourceId, parsed as Record<string, JsonValue>);
    close();
  };

  return (
    <>
      <Button variant="outlined" startIcon={<DataObjectIcon />} onClick={() => setOpen(true)}>
        Paste JSON
      </Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Paste JSON to add fields</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            minRows={10}
            fullWidth
            placeholder={JSON_PLACEHOLDER}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            error={Boolean(error)}
            helperText={error ?? "Each top-level key becomes a field; existing keys are skipped."}
            sx={{ mt: 1, "& textarea": { fontFamily: "var(--font-mono,monospace)", fontSize: 13 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button variant="contained" onClick={apply} disabled={!draft.trim()}>
            Add fields
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const KIND_LABEL: Record<Resource["kind"], string> = {
  endpoint: "API Endpoint",
  database: "Database Table",
  model: "Schema Model",
};

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

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
  const comments = useWorkspaceStore((s) => s.comments);
  const addField = useWorkspaceStore((s) => s.addField);
  const deleteResource = useWorkspaceStore((s) => s.deleteResource);
  useNow(); // keep "updated Xs ago" fresh

  if (!resource) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#A1A1AA" }}>
        <Typography>Select a schema from the left to inspect it.</Typography>
      </Box>
    );
  }

  const commentCountFor = (fieldId: string) => comments.filter((c) => c.resourceId === resource.id && c.fieldId === fieldId).length;
  const liveCount = resource.fields.filter((f) => f.change !== "removed").length;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#F4F4F5" }}>
      {/* Header */}
      <Box sx={{ p: 3, pb: 2, borderBottom: `2px solid ${line}`, bgcolor: "#fff" }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: "#71717A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {KIND_LABEL[resource.kind]}
            </Typography>
            <EditableName resource={resource} key={resource.id} />
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <StateBadge state={resource.state} sx={{ fontSize: 12, py: 0.4 }} />
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
          <Chip size="small" variant="outlined" label={`${liveCount} fields`} sx={{ height: 22 }} />
          <Typography variant="caption" sx={{ color: "#71717A" }}>
            updated {relativeTime(resource.updatedAt)} by {resource.updatedBy}
          </Typography>
        </Stack>
      </Box>

      {/* Blueprint */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        <Box sx={{ border: `2px solid ${line}`, borderRadius: "12px", overflow: "hidden", boxShadow: "4px 4px 0 #0A0A0A", bgcolor: "#fff" }}>
          {/* Column header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.85, bgcolor: "#0A0A0A", color: "#fff" }}>
            <Box sx={{ width: 190, flexShrink: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", pl: 2.4 }}>KEY</Box>
            <Box sx={{ width: 128, flexShrink: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em" }}>TYPE</Box>
            <Box sx={{ width: 26, flexShrink: 0, fontSize: 10.5, fontWeight: 800 }}>REQ</Box>
            <Box sx={{ flex: 1, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em" }}>NOTES / DIFF</Box>
            <Box sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", pr: 9 }}>STATE</Box>
          </Box>
          {resource.fields.map((f) => (
            <FieldRow key={f.id} resourceId={resource.id} field={f} commentCount={commentCountFor(f.id)} />
          ))}
        </Box>

        <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap" }}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => addField(resource.id)}>
            Add Field
          </Button>
          <PasteJsonButton resourceId={resource.id} />
          <Stack direction="row" spacing={1.5} sx={{ ml: "auto", alignItems: "center" }}>
            {(["added", "modified", "removed"] as const).map((c) => (
              <Stack key={c} direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 14, height: 6, bgcolor: changeColor[c], border: `1px solid ${line}` }} />
                <Typography variant="caption" sx={{ textTransform: "capitalize", color: "#52525B" }}>
                  {c}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
