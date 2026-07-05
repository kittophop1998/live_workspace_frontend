"use client";

import { useState } from "react";
import { Box, Button, Chip, IconButton, InputBase, Stack, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar, MonoTag, relativeTime, useNow } from "@/components/common";
import { blue, blueSoft, ink, line, secondaryText } from "@/components/theme";

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

  const colorFor = (name: string) => collaborators.find((c) => c.name === name)?.color ?? "#94A3B8";
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
      <Box sx={{ px: 1.75, py: 1.25, borderBottom: `1px solid ${line}`, display: "flex", alignItems: "center", gap: 1 }}>
        {activeField ? (
          <>
            <Typography sx={{ fontSize: 12, color: secondaryText }}>Field:</Typography>
            <MonoTag>{activeField.key}</MonoTag>
            <IconButton size="small" onClick={() => focusComment(null)} sx={{ ml: "auto" }}>
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </>
        ) : (
          <Typography sx={{ fontSize: 12, color: secondaryText }}>
            All comments on <Box component="b" sx={{ color: ink, fontWeight: 600 }}>{resource?.name}</Box>
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.75 }}>
        {thread.length === 0 ? (
          <Stack spacing={1.25} sx={{ alignItems: "center", mt: 6, color: "#B8C1CD", px: 3, textAlign: "center" }}>
            <ForumOutlinedIcon sx={{ fontSize: 30 }} />
            <Typography sx={{ fontSize: 13, color: secondaryText }}>
              {activeField ? "No comments on this field yet." : "No comments yet — start the discussion."}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            {thread.map((c) => {
              const field = resource?.fields.find((f) => f.id === c.fieldId);
              return (
                <Box key={c.id} sx={{ bgcolor: "#F8FAFC", border: `1px solid ${line}`, borderRadius: "12px", p: 1.5 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 0.75, alignItems: "center" }}>
                    <Avatar name={c.author} color={colorFor(c.author)} size={24} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: ink }}>{c.author}</Typography>
                    <Chip
                      size="small"
                      label={c.role}
                      sx={{ height: 18, fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", bgcolor: c.role === "backend" ? "#DBEAFE" : "#FCE7F3", color: c.role === "backend" ? "#1D4ED8" : "#BE185D" }}
                    />
                    <Typography sx={{ fontSize: 10.5, color: "#B8C1CD", ml: "auto" }}>{relativeTime(c.at)}</Typography>
                  </Stack>
                  {!activeFieldId && field ? (
                    <Box sx={{ mb: 0.75 }}>
                      <MonoTag sx={{ fontSize: 10 }}>{field.key}</MonoTag>
                    </Box>
                  ) : null}
                  <Typography sx={{ fontSize: 13, lineHeight: 1.55, color: ink }}>{c.body}</Typography>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Composer */}
      <Box sx={{ p: 1.75, borderTop: `1px solid ${line}`, bgcolor: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <Box
            sx={{
              flex: 1,
              border: `1px solid ${line}`,
              borderRadius: "10px",
              bgcolor: "#F8FAFC",
              px: 1.25,
              py: 0.75,
              transition: "border-color .15s ease, background-color .15s ease, box-shadow .15s ease",
              "&:focus-within": { bgcolor: "#fff", borderColor: blue, boxShadow: `0 0 0 3px ${blueSoft}` },
            }}
          >
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
          <Button variant="contained" onClick={submit} disabled={!draft.trim()} sx={{ minWidth: 0, px: 1.5, height: 42 }}>
            <SendIcon sx={{ fontSize: 17 }} />
          </Button>
        </Box>
        <Typography sx={{ fontSize: 10.5, color: "#B8C1CD", mt: 0.75 }}>
          Posting as <Box component="b" sx={{ color: secondaryText, fontWeight: 600 }}>{me?.name ?? "…"}</Box> · ⌘/Ctrl+Enter to send
        </Typography>
      </Box>
    </Box>
  );
}
