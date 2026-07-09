"use client";

import { Box, Button, Tooltip } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { downloadMarkdownSpec } from "@/lib/specExport";

// Downloads the workspace's API spec as a Markdown file (client-generated,
// like codegen — no endpoint needed). Sits next to Import API in the top bar.
export function ExportSpecButton() {
  const resources = useWorkspaceStore((s) => s.resources);
  const rev = useWorkspaceStore((s) => s.rev);
  const roomCode = useWorkspaceStore((s) => s.roomCode);
  const empty = resources.length === 0;

  return (
    <Tooltip title={empty ? "Nothing to export yet" : "Download the API spec as Markdown"}>
      <span>
        <Button
          variant="outlined"
          size="small"
          disabled={empty}
          startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={() => downloadMarkdownSpec(resources, { roomCode, rev })}
          sx={{ minWidth: { xs: 0, sm: 64 }, px: { xs: 1, sm: 1.5 }, "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 } } }}
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Export Spec</Box>
        </Button>
      </span>
    </Tooltip>
  );
}
