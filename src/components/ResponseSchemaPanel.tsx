"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DataObjectIcon from "@mui/icons-material/DataObject";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { RESPONSE_FIELD_TYPES, useResponseSchemaStore } from "@/lib/responseSchemas";
import { StateBadge } from "@/components/common";
import { line } from "@/components/theme";
import type { DataType, FieldState, JsonValue, ResponseSchema, SchemaField } from "@/lib/types";

const JSON_PLACEHOLDER = `{
  "id": "uuid",
  "email": "string",
  "profile": {
    "name": "string",
    "address": { "city": "string" }
  }
}`;

// Paste a JSON object → fields generated with inferred types for this response
// status. Mirrors the endpoint-side Paste JSON in CenterPanel.
function PasteJsonButton({ resourceId, status }: { resourceId: string; status: number }) {
  const importJsonFields = useResponseSchemaStore((s) => s.importJsonFields);
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
    importJsonFields(resourceId, status, parsed as Record<string, JsonValue>);
    close();
  };

  return (
    <>
      <Button size="small" variant="outlined" startIcon={<DataObjectIcon />} onClick={() => setOpen(true)} sx={{ mt: 1.25 }}>
        Paste JSON
      </Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>Paste JSON to add fields</DialogTitle>
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

const STATE_CYCLE: FieldState[] = ["draft", "ready", "breaking"];

// Common status codes offered when adding a response tab.
const COMMON_STATUSES: { status: number; description: string }[] = [
  { status: 200, description: "OK" },
  { status: 201, description: "Created" },
  { status: 204, description: "No Content" },
  { status: 400, description: "Bad Request" },
  { status: 401, description: "Unauthorized" },
  { status: 403, description: "Forbidden" },
  { status: 404, description: "Not Found" },
  { status: 409, description: "Conflict" },
  { status: 422, description: "Unprocessable Entity" },
  { status: 500, description: "Server Error" },
];

// 2xx green, 4xx amber, 5xx red — used for the tab chip border/text.
function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "#16A34A";
  if (status >= 400 && status < 500) return "#D97706";
  if (status >= 500) return "#DC2626";
  return "#4B5563";
}

function statusLabel(status: number): string {
  return status === 0 ? "default" : String(status);
}

