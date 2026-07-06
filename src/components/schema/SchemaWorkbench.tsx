"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTreeOutlined";
import SchemaIcon from "@mui/icons-material/SchemaOutlined";
import CodeIcon from "@mui/icons-material/CodeOutlined";
import DataObjectIcon from "@mui/icons-material/DataObjectOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useSchemaTreeStore } from "@/lib/schemaTree";
import { jsonSchemaToNodes, nodesToExample, nodesToJsonSchema, nodesToTypeScript, seedFromFields } from "@/lib/schemaConvert";
import { SchemaTreeEditor } from "@/components/schema/SchemaTreeEditor";
import { JsonView } from "@/components/schema/JsonView";
import { AskAiPanel } from "@/components/schema/AskAiPanel";
import { line } from "@/components/theme";
import type { SchemaField } from "@/lib/types";

type Mode = "visual" | "schema" | "example" | "typescript";

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "visual", label: "Visual Builder", icon: <AccountTreeIcon sx={{ fontSize: 16 }} /> },
  { id: "schema", label: "JSON Schema", icon: <SchemaIcon sx={{ fontSize: 16 }} /> },
  { id: "example", label: "Example JSON", icon: <CodeIcon sx={{ fontSize: 16 }} /> },
  { id: "typescript", label: "Example TypeScript", icon: <DataObjectIcon sx={{ fontSize: 16 }} /> },
];

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <Box sx={{ display: "flex", flexWrap: { xs: "wrap", sm: "nowrap" }, p: 0.5, gap: 0.4, bgcolor: "#F1F5F9", borderRadius: "10px", maxWidth: "100%" }}>
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <Box
            key={m.id}
            role="button"
            onClick={() => onChange(m.id)}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.6,
              px: 1.25,
              py: 0.6,
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
              whiteSpace: "nowrap",
              color: active ? "#111827" : "#6B7280",
              bgcolor: active ? "#fff" : "transparent",
              boxShadow: active ? "0 1px 2px rgba(15,23,42,0.08)" : "none",
            }}
          >
            {m.icon}
            {m.label}
          </Box>
        );
      })}
    </Box>
  );
}

function JsonSchemaMode({ scope }: { scope: string }) {
  const nodes = useSchemaTreeStore((s) => s.trees[scope] ?? []);
  const setNodes = useSchemaTreeStore((s) => s.setNodes);
  const text = useMemo(() => JSON.stringify(nodesToJsonSchema(nodes), null, 2), [nodes]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [err, setErr] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(text);
    setErr(null);
    setEditing(true);
  };
  const format = () => {
    try {
      setDraft(JSON.stringify(JSON.parse(draft), null, 2));
      setErr(null);
    } catch {
      setErr("Invalid JSON — cannot format");
    }
  };
  const apply = () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setErr("Invalid JSON");
      return;
    }
    setNodes(scope, jsonSchemaToNodes(parsed));
    setEditing(false);
    setErr(null);
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
        <Typography sx={{ fontSize: 12, color: "#94A3B8", flex: 1 }}>
          {editing ? "Editing — Apply rebuilds the Visual Builder tree" : "Read-only · synced with the Visual Builder"}
        </Typography>
        {editing ? (
          <>
            {err ? <Typography sx={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>{err}</Typography> : null}
            <Button size="small" variant="outlined" onClick={format}>Format</Button>
            <Button size="small" variant="outlined" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="small" variant="contained" onClick={apply}>Apply</Button>
          </>
        ) : (
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={startEdit}>Edit</Button>
        )}
      </Stack>
      {editing ? (
        <TextField
          fullWidth
          multiline
          minRows={16}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          sx={{ "& textarea": { fontFamily: "var(--font-mono,monospace)", fontSize: 12.5, lineHeight: 1.7 } }}
        />
      ) : (
        <JsonView code={text} />
      )}
    </Box>
  );
}

function ExampleMode({ scope }: { scope: string }) {
  const nodes = useSchemaTreeStore((s) => s.trees[scope] ?? []);
  const text = useMemo(() => JSON.stringify(nodesToExample(nodes), null, 2), [nodes]);
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
        <Typography sx={{ fontSize: 12, color: "#94A3B8", flex: 1 }}>Generated from the schema · read-only</Typography>
        <Button size="small" variant="outlined" onClick={() => navigator.clipboard?.writeText(text)}>Copy</Button>
      </Stack>
      <JsonView code={text} />
    </Box>
  );
}

// Read-only TypeScript interface generated from the tree.
function TypeScriptMode({ scope, typeName }: { scope: string; typeName: string }) {
  const nodes = useSchemaTreeStore((s) => s.trees[scope] ?? []);
  const text = useMemo(() => nodesToTypeScript(nodes, typeName), [nodes, typeName]);
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
        <Typography sx={{ fontSize: 12, color: "#94A3B8", flex: 1 }}>Generated from the schema · read-only</Typography>
        <Button size="small" variant="outlined" onClick={() => navigator.clipboard?.writeText(text)}>Copy</Button>
      </Stack>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          bgcolor: "#F8FAFC",
          border: `1px solid ${line}`,
          borderRadius: "12px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 12.5,
          lineHeight: 1.7,
          color: "#111827",
          overflow: "auto",
          maxHeight: 460,
          whiteSpace: "pre",
          tabSize: 2,
        }}
      >
        <code>{text}</code>
      </Box>
    </Box>
  );
}

export function SchemaWorkbench({ scope, seedFields, typeName = "Schema" }: { scope: string; seedFields: SchemaField[]; typeName?: string }) {
  const ensureSeed = useSchemaTreeStore((s) => s.ensureSeed);
  const nodes = useSchemaTreeStore((s) => s.trees[scope] ?? []);
  const [mode, setMode] = useState<Mode>("visual");
  const [aiOpen, setAiOpen] = useState(false);

  // Seed this scope from the backend's flat fields the first time it opens.
  useEffect(() => {
    ensureSeed(scope, () => seedFromFields(seedFields));
  }, [scope, seedFields, ensureSeed]);

  // The corner mascot's AI menu opens this panel via a window event (only the
  // currently-mounted workbench — i.e. the active tab's request body — reacts).
  useEffect(() => {
    const openAi = () => setAiOpen(true);
    window.addEventListener("kingdom:ask-ai", openAi);
    return () => window.removeEventListener("kingdom:ask-ai", openAi);
  }, []);

  return (
    <Box sx={{ position: "relative" }}>
      {/* Contextual toolbar: view modes on the left, AI assistant on the right. */}
      <Stack direction="row" sx={{ mb: 2, gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <ModeTabs mode={mode} onChange={setMode} />
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          size="small"
          onClick={() => setAiOpen(true)}
          startIcon={<AutoAwesomeIcon sx={{ fontSize: 16, color: "#8B5CF6" }} />}
          sx={{ color: "#6D28D9", borderColor: "#EDE9FE", bgcolor: "#F5F3FF", "&:hover": { bgcolor: "#EDE9FE", borderColor: "#DDD6FE" } }}
        >
          Ask AI
        </Button>
      </Stack>

      {mode === "visual" ? <SchemaTreeEditor scope={scope} /> : null}
      {mode === "schema" ? <JsonSchemaMode scope={scope} /> : null}
      {mode === "example" ? <ExampleMode scope={scope} /> : null}
      {mode === "typescript" ? <TypeScriptMode scope={scope} typeName={typeName} /> : null}

      <AskAiPanel scope={scope} nodes={nodes} open={aiOpen} onClose={() => setAiOpen(false)} />
    </Box>
  );
}
