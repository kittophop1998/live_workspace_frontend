"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
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
import { buildResponseSchemas, toField, useResponseSchemaStore } from "@/lib/responseSchemas";
import { useSchemaTreeStore } from "@/lib/schemaTree";
import { seedFromFields } from "@/lib/schemaConvert";
import { parseSpec, type ImportedOperation, type ParsedSpec } from "@/lib/specImport";
import { line, methodColor } from "@/components/theme";

const PLACEHOLDER = `Paste an OpenAPI document (JSON or YAML) or a Postman
collection (JSON) here, or use "Upload file" above.

openapi: 3.0.0
paths:
  /users/{id}:
    get:
      responses:
        '200': { description: OK, content: { application/json: { schema: { ... } } } }`;

function methodChip(method: string) {
  return (
    <Box component="span" sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 11, fontWeight: 800, color: methodColor[method] ?? "#52525B", width: 52, flexShrink: 0 }}>
      {method}
    </Box>
  );
}

export function ImportSpecDialog({ resourceId }: { resourceId: string }) {
  const updateEndpoint = useWorkspaceStore((s) => s.updateEndpoint);
  const importTypedFields = useWorkspaceStore((s) => s.importTypedFields);
  const setResponseSchemas = useResponseSchemaStore((s) => s.setForResource);
  const setTreeNodes = useSchemaTreeStore((s) => s.setNodes);

  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedSpec | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setOpen(false);
    setText("");
    setParsed(null);
    setSelectedId(null);
    setError(null);
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
      setSelectedId(result.operations[0].id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse spec.");
      setParsed(null);
    }
  };

  const apply = (op: ImportedOperation) => {
    updateEndpoint(resourceId, { method: op.method, path: op.path });

    // Request body — the Visual Builder + "Try it" read the schema TREE, so overwrite
    // it directly (source of truth). `importTypedFields` keeps backend fields/codegen
    // roughly in sync but only ever adds new keys, so it alone can't reflect the spec.
    const requestFields = op.requestFields.map((f) => toField(f, "added"));
    setTreeNodes(`${resourceId}::req`, seedFromFields(requestFields));
    if (op.requestFields.length) importTypedFields(resourceId, op.requestFields);

    // Responses — write the per-status store, and reset each status' tree so a
    // re-import of an already-seeded status reflects the new spec too.
    const schemas = buildResponseSchemas(op);
    setResponseSchemas(resourceId, schemas);
    for (const s of schemas) setTreeNodes(`${resourceId}::res::${s.status}`, seedFromFields(s.fields));

    reset();
  };

  const selected = parsed?.operations.find((o) => o.id === selectedId) ?? null;

  return (
    <>
      <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setOpen(true)}>
        Import Specification
      </Button>

      <Dialog open={open} onClose={reset} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Import Specification</DialogTitle>
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
            minRows={8}
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
              <Typography variant="caption" sx={{ color: "#71717A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Pick an operation to apply to this endpoint
              </Typography>
              <Box sx={{ mt: 1, border: `2px solid ${line}`, borderRadius: "8px", maxHeight: 220, overflowY: "auto" }}>
                {parsed.operations.map((op, i) => {
                  const active = op.id === selectedId;
                  return (
                    <Box
                      key={`${op.id}-${i}`}
                      role="button"
                      onClick={() => setSelectedId(op.id)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1.25,
                        py: 0.85,
                        cursor: "pointer",
                        borderBottom: `1.5px solid #E4E4E7`,
                        bgcolor: active ? "#FFFBEB" : "#fff",
                        "&:last-of-type": { borderBottom: "none" },
                      }}
                    >
                      {methodChip(op.method)}
                      <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 12.5, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {op.path}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: "#A1A1AA", flexShrink: 0 }}>
                        {op.responses.length} resp · {op.requestFields.length} req
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={reset}>Cancel</Button>
          {parsed ? (
            <Button variant="contained" disabled={!selected} onClick={() => selected && apply(selected)}>
              Apply to endpoint
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
