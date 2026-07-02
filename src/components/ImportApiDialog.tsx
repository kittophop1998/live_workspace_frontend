"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFileOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { parseSpec, type ParsedSpec } from "@/lib/specImport";
import { line, methodColor } from "@/components/theme";

const PLACEHOLDER = `Paste an OpenAPI document (JSON or YAML) or a Postman
collection (JSON), or use "Upload file" above. Every operation
you select is created as a new endpoint in this workspace.`;

function methodChip(method: string) {
  return (
    <Box component="span" sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 11, fontWeight: 800, color: methodColor[method] ?? "#52525B", width: 52, flexShrink: 0 }}>
      {method}
    </Box>
  );
}

export function ImportApiDialog() {
  const importEndpoints = useWorkspaceStore((s) => s.importEndpoints);
  const clearResources = useWorkspaceStore((s) => s.clearResources);

  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedSpec | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setOpen(false);
    setText("");
    setParsed(null);
    setPicked(new Set());
    setError(null);
    setBusy(false);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const content = await file.text();
      setText(content);
      setError(null);
      runParse(content);
    } catch {
      setError("Could not read that file.");
    }
  };

  const runParse = (source?: string) => {
    try {
      const result = parseSpec(source ?? text);
      if (result.operations.length === 0) {
        setError("No operations (paths/requests) found in that spec.");
        setParsed(null);
        return;
      }
      setParsed(result);
      setPicked(new Set(result.operations.map((o) => o.id)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse spec.");
      setParsed(null);
    }
  };

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allPicked = parsed ? picked.size === parsed.operations.length : false;
  const toggleAll = () =>
    setPicked(allPicked ? new Set() : new Set(parsed?.operations.map((o) => o.id) ?? []));

  const apply = async () => {
    if (!parsed) return;
    const ops = parsed.operations.filter((o) => picked.has(o.id));
    if (!ops.length) return;
    if (!window.confirm("Import will remove ALL existing resources in this workspace first, then create the selected endpoints. Continue?")) {
      return;
    }
    setBusy(true);
    // Wipe the current left explorer, then recreate endpoints from the spec.
    await clearResources();
    await importEndpoints(ops);
    reset();
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
        onClick={() => setOpen(true)}
        sx={{ minWidth: { xs: 0, sm: 64 }, px: { xs: 1, sm: 1.5 }, "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 } } }}
      >
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Import API</Box>
      </Button>

      <Dialog open={open} onClose={busy ? undefined : reset} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Import API specification</DialogTitle>
        <DialogContent>
          <input
            ref={fileInput}
            type="file"
            accept=".json,.yaml,.yml,application/json,text/yaml"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />

          <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, alignItems: "center" }}>
            <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInput.current?.click()}>
              Upload file
            </Button>
            <Typography variant="caption" sx={{ color: "#71717A" }}>
              OpenAPI (.yaml / .json) or Postman collection (.json)
            </Typography>
          </Stack>

          <TextField
            multiline
            minRows={7}
            fullWidth
            placeholder={PLACEHOLDER}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParsed(null);
              setError(null);
            }}
            error={Boolean(error)}
            helperText={error ?? (parsed ? `Parsed ${parsed.format.toUpperCase()}${parsed.title ? ` · ${parsed.title}` : ""}` : "Paste the spec, then Parse.")}
            sx={{ "& textarea": { fontFamily: "var(--font-mono,monospace)", fontSize: 12.5 } }}
          />

          {parsed ? (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>
                <Typography variant="caption" sx={{ color: "#71717A", textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>
                  Endpoints to create ({picked.size}/{parsed.operations.length})
                </Typography>
                <Button size="small" variant="outlined" onClick={toggleAll}>
                  {allPicked ? "Clear all" : "Select all"}
                </Button>
              </Stack>
              <Box sx={{ border: `2px solid ${line}`, borderRadius: "8px", maxHeight: 240, overflowY: "auto" }}>
                {parsed.operations.map((op, i) => (
                  <Box
                    key={`${op.id}-${i}`}
                    role="button"
                    onClick={() => toggle(op.id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1,
                      py: 0.5,
                      cursor: "pointer",
                      borderBottom: `1.5px solid #E4E4E7`,
                      bgcolor: picked.has(op.id) ? "#FFFBEB" : "#fff",
                      "&:last-of-type": { borderBottom: "none" },
                    }}
                  >
                    <Checkbox size="small" checked={picked.has(op.id)} sx={{ p: 0.5 }} />
                    {methodChip(op.method)}
                    <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 12.5, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {op.path}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: "#A1A1AA", flexShrink: 0 }}>
                      {op.responses.length} resp · {op.requestFields.length} req
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#B45309", fontWeight: 700 }}>
                ⚠ Importing removes all existing resources in this workspace first, then creates the selected endpoints.
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={reset} disabled={busy}>Cancel</Button>
          {parsed ? (
            <Button variant="contained" disabled={busy || picked.size === 0} onClick={apply}>
              {busy ? "Creating…" : `Create ${picked.size} endpoint${picked.size === 1 ? "" : "s"}`}
            </Button>
          ) : (
            <Button variant="contained" disabled={!text.trim()} onClick={() => runParse()}>
              Parse
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
