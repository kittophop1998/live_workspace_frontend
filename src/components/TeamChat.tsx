"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Chip, InputBase, Stack, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar, EmptyState, relativeTime, useNow } from "@/components/common";
import { blue, blueSoft, ink, line, secondaryText } from "@/components/theme";

// Project-wide team chat — one shared room per project, live over the
// WebSocket (`chat.created`). Unlike CommentThread this is not scoped to the
// selected resource.
export function TeamChat() {
  const chat = useWorkspaceStore((s) => s.chat);
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  const me = useWorkspaceStore((s) => s.me);
  const sendChatMessage = useWorkspaceStore((s) => s.sendChatMessage);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useNow();

  const colorFor = (name: string) => collaborators.find((c) => c.name === name)?.color ?? "#94A3B8";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [chat.length]);

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    sendChatMessage(body);
    setDraft("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ px: 1.75, py: 1.25, borderBottom: `1px solid ${line}` }}>
        <Typography sx={{ fontSize: 12, color: secondaryText }}>
          Team chat — everyone in this project
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.75 }}>
        {chat.length === 0 ? (
          <EmptyState
            chibi="ghost"
            chibiSize={90}
            color="blue"
            title="It's quiet in here… 📢"
            subtitle="Say hi! Messages reach the whole project team instantly."
            sx={{ mt: 3 }}
          />
        ) : (
          <Stack spacing={1.25}>
            {chat.map((m) => {
              const mine = m.authorId === me?.id;
              return (
                <Box
                  key={m.id}
                  sx={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    bgcolor: mine ? blueSoft : "#FFFDF8",
                    border: `1.5px solid ${mine ? `${blue}55` : line}`,
                    borderRadius: mine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    boxShadow: "0 1px 2px rgba(120,88,44,0.06)",
                    p: 1.25,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: "center" }}>
                    {!mine && <Avatar name={m.author} color={colorFor(m.author)} size={22} />}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: ink }}>
                      {mine ? "You" : m.author}
                    </Typography>
                    <Chip
                      size="small"
                      label={m.role}
                      sx={{ height: 16, fontSize: 9, fontWeight: 600, textTransform: "uppercase", bgcolor: m.role === "backend" ? "#DBEAFE" : "#FCE7F3", color: m.role === "backend" ? "#1D4ED8" : "#BE185D" }}
                    />
                    <Typography sx={{ fontSize: 10, color: "#B8C1CD", ml: "auto", pl: 1 }}>{relativeTime(m.at)}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 13, lineHeight: 1.55, color: ink, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {m.body}
                  </Typography>
                </Box>
              );
            })}
            <div ref={bottomRef} />
          </Stack>
        )}
      </Box>

      {/* Composer */}
      <Box sx={{ p: 1.75, borderTop: `2px dashed ${line}`, bgcolor: "#FFFAF0" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <Box
            sx={{
              flex: 1,
              border: `1.5px solid ${line}`,
              borderRadius: "14px",
              bgcolor: "#FFFDF8",
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
              placeholder="Message the team…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              sx={{ fontSize: 13 }}
            />
          </Box>
          <Button variant="contained" onClick={submit} disabled={!draft.trim()} sx={{ minWidth: 0, px: 1.5, height: 42 }}>
            <SendIcon sx={{ fontSize: 17 }} />
          </Button>
        </Box>
        <Typography sx={{ fontSize: 10.5, color: "#B8C1CD", mt: 0.75 }}>
          Chatting as <Box component="b" sx={{ color: secondaryText, fontWeight: 600 }}>{me?.name ?? "…"}</Box> · Enter to send, Shift+Enter for a new line
        </Typography>
      </Box>
    </Box>
  );
}
