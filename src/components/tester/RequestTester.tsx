"use client";

import { useMemo, useState } from "react";
import {
  Box, Button, Collapse, IconButton, InputBase, MenuItem, Select, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useApiTesterStore, extractPathParams, type KeyValueRow, type RequestDraft } from "@/lib/apiTester";
import { sendTest, type TestResult } from "@/services/testerService";
import { seedFromFields, nodesToExample } from "@/lib/schemaConvert";
import { useSchemaTreeStore, type SchemaNode } from "@/lib/schemaTree";
import { ResponseViewer } from "@/components/tester/ResponseViewer";
import { line, methodColor } from "@/components/theme";
import { PixelPanel } from "@/components/pixel/pixelBox";
import { PixelButton } from "@/components/pixel/PixelButton";
import { MethodBadge } from "@/components/pixel/PixelBadge";
import { Input as PixelactInput } from "@/components/ui/pixelact-ui/input";
import type { HttpMethod, Resource } from "@/lib/types";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const BODY_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH", "DELETE"]);

const row = (key: string, value = "", enabled = true): KeyValueRow => ({ key, value, enabled });

// Seed a draft from the API-spec resource: method/path from the spec, path-param
// rows from the templated path, a default JSON content-type, and an example body
// generated from the request schema the user actually built. That schema lives in
// the `::req` tree (Visual Builder / Import write there); `resource.fields` is only
// the original backend seed, so fall back to it only when the tree is empty.
function draftFromResource(resource: Resource, reqNodes: SchemaNode[]): RequestDraft {
  const method = (resource.method ?? "GET") as HttpMethod;
  const path = resource.path ?? "/";
  const nodes = reqNodes.length ? reqNodes : seedFromFields(resource.fields);
  const hasBody = BODY_METHODS.has(method);
  // Body methods carry a JSON body; GET (and other non-body methods) send the
  // same schema as query parameters instead.
  const example = nodesToExample(nodes);
  const body = hasBody ? JSON.stringify(example, null, 2) : "";
  const queryParams = hasBody
    ? []
    : Object.entries(example).map(([k, v]) =>
        row(k, typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)),
      );
  return {
    method,
    path,
    pathParams: extractPathParams(path).map((name) => row(name)),
    queryParams,
    headers: [row("Content-Type", "application/json"), row("Authorization", "Bearer <token>")],
    body,
    bearerToken: "",
  };
}

// Keep path-param rows in sync with the (possibly edited) path — add newly
// introduced params, keep existing values.
function reconcilePathParams(path: string, existing: KeyValueRow[]): KeyValueRow[] {
  const names = extractPathParams(path);
  return names.map((name) => existing.find((p) => p.key === name) ?? row(name));
}

function RowsEditor({
  rows, onChange, addLabel, lockKeys,
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  addLabel?: string;
  lockKeys?: boolean;
}) {
  const patch = (index: number, next: Partial<KeyValueRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...next } : r)));
  return (
    <Stack spacing={0.75}>
      {rows.map((r, i) => (
        <Stack key={i} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <input
            type="checkbox"
            checked={r.enabled}
            onChange={(e) => patch(i, { enabled: e.target.checked })}
            style={{ width: 15, height: 15, accentColor: "#3B82F6", cursor: "pointer" }}
          />
          <InputBase
            value={r.key}
            readOnly={lockKeys}
            placeholder="key"
            onChange={(e) => patch(i, { key: e.target.value })}
            sx={{ flex: 1, fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, border: `1px solid ${line}`, borderRadius: 0, px: 0.75, py: 0.4, bgcolor: lockKeys ? "#F1F5F9" : "#fff" }}
          />
          <InputBase
            value={r.value}
            placeholder="value"
            onChange={(e) => patch(i, { value: e.target.value })}
            sx={{ flex: 1.4, fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, border: `1px solid ${line}`, borderRadius: 0, px: 0.75, py: 0.4 }}
          />
          {lockKeys ? (
            <Box sx={{ width: 28 }} />
          ) : (
            <IconButton size="small" aria-label="Remove row" onClick={() => onChange(rows.filter((_, x) => x !== i))}>
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          )}
        </Stack>
      ))}
      {!lockKeys ? (
        <Button
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => onChange([...rows, row("")])}
          sx={{ alignSelf: "flex-start", py: 0.25, px: 1, fontSize: 12 }}
        >
          {addLabel ?? "Add"}
        </Button>
      ) : null}
      {rows.length === 0 && lockKeys ? (
        <Typography variant="body2" sx={{ color: "#94A3B8", fontStyle: "italic" }}>No path parameters.</Typography>
      ) : null}
    </Stack>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em", mt: 1.5, mb: 0.5 }}>
      {children}
    </Typography>
  );
}

