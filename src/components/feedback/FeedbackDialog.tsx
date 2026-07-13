"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, IconButton, Menu, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useWorkspaceStore } from "@/lib/store";
import {
  CATEGORY_META,
  FEEDBACK_STATUSES,
  STATUS_META,
  allFeedback,
  useFeedbackStore,
  type Feedback,
  type FeedbackCategory,
  type FeedbackStatus,
} from "@/lib/feedback";
import { apiErrorMessage } from "@/lib/api";
import { mascotSay } from "@/lib/mascot";
import { Avatar, Sticker, relativeTime, useNow } from "@/components/common";
import { ChibiRobot, DoodleSparkle } from "@/components/doodles";
import { ink, line, secondaryText } from "@/components/theme";

const CATEGORIES: FeedbackCategory[] = ["complaint", "improvement", "bug", "other"];

// Clickable status pill — opens a menu with every status so anyone in the room
// can move a report through its lifecycle (open → in_progress → resolved/…).
function StatusPicker({ status, onChange }: { status: FeedbackStatus; onChange: (s: FeedbackStatus) => void }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const m = STATUS_META[status];
  return (
    <>
      <Tooltip title="Change status">
        <Box
          role="button"
          aria-label={`Status: ${m.label} — change`}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: "inline-flex", alignItems: "center", pl: 1.2, pr: 0.5, py: 0.3, borderRadius: "999px",
            bgcolor: m.bg, color: m.fg, border: `1.5px solid ${m.fg}2E`, fontSize: 11.5, fontWeight: 800,
            cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
          }}
        >
          {m.label}
          <ArrowDropDownIcon sx={{ fontSize: 16 }} />
        </Box>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {FEEDBACK_STATUSES.map((s) => (
          <MenuItem
            key={s}
            selected={s === status}
            onClick={() => { setAnchorEl(null); if (s !== status) onChange(s); }}
            sx={{ fontSize: 13, fontWeight: 700, color: STATUS_META[s].fg }}
          >
            {STATUS_META[s].label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  useNow(); // keep the relative timestamps fresh
  const me = useWorkspaceStore((s) => s.me);
  const collaborators = useWorkspaceStore((s) => s.collaborators);
  const setStatus = useFeedbackStore((s) => s.setStatus);
  const remove = useFeedbackStore((s) => s.remove);
  const author = collaborators.find((c) => c.name === feedback.author);
  const cat = CATEGORY_META[feedback.category] ?? CATEGORY_META.other;

  return (
    <Box sx={{ p: 1.5, border: `1.5px solid ${line}`, borderRadius: "14px", bgcolor: "#FFFFFF" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography component="span" sx={{ fontSize: 15, lineHeight: 1 }}>{cat.emoji}</Typography>
        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: secondaryText, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {cat.label}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <StatusPicker status={feedback.status} onChange={(s) => void setStatus(feedback.id, s)} />
        {me?.name === feedback.author ? (
          <Tooltip title="Delete report">
            <IconButton size="small" onClick={() => void remove(feedback.id)} aria-label="Delete report">
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
      <Typography sx={{ mt: 0.75, fontSize: 13, color: ink, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {feedback.body}
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ mt: 1, alignItems: "center" }}>
        <Avatar name={feedback.author} color={author?.color ?? "#8A8595"} size={20} />
        <Typography sx={{ fontSize: 11.5, color: secondaryText }}>
          {feedback.author} · {relativeTime(feedback.createdAt)}
          {feedback.updatedBy !== feedback.author ? ` · updated by ${feedback.updatedBy}` : ""}
        </Typography>
      </Stack>
    </Box>
  );
}

// "Report an issue" sheet — pick a category, describe the problem or the
// improvement you want, submit; below it, every report with a changeable status.
export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useWorkspaceStore((s) => s.me);
  const byId = useFeedbackStore((s) => s.byId);
  const hydrate = useFeedbackStore((s) => s.hydrate);
  const create = useFeedbackStore((s) => s.create);
  const [category, setCategory] = useState<FeedbackCategory>("complaint");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-hydrate on every open so we see teammates' latest reports.
  useEffect(() => {
    if (open) void hydrate();
  }, [open, hydrate]);

  const reports = allFeedback(byId);
  const canSubmit = !busy && !!me && body.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await create({ category, body: body.trim() });
      mascotSay("celebrate", "Thanks! Your report is in — we're on it. 📬");
      setBody("");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: "22px", border: `1.5px solid ${line}`, width: 560, maxWidth: "94vw", bgcolor: "#FFFDF8" } } }}
    >
      <Box sx={{ p: 3, position: "relative", display: "flex", flexDirection: "column", maxHeight: "82vh" }}>
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 12, right: 12 }} aria-label="Close">
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 0.5 }}>
          <Box className="animate-float" sx={{ position: "relative" }}>
            <ChibiRobot size={44} />
            <DoodleSparkle size={14} style={{ position: "absolute", top: -4, right: -6 }} className="animate-twinkle" />
          </Box>
          <Box>
            <Typography variant="h2" className="font-hand" sx={{ fontSize: 20 }}>Feedback & Issues</Typography>
            <Typography sx={{ fontSize: 12.5, color: secondaryText }}>
              Something broken or annoying? Want an improvement? Tell us here.
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Box>
            <Sticker color="pink" sx={{ mb: 0.75 }}>🏷 Category</Sticker>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <Box
                    key={c}
                    role="button"
                    aria-pressed={active}
                    onClick={() => setCategory(c)}
                    sx={{
                      px: 1.25, py: 0.5, borderRadius: "999px", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                      border: `1.5px solid ${active ? ink : line}`,
                      bgcolor: active ? ink : "#FFFFFF",
                      color: active ? "#FFFFFF" : secondaryText,
                      transition: "all .15s ease", userSelect: "none", whiteSpace: "nowrap",
                    }}
                  >
                    {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                  </Box>
                );
              })}
            </Stack>
          </Box>
          <Box>
            <Sticker color="blue" sx={{ mb: 0.75 }}>💬 What happened?</Sticker>
            <TextField
              fullWidth
              multiline
              minRows={3}
              size="small"
              placeholder="Describe the problem, or what you'd like improved…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              sx={{ "& textarea": { fontSize: 13 } }}
            />
          </Box>

          {error ? (
            <Alert severity="error" sx={{ border: `1.5px solid ${line}`, borderRadius: "12px", py: 0 }}>
              {error}
            </Alert>
          ) : null}

          <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
            <Button variant="contained" onClick={() => void submit()} disabled={!canSubmit}>
              {busy ? "Sending…" : "Send Report"}
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px dashed ${line}`, minHeight: 0, overflowY: "auto" }}>
          <Sticker color="mint" sx={{ mb: 1 }}>📋 Reports ({reports.length})</Sticker>
          {reports.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: secondaryText, py: 1.5, textAlign: "center" }}>
              No reports yet — be the first to speak up!
            </Typography>
          ) : (
            <Stack spacing={1}>
              {reports.map((f) => (
                <FeedbackCard key={f.id} feedback={f} />
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
