"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { useSchemaTreeStore, type SchemaNode } from "@/lib/schemaTree";
import { nodesToExample } from "@/lib/schemaConvert";
import { detectReusable, explainNode, jsonToNodes, nlToNodes } from "@/lib/schemaAI";
import { JsonView } from "@/components/schema/JsonView";
import { line } from "@/components/theme";
import type { JsonValue } from "@/lib/types";

function mergeUnique(existing: SchemaNode[], added: SchemaNode[]): SchemaNode[] {
  const keys = new Set(existing.map((n) => n.key));
  return [...existing, ...added.filter((n) => !keys.has(n.key))];
}

const tabSx = { minHeight: 40, fontSize: 12.5, fontWeight: 700, textTransform: "none" } as const;

export function AskAiPanel({
  scope,
  nodes,
  open,
  onClose,
}: {
  scope: string;
  nodes: SchemaNode[];
  open: boolean;
  onClose: () => void;
}) {
  const setNodes = useSchemaTreeStore((s) => s.setNodes);
  const [tab, setTab] = useState(0);
  const [nl, setNl] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [jsonErr, setJsonErr] = useState<string | null>(null);
  const [explainId, setExplainId] = useState<string | null>(null);

  const generate = () => {
    const created = nlToNodes(nl);
    if (created.length) setNodes(scope, mergeUnique(nodes, created));
    setNl("");
  };

  const convert = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonErr("Invalid JSON");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setJsonErr('Paste a JSON object, e.g. { "id": "uuid" }');
      return;
    }
    setNodes(scope, mergeUnique(nodes, jsonToNodes(parsed as Record<string, JsonValue>)));
    setJsonText("");
    setJsonErr(null);
  };

  const explainNodeObj = explainId ? nodes.find((n) => n.id === explainId) : null;
  const reusable = detectReusable(nodes);
  const example = JSON.stringify(nodesToExample(nodes), null, 2);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 }, borderLeft: `2px solid ${line}` } } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, py: 2, borderBottom: `2px solid ${line}` }}>
        <AutoAwesomeIcon sx={{ fontSize: 20, color: "#7C3AED" }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h2">Ask AI</Typography>
          <Typography sx={{ fontSize: 11, color: "#A1A1AA" }}>Offline assistant · rule-based, no external LLM</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons={false} sx={{ px: 1.5, borderBottom: `2px solid ${line}`, minHeight: 40 }}>
        <Tab sx={tabSx} label="Generate" />
        <Tab sx={tabSx} label="Convert JSON" />
        <Tab sx={tabSx} label="Explain" />
        <Tab sx={tabSx} label="Example" />
        <Tab sx={tabSx} label="Reuse" />
      </Tabs>

      <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
        {/* Generate from description */}
        {tab === 0 ? (
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 13, color: "#52525B" }}>
              Describe the fields in plain language — one per line or comma-separated.
            </Typography>
            <TextField
              multiline
              minRows={6}
              fullWidth
              placeholder={"user id (uuid, required)\nemail string\nage integer\nis active boolean\ncreated at timestamp\ntags array"}
              value={nl}
              onChange={(e) => setNl(e.target.value)}
              sx={{ "& textarea": { fontSize: 13 } }}
            />
            <Button variant="contained" onClick={generate} disabled={!nl.trim()}>
              Generate fields
            </Button>
          </Stack>
        ) : null}

        {/* Convert pasted JSON */}
        {tab === 1 ? (
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 13, color: "#52525B" }}>
              Paste a JSON object — it becomes a typed visual schema (nested objects & arrays included).
            </Typography>
            <TextField
              multiline
              minRows={8}
              fullWidth
              placeholder={'{\n  "id": "uuid",\n  "profile": { "name": "string" }\n}'}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonErr(null);
              }}
              error={Boolean(jsonErr)}
              helperText={jsonErr ?? "Existing top-level keys are kept."}
              sx={{ "& textarea": { fontFamily: "var(--font-mono,monospace)", fontSize: 12.5 } }}
            />
            <Button variant="contained" onClick={convert} disabled={!jsonText.trim()}>
              Convert to schema
            </Button>
          </Stack>
        ) : null}

        {/* Explain a field */}
        {tab === 2 ? (
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 13, color: "#52525B" }}>Pick a field to explain.</Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
              {nodes.map((n) => (
                <Chip
                  key={n.id}
                  label={n.key}
                  onClick={() => setExplainId(n.id)}
                  variant={explainId === n.id ? "filled" : "outlined"}
                  sx={{ fontFamily: "var(--font-mono,monospace)", bgcolor: explainId === n.id ? "#EFF6FF" : undefined }}
                />
              ))}
              {nodes.length === 0 ? <Typography sx={{ fontSize: 12, color: "#A1A1AA" }}>No fields to explain yet.</Typography> : null}
            </Stack>
            {explainNodeObj ? (
              <Box sx={{ p: 2, border: "2px solid #0A0A0A", borderRadius: "12px", bgcolor: "#FBFBFC", fontSize: 13.5, lineHeight: 1.7 }}>
                {explainNode(explainNodeObj)}
              </Box>
            ) : null}
          </Stack>
        ) : null}

        {/* Example payload */}
        {tab === 3 ? (
          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography sx={{ fontSize: 13, color: "#52525B", flex: 1 }}>Generated sample payload.</Typography>
              <Button size="small" variant="outlined" onClick={() => navigator.clipboard?.writeText(example)}>
                Copy
              </Button>
            </Stack>
            <JsonView code={example} maxHeight={420} />
          </Stack>
        ) : null}

        {/* Reusable component suggestions */}
        {tab === 4 ? (
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 13, color: "#52525B" }}>
              Repeated object shapes that could be extracted into a shared component.
            </Typography>
            {reusable.length === 0 ? (
              <Box sx={{ p: 2, color: "#A1A1AA", fontSize: 13, border: "1.5px dashed #D4D4D8", borderRadius: "10px" }}>
                No duplicate structures detected.
              </Box>
            ) : (
              reusable.map((r) => (
                <Box key={r.signature} sx={{ p: 1.5, border: "2px solid #0A0A0A", borderRadius: "10px", bgcolor: "#fff" }}>
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 800, fontSize: 14 }}>{r.suggestedName}</Typography>
                    <Chip size="small" label={`${r.occurrences.length}× · ${r.fieldCount} fields`} />
                  </Stack>
                  <Typography sx={{ fontSize: 12, color: "#71717A" }}>
                    Appears as: {r.occurrences.map((k) => <Box key={k} component="span" sx={{ fontFamily: "var(--font-mono,monospace)" }}>{k} </Box>)}
                  </Typography>
                </Box>
              ))
            )}
            <Divider />
            <Typography sx={{ fontSize: 11, color: "#A1A1AA" }}>
              Extraction to a real shared $ref component is a backend-model change (not yet supported) — this is a detector + suggestion.
            </Typography>
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  );
}
