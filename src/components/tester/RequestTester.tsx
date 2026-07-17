"use client";

import { useMemo, useState } from "react";
import {
  Box, Button, IconButton, InputBase, MenuItem, Select, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { useApiTesterStore, extractPathParams, extractAccessToken, type KeyValueRow, type RequestDraft } from "@/lib/apiTester";
import { sendTest, type TestResult } from "@/services/testerService";
import { seedFromFields, nodesToExample } from "@/lib/schemaConvert";
import { EMPTY_NODES, useSchemaTreeStore, type SchemaNode } from "@/lib/schemaTree";
import { ResponseViewer } from "@/components/tester/ResponseViewer";
import { line, methodColor, secondaryText } from "@/components/theme";
import { PixelPanel } from "@/components/pixel/pixelBox";
import { PixelButton } from "@/components/pixel/PixelButton";
import { MethodBadge } from "@/components/pixel/PixelBadge";
import { PixelTabs, type PixelTabItem } from "@/components/pixel/PixelTabs";
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
    headers: [row("Content-Type", "application/json"), row("Accept-Encoding", "gzip, deflate")],
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

// Enabled headers merged with the bearer token — shared by the live send() call
// and the generated code snippets, so both stay in sync. Precedence for
// Authorization: explicit header row > per-draft bearerToken > workspace
// authToken (auto-captured from the login response). Placeholder rows left over
// from old drafts ("Bearer <token>") don't count as explicit.
function resolveHeaders(draft: RequestDraft, authToken: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const h of draft.headers) {
    if (!h.enabled || !h.key) continue;
    if (h.key.toLowerCase() === "authorization" && (!h.value.trim() || h.value.includes("<token>"))) continue;
    headers[h.key] = h.value;
  }
  if (!Object.keys(headers).some((k) => k.toLowerCase() === "authorization")) {
    const token = draft.bearerToken?.trim() || authToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function toCurl(method: HttpMethod, url: string, headers: Record<string, string>, body: string, hasBody: boolean): string {
  const parts = [`curl -X ${method} ${JSON.stringify(url)}`];
  for (const [k, v] of Object.entries(headers)) parts.push(`-H ${JSON.stringify(`${k}: ${v}`)}`);
  if (hasBody && body.trim()) parts.push(`-d ${JSON.stringify(body)}`);
  return parts.join(" \\\n  ");
}

function toFetch(method: HttpMethod, url: string, headers: Record<string, string>, body: string, hasBody: boolean): string {
  const headerEntries = Object.entries(headers);
  const headersBlock = headerEntries.length
    ? `,\n  headers: {\n${headerEntries.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n  }`
    : "";
  const bodyBlock = hasBody && body.trim() ? `,\n  body: ${JSON.stringify(body)}` : "";
  return `fetch(${JSON.stringify(url)}, {\n  method: ${JSON.stringify(method)}${headersBlock}${bodyBlock}\n})\n  .then((res) => res.json())\n  .then(console.log);`;
}

function toPython(method: HttpMethod, url: string, headers: Record<string, string>, body: string, hasBody: boolean): string {
  const headersLine = Object.keys(headers).length ? `\n    headers=${JSON.stringify(headers)},` : "";
  const bodyLine = hasBody && body.trim() ? `\n    data=${JSON.stringify(body)},` : "";
  return `import requests\n\nresponse = requests.request(\n    ${JSON.stringify(method)},\n    ${JSON.stringify(url)},${headersLine}${bodyLine}\n)\nprint(response.status_code, response.text)`;
}

type SnippetLang = "curl" | "js" | "python";

function CodeSnippets({
  method, url, headers, body, hasBody,
}: {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string;
  hasBody: boolean;
}) {
  const [lang, setLang] = useState<SnippetLang>("curl");
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    if (lang === "js") return toFetch(method, url, headers, body, hasBody);
    if (lang === "python") return toPython(method, url, headers, body, hasBody);
    return toCurl(method, url, headers, body, hasBody);
  }, [lang, method, url, headers, body, hasBody]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — ignore */
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <ToggleButtonGroup size="small" exclusive value={lang} onChange={(_, v: SnippetLang | null) => v && setLang(v)}>
          <ToggleButton value="curl" sx={{ fontSize: 12 }}>cURL</ToggleButton>
          <ToggleButton value="js" sx={{ fontSize: 12 }}>JavaScript</ToggleButton>
          <ToggleButton value="python" sx={{ fontSize: 12 }}>Python</ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title={copied ? "Copied!" : "Copy"}>
          <IconButton size="small" onClick={copy} sx={{ p: 0.4, color: copied ? "#16A34A" : "#6B7280" }}>
            {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
      </Stack>
      <Box
        component="pre"
        sx={{
          m: 0, p: 2, bgcolor: "#F8FAFC", border: `1px solid ${line}`, borderRadius: "12px",
          fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, lineHeight: 1.7, color: "#111827",
          overflow: "auto", maxHeight: 360, whiteSpace: "pre",
        }}
      >
        {code}
      </Box>
    </Box>
  );
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
    <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
      {children}
    </Typography>
  );
}

