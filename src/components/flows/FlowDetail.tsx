"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Collapse, Stack, TextField, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RemoveCircleOutlineIcon from "@mui/icons-material/DoDisturbOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { flowService } from "@/services/flowService";
import { useApiTesterStore } from "@/lib/apiTester";
import { FlowDefinitionView } from "@/components/flows/FlowDefinitionView";
import { MonoTag, relativeTime } from "@/components/common";
import { JsonView } from "@/components/schema/JsonView";
import { line, methodColor } from "@/components/theme";
import type { FlowDefinition, FlowRun, JsonValue, StepResult } from "@/lib/types";

function statusColor(status: string): string {
  if (status === "passed") return "#16A34A";
  if (status === "failed") return "#DC2626";
  return "#D97706"; // errored
}

// Parse an input value: JSON when it looks like it (numbers/booleans/objects),
// otherwise a plain string.
function coerce(value: string): JsonValue {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  try {
    return JSON.parse(trimmed) as JsonValue;
  } catch {
    return value;
  }
}

function StepResultRow({ result }: { result: StepResult }) {
  const [open, setOpen] = useState(false);
  const icon = result.skipped ? (
    <RemoveCircleOutlineIcon sx={{ fontSize: 18, color: "#A1A1AA" }} />
  ) : result.passed ? (
    <CheckCircleIcon sx={{ fontSize: 18, color: "#16A34A" }} />
  ) : (
    <CancelIcon sx={{ fontSize: 18, color: "#DC2626" }} />
  );
  const headerEntries = Object.entries(result.requestHeaders ?? {});
  const hasDetail = Boolean(result.response || result.requestBody || headerEntries.length || Object.keys(result.outputs).length);

  return (
    <Box sx={{ border: `2px solid ${line}`, borderRadius: "10px", bgcolor: "#fff", overflow: "hidden" }}>
      <Stack
        direction="row"
        spacing={1}
        onClick={() => hasDetail && setOpen((v) => !v)}
        sx={{ alignItems: "center", p: 1.25, flexWrap: "wrap", cursor: hasDetail ? "pointer" : "default" }}
      >
        {icon}
        <Typography sx={{ fontWeight: 800 }}>{result.stepId}</Typography>
        {result.skipped ? (
          <Chip size="small" variant="outlined" label="skipped" sx={{ height: 20 }} />
        ) : (
          <>
            {result.method ? <MonoTag sx={{ color: methodColor[result.method] ?? line }}>{result.method}</MonoTag> : null}
            {result.status ? (
              <Chip size="small" label={result.status} sx={{ height: 20, fontWeight: 800, color: "#fff", bgcolor: result.status < 400 ? "#16A34A" : "#DC2626" }} />
            ) : null}
            <MonoTag>{result.durationMs} ms</MonoTag>
          </>
        )}
        {hasDetail ? (
          <Box sx={{ ml: "auto" }}>
            <ExpandMoreIcon sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", color: "#71717A" }} />
          </Box>
        ) : null}
      </Stack>

      {result.url ? (
        <Typography variant="caption" sx={{ display: "block", px: 1.25, pb: 0.5, color: "#71717A", fontFamily: "var(--font-mono, monospace)", wordBreak: "break-all" }}>
          {result.url}
        </Typography>
      ) : null}

      {result.error ? (
        <Typography variant="body2" sx={{ px: 1.25, pb: 1, color: "#991B1B" }}>{result.error}</Typography>
      ) : null}

      {result.failures.length ? (
        <Box sx={{ px: 1.25, pb: 1 }}>
          {result.failures.map((f, i) => (
            <Typography key={i} variant="body2" sx={{ color: "#B91C1C" }}>✗ {f}</Typography>
          ))}
        </Box>
      ) : null}

      <Collapse in={open}>
        <Box sx={{ px: 1.25, pb: 1.25 }}>
          {Object.keys(result.outputs).length ? (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#52525B" }}>Extracted outputs</Typography>
              <JsonView code={JSON.stringify(result.outputs, null, 2)} maxHeight={140} />
            </Box>
          ) : null}
          {headerEntries.length ? (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#52525B" }}>Request headers</Typography>
              <Box sx={{ mt: 0.5, border: `1.5px solid ${line}`, borderRadius: "8px", p: 1, bgcolor: "#FAFAFA" }}>
                {headerEntries.map(([k, v]) => (
                  <Typography key={k} sx={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11.5, wordBreak: "break-all" }}>
                    <Box component="span" sx={{ fontWeight: 800 }}>{k}:</Box> {v}
                  </Typography>
                ))}
              </Box>
            </Box>
          ) : null}
          {result.requestBody ? (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#52525B" }}>Request body</Typography>
              <JsonView code={result.requestBody} maxHeight={160} />
            </Box>
          ) : null}
          {result.response ? (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#52525B" }}>Response</Typography>
              <JsonView code={prettify(result.response)} maxHeight={220} />
            </Box>
          ) : null}
        </Box>
      </Collapse>
    </Box>
  );
}

