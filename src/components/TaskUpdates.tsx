"use client";

import { useMemo, useState } from "react";
import { Box, Button, Chip, InputBase, MenuItem, Select, Stack, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ThumbUpAltRoundedIcon from "@mui/icons-material/ThumbUpAltRounded";
import ThumbUpOffAltRoundedIcon from "@mui/icons-material/ThumbUpOffAltRounded";
import { useWorkspaceStore } from "@/lib/store";
import { Avatar, EmptyState, relativeTime, useNow } from "@/components/common";
import { blue, blueSoft, ink, line, pastel, pastelInk, secondaryText } from "@/components/theme";
import type { TaskLogKind } from "@/lib/types";

// Backend work-update log — a live feed where backend devs post what they
// shipped ("added / changed / fixed X") so the frontend team can follow along.
// Distinct from the auto-generated Activity feed and from Team chat: these are
// deliberate, categorized update notes, optionally linked to a resource.
// Live over the WebSocket (`task_log.created`).

const KINDS: TaskLogKind[] = ["added", "changed", "fixed", "removed", "note"];

// Reuse the notebook pastels so the log sits in the same visual language as the
// rest of the right panel.
const kindStyle: Record<TaskLogKind, { bg: string; fg: string; label: string }> = {
  added: { bg: pastel.mint, fg: pastelInk.mint, label: "Added" },
  changed: { bg: pastel.yellow, fg: pastelInk.yellow, label: "Changed" },
  fixed: { bg: pastel.blue, fg: pastelInk.blue, label: "Fixed" },
  removed: { bg: pastel.pink, fg: pastelInk.pink, label: "Removed" },
  note: { bg: pastel.cream, fg: pastelInk.cream, label: "Note" },
};

export function TaskUpdates() {
  const taskLogs = useWorkspaceStore((s) => s.taskLogs);
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  const resources = useWorkspaceStore((s) => s.resources);
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const me = useWorkspaceStore((s) => s.me);
  const addTaskLog = useWorkspaceStore((s) => s.addTaskLog);
  const toggleTaskLogLike = useWorkspaceStore((s) => s.toggleTaskLogLike);

  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<TaskLogKind>("added");
  // Link target: `null` = follow whatever is open in the explorer; a string (incl.
  // "" for an explicit "none") = the user's manual override.
  const [resourceOverride, setResourceOverride] = useState<string | null>(null);
  useNow();

  const resourceId = resourceOverride ?? selectedId ?? "";

  const colorFor = (name: string) => collaborators.find((c) => c.name === name)?.color ?? "#94A3B8";
  const resourceName = useMemo(() => {
    const map = new Map(resources.map((r) => [r.id, r.name] as const));
    return (id?: string) => (id ? map.get(id) : undefined);
  }, [resources]);

  // Newest first — `at` is the entry's create timestamp.
  const sortedLogs = useMemo(() => [...taskLogs].sort((a, b) => b.at.localeCompare(a.at)), [taskLogs]);

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    addTaskLog({ kind, body, resourceId: resourceId || undefined });
    setDraft("");
    setResourceOverride(null); // fall back to following the explorer selection
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ px: 1.75, py: 1.25, borderBottom: `1px solid ${line}` }}>
        <Typography sx={{ fontSize: 12, color: secondaryText }}>
          Backend updates — what shipped, for the frontend team
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.75 }}>
        {taskLogs.length === 0 ? (
          <EmptyState
            chibi="ghost"
            chibiSize={90}
            color="mint"
            title="No updates yet 🛠️"
            subtitle="Post what you added, changed, or fixed — the whole team sees it live."
            sx={{ mt: 3 }}
          />
        ) : (
          <Stack spacing={1.25}>
            {sortedLogs.map((t) => {
              const ks = kindStyle[t.kind] ?? kindStyle.note;
              const linked = resourceName(t.resourceId);
              const liked = !!me && t.likes.includes(me.id);
              return (
                <Box
                  key={t.id}
                  sx={{
                    bgcolor: "#FFFDF8",
                    border: `1.5px solid ${line}`,
                    borderLeft: `4px solid ${ks.fg}`,
                    borderRadius: "4px 12px 12px 4px",
                    boxShadow: "0 1px 2px rgba(120,88,44,0.06)",
                    p: 1.25,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: "center" }}>
                    <Chip
                      size="small"
                      label={ks.label}
                      sx={{ height: 18, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, bgcolor: ks.bg, color: ks.fg }}
                    />
                    <Avatar name={t.author} color={colorFor(t.author)} size={20} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: ink }}>{t.author}</Typography>
                    <Typography sx={{ fontSize: 10, color: "#B8C1CD", ml: "auto", pl: 1 }}>{relativeTime(t.at)}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 13, lineHeight: 1.55, color: ink, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {t.body}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, alignItems: "center" }}>
                    {t.resourceId && (
                      <Chip
                        size="small"
                        label={linked ?? "(deleted resource)"}
                        sx={{ height: 18, fontSize: 10, fontWeight: 600, bgcolor: blueSoft, color: pastelInk.purple, fontStyle: linked ? "normal" : "italic" }}
                      />
                    )}
                    <Box
                      role="button"
                      aria-pressed={liked}
                      onClick={() => toggleTaskLogLike(t.id)}
                      sx={{
                        ml: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.4,
                        cursor: "pointer",
                        px: 0.75,
                        py: 0.25,
                        borderRadius: "9px",
                        color: liked ? blue : "#B8C1CD",
                        bgcolor: liked ? blueSoft : "transparent",
                        transition: "all .12s ease",
                        "&:hover": { color: blue, bgcolor: blueSoft },
                      }}
                    >
                      {liked ? (
                        <ThumbUpAltRoundedIcon sx={{ fontSize: 14 }} />
                      ) : (
                        <ThumbUpOffAltRoundedIcon sx={{ fontSize: 14 }} />
                      )}
                      {t.likes.length > 0 && (
                        <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>{t.likes.length}</Typography>
                      )}
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Composer */}
      <Box sx={{ p: 1.75, borderTop: `2px dashed ${line}`, bgcolor: "#FFFAF0" }}>
        <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: "wrap", gap: 0.5 }}>
          {KINDS.map((k) => {
            const ks = kindStyle[k];
            const active = k === kind;
            return (
              <Box
                key={k}
                role="button"
                aria-pressed={active}
                onClick={() => setKind(k)}
                sx={{
                  cursor: "pointer",
                  px: 1,
                  py: 0.35,
                  borderRadius: "9px",
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  bgcolor: active ? ks.bg : "transparent",
                  color: active ? ks.fg : secondaryText,
                  border: `1.5px solid ${active ? `${ks.fg}55` : line}`,
                  transition: "all .12s ease",
                }}
              >
                {ks.label}
              </Box>
            );
          })}
        </Stack>

        <Select
          size="small"
          value={resources.some((r) => r.id === resourceId) ? resourceId : ""}
          displayEmpty
          onChange={(e) => setResourceOverride(e.target.value)}
          sx={{ width: "100%", mb: 1, fontSize: 12, bgcolor: "#FFFDF8", "& .MuiSelect-select": { py: 0.75 } }}
        >
          <MenuItem value="" sx={{ fontSize: 12 }}>
            <em>No linked resource (project-wide)</em>
          </MenuItem>
          {resources.map((r) => (
            <MenuItem key={r.id} value={r.id} sx={{ fontSize: 12 }}>
              {r.name}
            </MenuItem>
          ))}
        </Select>

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
              placeholder="Describe what you shipped…"
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
          Posting as <Box component="b" sx={{ color: secondaryText, fontWeight: 600 }}>{me?.name ?? "…"}</Box> · Enter to send, Shift+Enter for a new line
        </Typography>
      </Box>
    </Box>
  );
}
