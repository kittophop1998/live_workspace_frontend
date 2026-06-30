"use client";

import { useState } from "react";
import { Box, Button, Chip, IconButton, InputBase, Stack, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar, MonoTag, relativeTime, useNow } from "@/components/common";
import { line } from "@/components/theme";

export function CommentThread() {
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const resource = useWorkspaceStore((s) => s.resources.find((r) => r.id === s.selectedId));
  const comments = useWorkspaceStore((s) => s.comments);
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  const activeFieldId = useWorkspaceStore((s) => s.activeFieldId);
  const focusComment = useWorkspaceStore((s) => s.focusComment);
  const addComment = useWorkspaceStore((s) => s.addComment);
  const me = useWorkspaceStore((s) => s.me);
  const [draft, setDraft] = useState("");
  useNow();

  const colorFor = (name: string) => collaborators.find((c) => c.name === name)?.color ?? "#71717A";
  const activeField = resource?.fields.find((f) => f.id === activeFieldId);

  const thread = comments
    .filter((c) => c.resourceId === selectedId && (!activeFieldId || c.fieldId === activeFieldId))
    .sort((a, b) => +new Date(a.at) - +new Date(b.at));

  const submit = () => {
    const body = draft.trim();
    if (!body || !resource) return;
    addComment(resource.id, activeFieldId ?? undefined, body);
    setDraft("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Scope indicator */}
      <Box sx={{ px: 1.5, py: 1, borderBottom: `1.5px solid #E4E4E7`, display: "flex", alignItems: "center", gap: 1 }}>
        {activeField ? (
          <>
            <Typography sx={{ fontSize: 12, color: "#71717A" }}>Field:</Typography>
            <MonoTag>{activeField.key}</MonoTag>
            <IconButton size="small" onClick={() => focusComment(null)} sx={{ ml: "auto" }}>
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </>
        ) : (
          <Typography sx={{ fontSize: 12, color: "#71717A" }}>
            All comments on <b style={{ color: line }}>{resource?.name}</b>
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
        {thread.length === 0 ? (
          <Stack spacing={1} sx={{ alignItems: "center", mt: 5, color: "#A1A1AA" }}>
            <ForumOutlinedIcon sx={{ fontSize: 32 }} />
            <Typography sx={{ fontSize: 13, textAlign: "center" }}>
              {activeField ? "No comments on this field yet." : "No comments yet. Start the discussion."}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {thread.map((c) => {
              const field = resource?.fields.find((f) => f.id === c.fieldId);
              return (
                <Box key={c.id} sx={{ border: `2px solid ${line}`, borderRadius: "10px", p: 1.25, boxShadow: "2px 2px 0 #0A0A0A" }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: "center" }}>
                    <Avatar name={c.author} color={colorFor(c.author)} size={24} />
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{c.author}</Typography>
                    <Chip
                      size="small"
                      label={c.role}
                      sx={{ height: 18, fontSize: 9.5, textTransform: "uppercase", bgcolor: c.role === "backend" ? "#DBEAFE" : "#FCE7F3" }}
                    />
                    <Typography sx={{ fontSize: 10.5, color: "#A1A1AA", ml: "auto" }}>{relativeTime(c.at)}</Typography>
                  </Stack>
                  {!activeFieldId && field ? (
                    <Box sx={{ mb: 0.5 }}>
                      <MonoTag sx={{ fontSize: 10 }}>{field.key}</MonoTag>
                    </Box>
                  ) : null}
                  <Typography sx={{ fontSize: 13, lineHeight: 1.5 }}>{c.body}</Typography>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Composer */}
      <Box sx={{ p: 1.5, borderTop: `2px solid ${line}`, bgcolor: "#FAFAFA" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <Box sx={{ flex: 1, border: `2px solid ${line}`, borderRadius: "8px", bgcolor: "#fff", px: 1, py: 0.5 }}>
            <InputBase
              multiline
              maxRows={4}
              fullWidth
              placeholder={activeField ? `Comment on ${activeField.key}…` : "Write a comment…"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              sx={{ fontSize: 13 }}
            />
          </Box>
          <Button variant="contained" onClick={submit} disabled={!draft.trim()} sx={{ minWidth: 0, px: 1.25, height: 40 }}>
            <SendIcon sx={{ fontSize: 17 }} />
          </Button>
        </Box>
        <Typography sx={{ fontSize: 10, color: "#A1A1AA", mt: 0.5 }}>
          Posting as <b>{me?.name ?? "…"}</b> · ⌘/Ctrl+Enter to send
        </Typography>
      </Box>
    </Box>
  );
}