function ResponseFieldRow({
  resourceId,
  status,
  field,
}: {
  resourceId: string;
  status: number;
  field: SchemaField;
}) {
  const updateField = useResponseSchemaStore((s) => s.updateField);
  const removeField = useResponseSchemaStore((s) => s.removeField);
  const [keyDraft, setKeyDraft] = useState(field.key);

  const commitKey = () => {
    const next = keyDraft.trim();
    if (next && next !== field.key) updateField(resourceId, status, field.id, { key: next });
    else setKeyDraft(field.key);
  };
  const cycleState = () => {
    const next = STATE_CYCLE[(STATE_CYCLE.indexOf(field.state) + 1) % STATE_CYCLE.length];
    updateField(resourceId, status, field.id, { state: next });
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.25,
        py: 0.85,
        borderBottom: `1px solid ${line}`,
        bgcolor: "#fff",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Box sx={{ width: 180, flexShrink: 0 }}>
        <InputBase
          value={keyDraft}
          onChange={(e) => setKeyDraft(e.target.value)}
          onBlur={commitKey}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 13, fontWeight: 700, "& input": { p: 0 } }}
        />
      </Box>

      <Select
        size="small"
        value={field.type}
        onChange={(e) => updateField(resourceId, status, field.id, { type: e.target.value as DataType })}
        sx={{
          width: 120,
          flexShrink: 0,
          fontFamily: "var(--font-mono,monospace)",
          fontSize: 12,
          fontWeight: 700,
          bgcolor: "#F1F5F9",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: line, borderWidth: 1.5 },
          "& .MuiSelect-select": { py: 0.35 },
        }}
      >
        {RESPONSE_FIELD_TYPES.map((t) => (
          <MenuItem key={t} value={t} sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 12 }}>
            {t}
          </MenuItem>
        ))}
      </Select>

      <Tooltip title={field.required ? "Required" : "Optional"}>
        <Box
          role="button"
          onClick={() => updateField(resourceId, status, field.id, { required: !field.required })}
          sx={{ width: 26, textAlign: "center", fontSize: 11, fontWeight: 600, cursor: "pointer", color: field.required ? line : "#CBD5E1", flexShrink: 0 }}
        >
          REQ
        </Box>
      </Tooltip>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <InputBase
          value={field.description ?? ""}
          placeholder="description"
          onChange={(e) => updateField(resourceId, status, field.id, { description: e.target.value })}
          sx={{ fontSize: 12, color: "#4B5563", width: "100%", "& input": { p: 0 } }}
        />
      </Box>

      <Tooltip title="Click to cycle state">
        <Box role="button" onClick={cycleState} sx={{ cursor: "pointer", flexShrink: 0 }}>
          <StateBadge state={field.state} />
        </Box>
      </Tooltip>

      <Tooltip title="Remove field">
        <IconButton size="small" onClick={() => removeField(resourceId, status, field.id)} sx={{ color: "#94A3B8", "&:hover": { color: "#DC2626" } }}>
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function SchemaTable({ resourceId, schema }: { resourceId: string; schema: ResponseSchema }) {
  const addField = useResponseSchemaStore((s) => s.addField);
  return (
    <Box>
      <Box sx={{ border: `1px solid ${line}`, borderRadius: "10px", overflow: "hidden", bgcolor: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.9, bgcolor: "#F8FAFC", color: "#6B7280", borderBottom: `1px solid ${line}` }}>
          <Box sx={{ width: 180, flexShrink: 0, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>KEY</Box>
          <Box sx={{ width: 120, flexShrink: 0, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>TYPE</Box>
          <Box sx={{ width: 26, flexShrink: 0, fontSize: 10, fontWeight: 600 }}>REQ</Box>
          <Box sx={{ flex: 1, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>DESCRIPTION</Box>
          <Box sx={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", pr: 5.5 }}>STATE</Box>
        </Box>
        {schema.fields.length === 0 ? (
          <Box sx={{ px: 1.5, py: 2, color: "#94A3B8", fontSize: 12.5 }}>
            No fields yet — add one, or import a spec to populate this response.
          </Box>
        ) : (
          schema.fields.map((f) => <ResponseFieldRow key={f.id} resourceId={resourceId} status={schema.status} field={f} />)
        )}
      </Box>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addField(resourceId, schema.status)} sx={{ mt: 1.25 }}>
          Add field
        </Button>
        <PasteJsonButton resourceId={resourceId} status={schema.status} />
      </Stack>
    </Box>
  );
}

export function ResponseSchemaPanel({ resourceId }: { resourceId: string }) {
  const schemas = useResponseSchemaStore((s) => s.byResource[resourceId]);
  const addStatus = useResponseSchemaStore((s) => s.addStatus);
  const removeStatus = useResponseSchemaStore((s) => s.removeStatus);

  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<number | null>(null);
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);

  const sorted = useMemo(() => [...(schemas ?? [])].sort((a, b) => a.status - b.status), [schemas]);
  // Resolve the active tab against current data (handles import / removal).
  const activeStatus = sorted.some((s) => s.status === active) ? (active as number) : sorted[0]?.status ?? null;
  const activeSchema = sorted.find((s) => s.status === activeStatus);
  const available = COMMON_STATUSES.filter((c) => !sorted.some((s) => s.status === c.status));

  return (
    <Box sx={{ mt: 3, border: `1px solid ${line}`, borderRadius: "12px", boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px rgba(15,23,42,0.07)", bgcolor: "#fff", overflow: "hidden" }}>
      {/* Section header — click to fold */}
      <Box
        role="button"
        onClick={() => setOpen((v) => !v)}
        sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25, cursor: "pointer", borderBottom: open ? `1px solid ${line}` : "none", userSelect: "none" }}
      >
        <ExpandMoreIcon sx={{ transition: "transform .15s ease", transform: open ? "none" : "rotate(-90deg)" }} />
        <Typography variant="h2">Response Schemas</Typography>
        <Box sx={{ ml: 0.5, fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>
          {sorted.length ? `${sorted.length} response${sorted.length > 1 ? "s" : ""}` : "none defined"}
        </Box>
        <Box sx={{ ml: "auto" }} />
      </Box>

      <Collapse in={open}>
        <Box sx={{ p: 2 }}>
          {/* Status tabs */}
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", mb: 2 }}>
            {sorted.map((s) => {
              const selected = s.status === activeStatus;
              const c = statusColor(s.status);
              return (
                <Box
                  key={s.status}
                  role="button"
                  onClick={() => setActive(s.status)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1,
                    py: 0.4,
                    borderRadius: "8px",
                    border: `2px solid ${selected ? line : "#CBD5E1"}`,
                    bgcolor: selected ? "#fff" : "#F8FAFC",
                    boxShadow: selected ? "0 1px 2px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.08)" : "none",
                    cursor: "pointer",
                    transition: "box-shadow .08s ease, transform .08s ease",
                  }}
                >
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: c, border: `1px solid ${line}` }} />
                  <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 12.5, fontWeight: 600, color: c }}>
                    {statusLabel(s.status)}
                  </Typography>
                  {s.description ? (
                    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "#4B5563" }}>{s.description}</Typography>
                  ) : null}
                  {selected ? (
                    <Tooltip title="Remove this response">
                      <CloseIcon
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStatus(resourceId, s.status);
                        }}
                        sx={{ fontSize: 14, color: "#94A3B8", "&:hover": { color: "#DC2626" } }}
                      />
                    </Tooltip>
                  ) : null}
                </Box>
              );
            })}

            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={(e) => setMenuEl(e.currentTarget)}>
              Add response
            </Button>
            <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
              {available.length === 0 ? (
                <MenuItem disabled>All common statuses added</MenuItem>
              ) : (
                available.map((c) => (
                  <MenuItem
                    key={c.status}
                    onClick={() => {
                      addStatus(resourceId, c.status, c.description);
                      setActive(c.status);
                      setMenuEl(null);
                    }}
                    sx={{ gap: 1, fontFamily: "var(--font-mono,monospace)", fontWeight: 700 }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: statusColor(c.status) }} />
                    {c.status} — {c.description}
                  </MenuItem>
                ))
              )}
            </Menu>
          </Stack>

          {activeSchema ? (
            <SchemaTable resourceId={resourceId} schema={activeSchema} />
          ) : (
            <Box sx={{ py: 3, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
              No response schemas yet. Add a response status above, or use{" "}
              <Box component="span" sx={{ fontWeight: 600, color: "#4B5563" }}>
                Import Specification
              </Box>{" "}
              to populate them from an OpenAPI / Postman file.
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