// The "Try it" helper — an inline request runner attached to the selected API
// spec endpoint. Prefilled from the spec, editable, sent through the backend
// proxy. Draft persists per-resource; base URL is shared across the workspace.
export function RequestTester({ resource }: { resource: Resource }) {
  const baseUrl = useApiTesterStore((s) => s.baseUrl);
  const setBaseUrl = useApiTesterStore((s) => s.setBaseUrl);
  const savedDraft = useApiTesterStore((s) => s.drafts[resource.id]);
  const saveDraft = useApiTesterStore((s) => s.saveDraft);
  const reqNodes = useSchemaTreeStore((s) => s.trees[`${resource.id}::req`] ?? []);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RequestDraft>(() => {
    if (savedDraft) return { ...savedDraft, pathParams: reconcilePathParams(savedDraft.path, savedDraft.pathParams) };
    return draftFromResource(resource, reqNodes);
  });
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (patch: Partial<RequestDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (patch.path !== undefined) next.pathParams = reconcilePathParams(patch.path, prev.pathParams);
      saveDraft(resource.id, next);
      return next;
    });
  };

  const reset = () => {
    const fresh = draftFromResource(resource, reqNodes);
    setDraft(fresh);
    saveDraft(resource.id, fresh);
    setResult(null);
  };

  const previewUrl = useMemo(() => {
    let path = draft.path;
    for (const p of draft.pathParams) {
      if (!p.enabled || !p.key) continue;
      const encoded = encodeURIComponent(p.value);
      path = path.replaceAll(`{${p.key}}`, encoded).replaceAll(`:${p.key}`, encoded);
    }
    const query = new URLSearchParams();
    for (const q of draft.queryParams) if (q.enabled && q.key) query.append(q.key, q.value);
    const qs = query.toString();
    const full = /^https?:\/\//i.test(path) ? path : `${baseUrl.replace(/\/+$/, "")}${path}`;
    return qs ? `${full}${full.includes("?") ? "&" : "?"}${qs}` : full;
  }, [draft, baseUrl]);

  const send = async () => {
    if (!/^https?:\/\//i.test(previewUrl)) {
      setResult({ status: 0, durationMs: 0, headers: {}, body: "", size: 0, truncated: false, error: "Set a Base URL (e.g. http://localhost:8080) or use an absolute path." });
      return;
    }
    const headers: Record<string, string> = {};
    for (const h of draft.headers) if (h.enabled && h.key) headers[h.key] = h.value;
    // Bearer token → Authorization header. An explicit Authorization row (if the
    // user added one) wins over the token field.
    const token = draft.bearerToken?.trim();
    if (token && !Object.keys(headers).some((k) => k.toLowerCase() === "authorization")) {
      headers.Authorization = `Bearer ${token}`;
    }
    setLoading(true);
    try {
      const res = await sendTest({
        method: draft.method,
        url: previewUrl,
        headers,
        body: BODY_METHODS.has(draft.method) ? draft.body : undefined,
      });
      setResult(res);
    } catch (err) {
      setResult({ status: 0, durationMs: 0, headers: {}, body: "", size: 0, truncated: false, error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  const showBody = BODY_METHODS.has(draft.method);

  return (
    <PixelPanel sx={{ mt: 0, p: 0, overflow: "hidden" }}>
      <Stack
        direction="row"
        onClick={() => setOpen((v) => !v)}
        sx={{ alignItems: "center", justifyContent: "space-between", p: 2, cursor: "pointer", bgcolor: open ? "#F8FAFC" : "#fff" }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 28, height: 28, display: "grid", placeItems: "center", bgcolor: "#EEEAFE", border: "1px solid #CFC7FA", boxShadow: "2px 2px 0 #D9D3F7" }}>
            <ScienceOutlinedIcon sx={{ fontSize: 17, color: "#6D5DD3" }} />
          </Box>
          <Typography variant="h2">Try it</Typography>
          <Typography variant="caption" sx={{ color: "#6B7280" }}>send a live test request</Typography>
        </Stack>
        <ExpandMoreIcon sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </Stack>

      <Collapse in={open}>
        <Box sx={{ p: 2, pt: 0 }}>
          {/* Base URL */}
          <SectionLabel>Base URL</SectionLabel>
          <TextField
            fullWidth
            size="small"
            placeholder="http://localhost:8080"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            slotProps={{ input: { sx: { fontFamily: "var(--font-mono, monospace)", fontSize: 13 } } }}
          />

          {/* Method + path */}
          <SectionLabel>Request</SectionLabel>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "stretch" }}>
            <Select
              size="small"
              value={draft.method}
              onChange={(e) => update({ method: e.target.value as HttpMethod })}
              renderValue={() => <MethodBadge method={draft.method} />}
              sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, color: methodColor[draft.method], minWidth: 112, borderRadius: 0 }}
            >
              {HTTP_METHODS.map((m) => (
                <MenuItem key={m} value={m} sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: methodColor[m] }}>{m}</MenuItem>
              ))}
            </Select>
            <PixelactInput
              value={draft.path}
              onChange={(e) => update({ path: e.target.value })}
              placeholder="/api/v1/resource/{id}"
              className="min-w-0 flex-1 font-mono text-sm"
            />
          </Stack>
          <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: "#6B7280", fontFamily: "var(--font-mono, monospace)", wordBreak: "break-all" }}>
            → {previewUrl || "(set base URL)"}
          </Typography>

          {/* Path params */}
          <SectionLabel>Path parameters</SectionLabel>
          <RowsEditor rows={draft.pathParams} lockKeys onChange={(rows) => update({ pathParams: rows })} />

          {/* Query params */}
          <SectionLabel>Query parameters</SectionLabel>
          <RowsEditor rows={draft.queryParams} addLabel="Add query param" onChange={(rows) => update({ queryParams: rows })} />

          {/* Headers */}
          <SectionLabel>Headers</SectionLabel>
          <RowsEditor rows={draft.headers} addLabel="Add header" onChange={(rows) => update({ headers: rows })} />

          {/* Body */}
          {showBody ? (
            <>
              <SectionLabel>JSON body</SectionLabel>
              <InputBase
                value={draft.body}
                onChange={(e) => update({ body: e.target.value })}
                multiline
                minRows={4}
                sx={{ width: "100%", fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, border: `1px solid ${line}`, borderRadius: 0, p: 1.25, bgcolor: "#F8FAFC" }}
              />
            </>
          ) : null}

          {/* Actions */}
          <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center" }}>
            <PixelButton startIcon={<PlayArrowIcon />} onClick={send} disabled={loading}>
              {loading ? "Sending…" : "Send"}
            </PixelButton>
            <Tooltip title="Reset to the API spec definition">
              <Button variant="outlined" startIcon={<RestartAltIcon sx={{ fontSize: 18 }} />} onClick={reset}>
                Reset
              </Button>
            </Tooltip>
          </Stack>

          <ResponseViewer result={result} loading={loading} />
        </Box>
      </Collapse>
    </PixelPanel>
  );
}
