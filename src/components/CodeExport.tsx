"use client";

import { useMemo, useState } from "react";
import { Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useWorkspaceStore } from "@/lib/store";
import { toJsonMock, toTypeScript } from "@/lib/codegen";
import { pushToWebhook } from "@/lib/api";
import { line } from "@/components/theme";
import type { ExportFormat } from "@/lib/types";

export function CodeExport() {
  const resource = useWorkspaceStore((s) => s.resources.find((r) => r.id === s.selectedId));
  const format = useWorkspaceStore((s) => s.exportFormat);
  const setFormat = useWorkspaceStore((s) => s.setExportFormat);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const code = useMemo(() => {
    if (!resource) return "";
    return format === "typescript" ? toTypeScript(resource) : toJsonMock(resource);
  }, [resource, format]);

  if (!resource) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const send = async () => {
    setSending(true);
    setSendMsg(null);
    const res = await pushToWebhook({ resource: resource.name, format, code });
    setSending(false);
    setSendMsg(res.message);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ p: 1.5, borderBottom: `1.5px solid #E4E4E7` }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={format}
          onChange={(_, v: ExportFormat | null) => v && setFormat(v)}
          fullWidth
          sx={{
            "& .MuiToggleButton-root": { border: `2px solid ${line}`, fontWeight: 700, py: 0.4 },
            "& .Mui-selected": { bgcolor: `${line} !important`, color: "#fff !important" },
          }}
        >
          <ToggleButton value="typescript">TypeScript</ToggleButton>
          <ToggleButton value="json">JSON Mock</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", p: 1.5 }}>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1.5,
            border: `2px solid ${line}`,
            borderRadius: "10px",
            bgcolor: "#0A0A0A",
            color: "#E4E4E7",
            fontFamily: "var(--font-mono,monospace)",
            fontSize: 12,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            boxShadow: "3px 3px 0 #71717A",
          }}
        >
          {code}
        </Box>
      </Box>

      <Box sx={{ p: 1.5, borderTop: `2px solid ${line}`, bgcolor: "#FAFAFA" }}>
        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="outlined" startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />} onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button fullWidth variant="contained" startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />} onClick={send} disabled={sending}>
            {sending ? "Sending…" : "Webhook"}
          </Button>
        </Stack>
        {sendMsg ? (
          <Typography sx={{ fontSize: 10.5, color: "#52525B", mt: 0.75 }}>{sendMsg}</Typography>
        ) : null}
      </Box>
    </Box>
  );
}
