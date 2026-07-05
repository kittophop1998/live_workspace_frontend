"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Chip, Drawer, Stack, Tooltip, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SaveIcon from "@mui/icons-material/SaveOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlineOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import { flowService } from "@/services/flowService";
import { FlowDefinitionView } from "@/components/flows/FlowDefinitionView";
import { FlowDetail } from "@/components/flows/FlowDetail";
import { line, wash } from "@/components/theme";
import type { FlowDefinition } from "@/lib/types";

export function FlowTestingPage() {
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<FlowDefinition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile-only flows drawer
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => flowService.list().then(setFlows).catch((e) => setError(String(e?.message ?? e)));
  useEffect(() => {
    refresh();
  }, []);

  const onFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = await flowService.parse(text);
      setPreview(parsed);
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse workflow file");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const savePreview = async (flow: FlowDefinition, index: number) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await flowService.save(flow);
      await refresh();
      setPreview((prev) => {
        const next = (prev ?? []).filter((_, i) => i !== index);
        return next.length ? next : null;
      });
      setSelectedId(saved.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteFlow = async (flow: FlowDefinition) => {
    if (!flow.id) return;
    if (!window.confirm(`Delete workflow "${flow.name}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await flowService.remove(flow.id);
      if (selectedId === flow.id) setSelectedId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const selected = flows.find((f) => f.id === selectedId) ?? null;

  // Sidebar content (upload + saved workflow list) — shared between the desktop
  // column and the mobile drawer. onNavigate closes the drawer after a pick.
  const sidebar = (onNavigate?: () => void) => (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, bgcolor: "#fff" }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${line}` }}>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.yaml,.yml,application/json,application/x-yaml,text/yaml"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <Button fullWidth variant="contained" startIcon={<UploadFileIcon />} onClick={() => { fileRef.current?.click(); onNavigate?.(); }} disabled={busy}>
          Upload Arazzo file
        </Button>
        <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#6B7280" }}>
          OpenAPI Workflows (Arazzo) JSON or YAML.
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
        <Typography variant="h3" sx={{ px: 1, py: 1 }}>Saved workflows</Typography>
        {flows.length === 0 ? (
          <Typography variant="body2" sx={{ px: 1, color: "#94A3B8" }}>None yet — upload a workflow to begin.</Typography>
        ) : (
          <Stack spacing={0.5}>
            {flows.map((flow) => (
              <Box
                key={flow.id}
                onClick={() => { setSelectedId(flow.id ?? null); setPreview(null); onNavigate?.(); }}
                sx={{
                  p: 1, borderRadius: "8px", cursor: "pointer", border: `2px solid ${flow.id === selectedId ? line : "transparent"}`,
                  bgcolor: flow.id === selectedId ? wash : "transparent", "&:hover": { bgcolor: wash },
                  display: "flex", alignItems: "center", gap: 0.5,
                  "&:hover .flow-delete": { opacity: 1 },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>{flow.name}</Typography>
                  <Typography variant="caption" sx={{ color: "#6B7280" }}>{flow.steps.length} steps</Typography>
                </Box>
                <Tooltip title="Delete workflow">
                  <Box
                    className="flow-delete"
                    role="button"
                    aria-label="Delete workflow"
                    onClick={(e) => { e.stopPropagation(); deleteFlow(flow); }}
                    sx={{
                      display: "flex", flexShrink: 0, cursor: "pointer", p: 0.5, borderRadius: "6px",
                      color: "#94A3B8", opacity: { xs: 1, md: 0 }, transition: "opacity 120ms",
                      "&:hover": { color: "#DC2626", bgcolor: "#FEE2E2" },
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: "100%", display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px minmax(0,1fr)" }, minHeight: 0 }}>
      {/* Sidebar: saved flows + upload (inline on desktop; drawer on mobile) */}
      <Box sx={{ borderRight: `1px solid ${line}`, display: { xs: "none", md: "block" }, minHeight: 0 }}>
        {sidebar()}
      </Box>
      <Drawer
        anchor="left"
        open={navOpen}
        onClose={() => setNavOpen(false)}
        sx={{ display: { xs: "block", md: "none" } }}
        slotProps={{ root: { keepMounted: true }, paper: { sx: { width: "84vw", maxWidth: 320 } } }}
      >
        {sidebar(() => setNavOpen(false))}
      </Drawer>

      {/* Main area */}
      <Box sx={{ overflowY: "auto", p: { xs: 1.5, sm: 3 }, minHeight: 0, bgcolor: wash }}>
        {/* Mobile: open the flows drawer */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<MenuIcon sx={{ fontSize: 18 }} />}
          onClick={() => setNavOpen(true)}
          sx={{ display: { xs: "inline-flex", md: "none" }, mb: 2 }}
        >
          Workflows
        </Button>

        {error ? (
          <Box sx={{ mb: 2, p: 1.5, border: `2px solid #DC2626`, borderRadius: "10px", bgcolor: "#FEE2E2", color: "#991B1B" }}>{error}</Box>
        ) : null}

        {preview ? (
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
              <Typography variant="h1">Parsed workflow preview</Typography>
              <Chip size="small" label={`${preview.length} workflow${preview.length === 1 ? "" : "s"}`} variant="outlined" sx={{ height: 22 }} />
            </Stack>
            <Stack spacing={2}>
              {preview.map((flow, i) => (
                <Box key={i} sx={{ border: `1px solid ${line}`, borderRadius: "16px", bgcolor: "#fff", p: 2.5, boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 6px 20px rgba(15,23,42,0.07)" }}>
                  <FlowDefinitionView flow={flow} />
                  <Button variant="contained" startIcon={<SaveIcon sx={{ fontSize: 18 }} />} onClick={() => savePreview(flow, i)} disabled={busy} sx={{ mt: 2 }}>
                    Save workflow
                  </Button>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : selected ? (
          <FlowDetail key={selected.id} flow={selected} />
        ) : (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column", gap: 1.5, alignItems: "center", justifyContent: "center", color: "#94A3B8" }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "16px", border: `1.5px dashed #E2E8F0`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AccountTreeOutlinedIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography sx={{ fontWeight: 600 }}>Upload an OpenAPI Workflow, or pick a saved one to run.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
