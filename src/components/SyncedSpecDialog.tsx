"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { useWorkspaceStore } from "@/lib/store";
import { line, secondaryText } from "@/components/theme";

// Shows the OpenAPI spec last published by `live-workspace sync` (CLI). Reads
// straight from the store, so a sync that lands while the dialog is open
// updates the revision + content in place (api_spec.published over /stream).
export function SyncedSpecDialog() {
  const spec = useWorkspaceStore((s) => s.publishedSpec);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!spec) return null;
  const { revision, content } = spec;

  const copyContent = () => {
    void navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <Tooltip title={`Published from CLI — revision #${revision.number}`}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudDoneOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={() => setOpen(true)}
          sx={{ minWidth: { xs: 0, sm: 64 }, px: { xs: 1, sm: 1.5 }, "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 } } }}
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            Synced Spec · v{revision.number}
          </Box>
        </Button>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 600 }}>Published API Specification</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", alignItems: "center", rowGap: 1 }}>
            <Chip size="small" label={`rev #${revision.number}`} />
            <Chip size="small" label={revision.status} color={revision.status === "current" ? "success" : "default"} variant="outlined" />
            <Chip size="small" label={revision.format.toUpperCase()} variant="outlined" />
            <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 12.5, fontWeight: 600 }}>
              {revision.sourceFilename}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: secondaryText }}>
              {revision.createdAt ? new Date(revision.createdAt).toLocaleString() : ""}
            </Typography>
          </Stack>

          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              border: `1px solid ${line}`,
              borderRadius: "8px",
              bgcolor: "#FAFAF7",
              fontFamily: "var(--font-mono,monospace)",
              fontSize: 12,
              lineHeight: 1.55,
              maxHeight: "55vh",
              overflow: "auto",
              whiteSpace: "pre",
            }}
          >
            {content}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />} onClick={copyContent}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="contained" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