function prettify(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function FlowDetail({ flow }: { flow: FlowDefinition }) {
  const baseUrl = useApiTesterStore((s) => s.baseUrl);
  const setBaseUrl = useApiTesterStore((s) => s.setBaseUrl);
  const flowId = flow.id ?? "";
  // This component is keyed by flow id at the call site, so it remounts per flow
  // — seed local state straight from props (no setState-in-effect needed).
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(flow.inputs.map((v) => [v.name, v.value !== undefined ? String(v.value) : ""])),
  );
  const [run, setRun] = useState<FlowRun | null>(null);
  const [history, setHistory] = useState<FlowRun[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch run history (async callback — allowed) once per flow.
  useEffect(() => {
    if (!flowId) return;
    let active = true;
    flowService.listRuns(flowId).then((r) => active && setHistory(r)).catch(() => active && setHistory([]));
    return () => { active = false; };
  }, [flowId]);

  const runFlow = async () => {
    if (!flowId) return;
    if (!/^https?:\/\//i.test(baseUrl.trim())) {
      setError("Set a Base URL (e.g. http://localhost:8080) before running.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const payload = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, coerce(v)]));
      const result = await flowService.run(flowId, baseUrl.trim(), payload);
      setRun(result);
      setHistory((prev) => [result, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const summary = useMemo(() => {
    if (!run) return null;
    const passed = run.steps.filter((s) => s.passed && !s.skipped).length;
    const total = run.steps.filter((s) => !s.skipped).length;
    return { passed, total };
  }, [run]);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) 380px" }, gap: 2 }}>
      {/* Definition + results */}
      <Box>
        <FlowDefinitionView flow={flow} />

        {run ? (
          <Box sx={{ mt: 2.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
              <Typography variant="h2">Run result</Typography>
              <Chip size="small" label={run.status} sx={{ fontWeight: 800, color: "#fff", bgcolor: statusColor(run.status), border: `2px solid ${line}` }} />
              {summary ? <Typography variant="caption" sx={{ color: "#71717A" }}>{summary.passed}/{summary.total} steps passed</Typography> : null}
            </Stack>
            <Stack spacing={1}>
              {run.steps.map((s) => <StepResultRow key={s.stepId} result={s} />)}
            </Stack>
          </Box>
        ) : null}
      </Box>

      {/* Run controls + history */}
      <Box>
        <Box sx={{ border: `2px solid ${line}`, borderRadius: "14px", bgcolor: "#fff", p: 2, boxShadow: "4px 4px 0 #0A0A0A", position: "sticky", top: 0 }}>
          <Typography variant="h3" sx={{ mb: 1 }}>Run workflow</Typography>
          <TextField
            fullWidth
            size="small"
            label="Base URL"
            placeholder="http://localhost:8080"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, input: { sx: { fontFamily: "var(--font-mono, monospace)", fontSize: 13 } } }}
          />

          {flow.inputs.length ? (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Inputs</Typography>
              <Stack spacing={1} sx={{ mt: 0.75 }}>
                {flow.inputs.map((v) => (
                  <TextField
                    key={v.name}
                    fullWidth
                    size="small"
                    label={v.name}
                    value={inputs[v.name] ?? ""}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [v.name]: e.target.value }))}
                    slotProps={{ inputLabel: { shrink: true }, input: { sx: { fontFamily: "var(--font-mono, monospace)", fontSize: 13 } } }}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}

          <Button fullWidth variant="contained" startIcon={<PlayArrowIcon />} onClick={runFlow} disabled={running} sx={{ mt: 1.5 }}>
            {running ? "Running…" : "Run flow"}
          </Button>
          {error ? <Typography variant="body2" sx={{ color: "#991B1B", mt: 1 }}>{error}</Typography> : null}
        </Box>

        {history.length ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h3" sx={{ mb: 1 }}>Run history</Typography>
            <Stack spacing={0.75}>
              {history.map((h) => (
                <Stack
                  key={h.id}
                  direction="row"
                  spacing={1}
                  onClick={() => setRun(h)}
                  sx={{ alignItems: "center", p: 1, border: `2px solid ${line}`, borderRadius: "8px", bgcolor: "#fff", cursor: "pointer", "&:hover": { bgcolor: "#FAFAFA" } }}
                >
                  <Chip size="small" label={h.status} sx={{ height: 20, fontWeight: 700, color: "#fff", bgcolor: statusColor(h.status) }} />
                  <Typography variant="caption" sx={{ color: "#71717A" }}>{relativeTime(h.startedAt)}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