type ReqSection = "params" | "headers" | "body" | "code";

// The "Try it" tab — a live request runner attached to the selected API spec
// endpoint. Prefilled from the spec, editable, sent through the backend proxy.
// Draft persists per-resource; base URL is shared across the workspace.
export function RequestTester({ resource }: { resource: Resource }) {
  const baseUrl = useApiTesterStore((s) => s.baseUrl);
  const setBaseUrl = useApiTesterStore((s) => s.setBaseUrl);
  const authToken = useApiTesterStore((s) => s.authToken);
  const setAuthToken = useApiTesterStore((s) => s.setAuthToken);
  const savedDraft = useApiTesterStore((s) => s.drafts[resource.id]);
  const saveDraft = useApiTesterStore((s) => s.saveDraft);
  const reqNodes = useSchemaTreeStore((s) => s.trees[`${resource.id}::req`] ?? EMPTY_NODES);

  const [draft, setDraft] = useState<RequestDraft>(() => {
    if (savedDraft) return { ...savedDraft, pathParams: reconcilePathParams(savedDraft.path, savedDraft.pathParams) };
    return draftFromResource(resource, reqNodes);
  });
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<ReqSection>("params");
  const [tokenCaptured, setTokenCaptured] = useState(false);

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
    setLoading(true);
    try {
      const res = await sendTest({
        method: draft.method,
        url: previewUrl,
        headers: resolveHeaders(draft, authToken),
        body: BODY_METHODS.has(draft.method) ? draft.body : undefined,
      });
      setResult(res);
      // Auto-capture: any 2xx body carrying data.accessToken (the login
      // response) becomes the workspace token for every subsequent request.
      if (res.status >= 200 && res.status < 300) {
        const token = extractAccessToken(res.body);
        if (token) {
          setAuthToken(token);
          setTokenCaptured(true);
          setTimeout(() => setTokenCaptured(false), 2500);
        }
      }
    } catch (err) {
      setResult({ status: 0, durationMs: 0, headers: {}, body: "", size: 0, truncated: false, error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  const showBody = BODY_METHODS.has(draft.method);
  const sections: PixelTabItem<ReqSection>[] = [
    { value: "params", label: "Params" },
    { value: "headers", label: "Headers" },
    ...(showBody ? [{ value: "body" as const, label: "Body" }] : []),
    { value: "code", label: "Code" },
  ];
  const activeSection: ReqSection = sections.some((s) => s.value === section) ? section : sections[0].value;

  return (
    <PixelPanel sx={{ p: 0, overflow: "hidden" }}>
      {/* Request toolbar */}
      <Box sx={{ p: 1.5, borderBottom: `1px solid ${line}`, bgcolor: "#FAFAFC" }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "stretch", flexWrap: "wrap", rowGap: 1 }}>
          <Select
            size="small"
            value={draft.method}
            onChange={(e) => update({ method: e.target.value as HttpMethod })}
            renderValue={() => <MethodBadge method={draft.method} />}
            sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, minWidth: 108, borderRadius: 0, bgcolor: "#fff" }}
          >
            {HTTP_METHODS.map((m) => (
              <MenuItem key={m} value={m} sx={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: methodColor[m] }}>{m}</MenuItem>
            ))}
          </Select>
          <PixelactInput
            value={draft.path}
            onChange={(e) => update({ path: e.target.value })}
            placeholder="/api/v1/resource/{id}"
            className="min-w-[160px] flex-1 font-mono text-sm"
          />
          <PixelButton startIcon={<PlayArrowIcon />} onClick={send} disabled={loading} sx={{ flexShrink: 0 }}>
            {loading ? "Sending…" : "Send"}
          </PixelButton>
          <Tooltip title="Reset to the API spec definition">
            <IconButton onClick={reset} sx={{ border: `1.5px solid ${line}`, borderRadius: "10px", flexShrink: 0 }}>
              <RestartAltIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: secondaryText, flexShrink: 0 }}>Base URL</Typography>
          <InputBase
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:8080"
            sx={{ flex: "1 1 220px", minWidth: 0, fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, border: `1px solid ${line}`, borderRadius: 0, px: 0.9, py: 0.35, bgcolor: "#fff" }}
          />
          {authToken ? (
            <Tooltip title={`Auto-attached as "Authorization: Bearer …" to every request without its own Authorization header. Captured from the last login response.`}>
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  alignItems: "center", flexShrink: 0, px: 0.9, py: 0.25,
                  border: `1px solid ${tokenCaptured ? "#16A34A" : line}`,
                  bgcolor: tokenCaptured ? "#F0FDF4" : "#F8FAFC",
                  transition: "background-color 0.4s, border-color 0.4s",
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: "var(--font-mono, monospace)", color: tokenCaptured ? "#16A34A" : "#4B5563", fontWeight: 600 }}>
                  {tokenCaptured ? "🔑 token captured" : `🔑 ${authToken.slice(0, 10)}…`}
                </Typography>
                <IconButton size="small" aria-label="Clear auth token" onClick={() => setAuthToken("")} sx={{ p: 0.2 }}>
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Stack>
            </Tooltip>
          ) : (
            <Typography variant="caption" sx={{ color: "#94A3B8", flexShrink: 0, fontStyle: "italic" }}>
              🔓 no token — call login to capture
            </Typography>
          )}
        </Stack>
        <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: secondaryText, fontFamily: "var(--font-mono, monospace)", wordBreak: "break-all" }}>
          → {previewUrl || "(set base URL)"}
        </Typography>
      </Box>

      {/* Request sections (left) beside the response (right); stacks on a narrow center panel. */}
      <Box sx={{ containerType: "inline-size" }}>
        <Box sx={{ display: "flex", flexDirection: "column", "@container (min-width: 560px)": { flexDirection: "row" } }}>
          <Box
            sx={{
              flex: 1, minWidth: 0, p: 1.5, borderBottom: `1px solid ${line}`,
              "@container (min-width: 560px)": { borderBottom: "none", borderRight: `1px solid ${line}` },
            }}
          >
            <PixelTabs value={activeSection} onChange={setSection} tabs={sections} sx={{ mb: 1.5 }} />

            {activeSection === "params" ? (
              <Stack spacing={2}>
                <Box>
                  <SectionLabel>Path parameters</SectionLabel>
                  <RowsEditor rows={draft.pathParams} lockKeys onChange={(rows) => update({ pathParams: rows })} />
                </Box>
                <Box>
                  <SectionLabel>Query parameters</SectionLabel>
                  <RowsEditor rows={draft.queryParams} addLabel="Add query param" onChange={(rows) => update({ queryParams: rows })} />
                </Box>
              </Stack>
            ) : null}

            {activeSection === "headers" ? (
              <RowsEditor rows={draft.headers} addLabel="Add header" onChange={(rows) => update({ headers: rows })} />
            ) : null}

            {activeSection === "body" && showBody ? (
              <InputBase
                value={draft.body}
                onChange={(e) => update({ body: e.target.value })}
                multiline
                minRows={8}
                sx={{ width: "100%", fontFamily: "var(--font-mono, monospace)", fontSize: 12.5, border: `1px solid ${line}`, borderRadius: 0, p: 1.25, bgcolor: "#F8FAFC" }}
              />
            ) : null}

            {activeSection === "code" ? (
              <CodeSnippets method={draft.method} url={previewUrl} headers={resolveHeaders(draft, authToken)} body={draft.body} hasBody={showBody} />
            ) : null}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, p: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: secondaryText, display: "block", mb: 1, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Response
            </Typography>
            <ResponseViewer result={result} loading={loading} />
          </Box>
        </Box>
      </Box>
    </PixelPanel>
  );
}
