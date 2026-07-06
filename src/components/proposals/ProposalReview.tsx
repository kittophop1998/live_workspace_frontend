"use client";

import { useEffect, useState } from "react";
import { Box, Button, IconButton, InputBase, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNew";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { STATUS_META, useProposalStore, type ProposalStatus } from "@/lib/proposals";
import { diffProposal, summarizeDiff } from "@/lib/proposalDiff";
import { mascotSay } from "@/lib/mascot";
import { useMergeCelebration } from "@/components/proposals/MergeCelebration";
import { ProposalDiff } from "@/components/proposals/ProposalDiff";
import { Avatar, MonoTag, PaperCard, Sticker, SpeechBubble, relativeTime, useNow } from "@/components/common";
import { ink, line, pastel, pastelInk, secondaryText, blue, blueSoft } from "@/components/theme";
import type { DataType, SchemaField } from "@/lib/types";

const TYPES: DataType[] = ["string", "number", "boolean", "uuid", "timestamp", "json", "string[]", "number[]", "enum"];

function StatusPill({ status }: { status: ProposalStatus }) {
  const m = STATUS_META[status];
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", px: 1.2, py: 0.4, borderRadius: "999px", bgcolor: m.bg, color: m.fg, border: `1.5px solid ${m.fg}2E`, fontSize: 11.5, fontWeight: 800 }}>
      {m.label}
    </Box>
  );
}

function TypePicker({ value, onChange }: { value: DataType; onChange: (t: DataType) => void }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  return (
    <>
      <Box
        role="button"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
      >
        <MonoTag sx={{ display: "inline-flex", alignItems: "center", gap: 0.1 }}>
          {value}
          <ArrowDropDownIcon sx={{ fontSize: 16, ml: -0.25 }} />
        </MonoTag>
      </Box>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {TYPES.map((t) => (
          <MenuItem
            key={t}
            selected={t === value}
            onClick={() => { onChange(t); setAnchorEl(null); }}
            sx={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 700, fontSize: 13 }}
          >
            {t}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// Editable draft field row — key / type / required / delete.
function DraftFieldRow({
  field,
  editable,
  onPatch,
  onRemove,
}: {
  field: SchemaField;
  editable: boolean;
  onPatch: (patch: Partial<SchemaField>) => void;
  onRemove: () => void;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", py: 0.75, borderBottom: `1px dashed ${line}` }}>
      {/* Uncontrolled + remounts on external key change (React key) — commit on blur. */}
      <InputBase
        key={field.key}
        defaultValue={field.key}
        disabled={!editable}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== field.key) onPatch({ key: v });
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        sx={{ flex: 1, minWidth: 0, fontFamily: "var(--font-mono,monospace)", fontSize: 13, fontWeight: 600, color: ink, px: 0.5, borderRadius: "8px", "&.Mui-focused": { bgcolor: blueSoft } }}
      />
      {editable ? <TypePicker value={field.type} onChange={(type) => onPatch({ type })} /> : <MonoTag>{field.type}</MonoTag>}
      <Tooltip title={field.required ? "Required" : "Optional"}>
        <Box
          role="button"
          aria-pressed={field.required}
          onClick={() => editable && onPatch({ required: !field.required })}
          sx={{
            px: 0.9, py: 0.3, borderRadius: "999px", fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap",
            cursor: editable ? "pointer" : "default",
            bgcolor: field.required ? "#FFDDDD" : "#F4F4F5",
            color: field.required ? "#C0453F" : "#8A8A8A",
            border: `1.5px solid ${field.required ? "#C0453F33" : line}`,
          }}
        >
          {field.required ? "required" : "optional"}
        </Box>
      </Tooltip>
      {editable ? (
        <IconButton size="small" onClick={onRemove} aria-label={`Remove ${field.key}`} sx={{ "&:hover": { color: "#E86A6A" } }}>
          <DeleteOutlineIcon sx={{ fontSize: 17 }} />
        </IconButton>
      ) : null}
    </Stack>
  );
}

function TimelineList({ timeline }: { timeline: { id: string; kind: string; actor: string; detail: string; at: string }[] }) {
  useNow();
  return (
    <Stack sx={{ position: "relative", pl: 1 }}>
      {timeline.map((t, i) => (
        <Stack key={t.id} direction="row" spacing={1.25} sx={{ position: "relative", pb: i === timeline.length - 1 ? 0 : 1.5 }}>
          {/* connector */}
          {i < timeline.length - 1 ? (
            <Box sx={{ position: "absolute", left: 7, top: 16, bottom: -6, width: 2, bgcolor: line }} />
          ) : null}
          <Box sx={{ flexShrink: 0, width: 16, height: 16, mt: 0.3, borderRadius: "50%", bgcolor: pastel.purple, border: `2px solid ${pastelInk.purple}55`, zIndex: 1 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, color: ink, lineHeight: 1.4 }}>
              <b>{t.actor}</b> {t.detail}
            </Typography>
            <Typography sx={{ fontSize: 11, color: secondaryText }}>{relativeTime(t.at)}</Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

export function ProposalReview({ proposalId, onBack }: { proposalId: string; onBack: () => void }) {
  const proposal = useProposalStore((s) => s.byId[proposalId]);
  const proposalActions = useProposalStore();
  const resource = useWorkspaceStore((s) => s.resources.find((r) => r.id === proposal?.resourceId));
  const me = useWorkspaceStore((s) => s.me);
  const mergeProposalChanges = useWorkspaceStore((s) => s.mergeProposalChanges);
  const fireCelebration = useMergeCelebration((s) => s.fire);

  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [merging, setMerging] = useState(false);
  useNow();

  // Proposal deleted out from under us → bounce back to the list.
  useEffect(() => {
    if (!proposal) onBack();
  }, [proposal, onBack]);
  if (!proposal) return null;

  const actor = me?.name ?? "Someone";
  const editable = proposal.status !== "merged" && proposal.status !== "rejected";
  const diffs = diffProposal(proposal, resource);

  const commentCounts = proposal.comments.reduce((acc, c) => {
    if (c.fieldKey) acc[c.fieldKey] = (acc[c.fieldKey] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const freshKey = () => {
    const keys = new Set(proposal.fields.map((f) => f.key));
    if (!keys.has("newField")) return "newField";
    let n = 2;
    while (keys.has(`newField${n}`)) n += 1;
    return `newField${n}`;
  };

  const changeStatus = (status: ProposalStatus) => {
    proposalActions.setStatus(proposalId, status, actor);
    if (status === "reviewing") mascotSay("writing", "Sent for review — fingers crossed! ✍️");
    if (status === "approved") mascotSay("confetti", "Looks good! Time to merge. 🎊");
    if (status === "rejected") mascotSay("surprised", "This proposal needs a few more changes.");
  };

  const doMerge = async () => {
    if (!resource || merging) return;
    setMerging(true);
    const ok = await mergeProposalChanges(resource.id, diffs);
    setMerging(false);
    if (!ok) {
      mascotSay("panic", "Merge hit a snag — check the endpoint.");
      return;
    }
    proposalActions.setStatus(proposalId, "merged", actor);
    fireCelebration(proposal.title);
    mascotSay("jump", "Everyone can use the new API now! 🚀", 5000);
  };

  const submitComment = () => {
    if (!draft.trim() || !me) return;
    proposalActions.addComment(proposalId, activeFieldKey ?? undefined, draft, me);
    setDraft("");
  };

  const colorFor = (role: string) => (role === "backend" ? "#4C86C6" : "#F5799F");

  return (
    <Box sx={{ animation: "fade-in .2s ease" }}>
      {/* Header */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
        <Button variant="text" onClick={onBack} startIcon={<ArrowBackIcon sx={{ fontSize: 13 }} />} sx={{ px: 1 }}>
          Proposals
        </Button>
        <Box sx={{ flex: 1 }} />
        <StatusPill status={proposal.status} />
      </Stack>

      <PaperCard tilt={-0.3} sx={{ mb: 2 }}>
        <Typography variant="h1" className="font-hand" sx={{ fontSize: 24 }}>{proposal.title}</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.75, flexWrap: "wrap" }}>
          <Avatar name={proposal.author} color={colorFor(proposal.authorRole)} size={22} />
          <Typography sx={{ fontSize: 12.5, color: secondaryText }}>
            <b style={{ color: ink }}>{proposal.author}</b> · {proposal.authorRole} · opened {relativeTime(proposal.createdAt)}
          </Typography>
        </Stack>
        {proposal.description ? (
          <Typography sx={{ fontSize: 13.5, color: ink, mt: 1.5, lineHeight: 1.6 }}>{proposal.description}</Typography>
        ) : null}
        <Box sx={{ mt: 1.5 }}>
          <Sticker color={diffs.length ? "yellow" : "mint"}>{summarizeDiff(diffs)}</Sticker>
        </Box>

        {/* Action bar */}
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", alignItems: "center" }}>
          {proposal.status === "draft" ? (
            <Button variant="contained" onClick={() => changeStatus("reviewing")}>Request review</Button>
          ) : null}
          {proposal.status === "reviewing" ? (
            <>
              <Button variant="contained" color="success" onClick={() => changeStatus("approved")} sx={{ color: "#fff" }}>Approve</Button>
              <Button variant="outlined" onClick={() => changeStatus("rejected")}>Reject</Button>
            </>
          ) : null}
          {proposal.status === "approved" ? (
            <>
              <Button variant="contained" onClick={doMerge} disabled={merging || diffs.length === 0}>
                {merging ? "Merging…" : "Merge proposal"}
              </Button>
              <Button variant="outlined" onClick={() => changeStatus("rejected")}>Reject</Button>
            </>
          ) : null}
          {proposal.status === "rejected" ? (
            <Button variant="outlined" onClick={() => changeStatus("reviewing")}>Reopen</Button>
          ) : null}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Delete proposal">
            <IconButton
              onClick={() => { if (window.confirm("Delete this proposal? This cannot be undone.")) proposalActions.remove(proposalId); }}
              aria-label="Delete proposal"
              sx={{ "&:hover": { color: "#E86A6A" } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </PaperCard>

      {/* Changes / diff */}
      <PaperCard tilt={0.3} sx={{ mb: 2 }}>
        <Typography variant="h2" className="font-hand" sx={{ fontSize: 19, mb: 1.5 }}>What changes 🔍</Typography>
        <ProposalDiff diffs={diffs} commentCounts={commentCounts} activeFieldKey={activeFieldKey} onComment={setActiveFieldKey} />
      </PaperCard>

      {/* Draft field editor */}
      <PaperCard sx={{ mb: 2 }}>
        <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>
          <Typography variant="h2" className="font-hand" sx={{ fontSize: 19, flex: 1 }}>Draft fields ✏️</Typography>
          {editable ? (
            <Button size="small" variant="outlined" startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => proposalActions.addField(proposalId, { key: freshKey(), type: "string", required: false }, actor)}>
              Add field
            </Button>
          ) : null}
        </Stack>
        {proposal.fields.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: secondaryText, py: 1 }}>No fields yet — add the first one above.</Typography>
        ) : (
          proposal.fields.map((f) => (
            <DraftFieldRow
              key={f.id}
              field={f}
              editable={editable}
              onPatch={(patch) => proposalActions.updateField(proposalId, f.id, patch, actor)}
              onRemove={() => proposalActions.removeField(proposalId, f.id, actor)}
            />
          ))
        )}
      </PaperCard>

      {/* Discussion */}
      <PaperCard tilt={-0.2} sx={{ mb: 2 }}>
        <Typography variant="h2" className="font-hand" sx={{ fontSize: 19, mb: 1.5 }}>Discussion 💬</Typography>
        {proposal.comments.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: secondaryText, mb: 1 }}>No notes yet — start the conversation below.</Typography>
        ) : (
          <Stack spacing={1.25} sx={{ mb: 1.5 }}>
            {proposal.comments.map((c) => (
              <Box key={c.id} sx={{ bgcolor: "#FFFDF8", border: `1.5px solid ${line}`, borderRadius: "4px 16px 16px 16px", p: 1.5, opacity: c.resolved ? 0.6 : 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                  <Avatar name={c.author} color={colorFor(c.role)} size={22} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: ink }}>{c.author}</Typography>
                  <Box component="span" sx={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", px: 0.7, py: 0.15, borderRadius: "6px", bgcolor: c.role === "backend" ? "#DBEAFE" : "#FCE7F3", color: c.role === "backend" ? "#1D4ED8" : "#BE185D" }}>{c.role}</Box>
                  {c.fieldKey ? <MonoTag sx={{ fontSize: 10 }}>{c.fieldKey}</MonoTag> : null}
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={c.resolved ? "Reopen" : "Resolve"}>
                    <IconButton size="small" onClick={() => proposalActions.resolveComment(proposalId, c.id)} aria-label="Toggle resolved" sx={{ color: c.resolved ? "#2E8B62" : secondaryText }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Typography sx={{ fontSize: 13, color: ink, lineHeight: 1.5, textDecoration: c.resolved ? "line-through" : "none" }}>{c.body}</Typography>
                {c.resolved ? <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: "#2E8B62", mt: 0.25 }}>Resolved ✓</Typography> : null}
              </Box>
            ))}
          </Stack>
        )}

        {/* Composer */}
        {activeFieldKey ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.75 }}>
            <Typography sx={{ fontSize: 12, color: secondaryText }}>Commenting on</Typography>
            <MonoTag>{activeFieldKey}</MonoTag>
            <IconButton size="small" onClick={() => setActiveFieldKey(null)} aria-label="Clear field scope"><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
          </Stack>
        ) : null}
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
          <Box sx={{ flex: 1, border: `1.5px solid ${line}`, borderRadius: "14px", bgcolor: "#FFFDF8", px: 1.25, py: 0.75, "&:focus-within": { borderColor: blue, boxShadow: `0 0 0 3px ${blueSoft}` } }}>
            <InputBase
              multiline
              maxRows={4}
              fullWidth
              placeholder={activeFieldKey ? `Comment on ${activeFieldKey}…` : "Add a note for the team…"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment(); }}
              sx={{ fontSize: 13 }}
            />
          </Box>
          <Button variant="contained" onClick={submitComment} disabled={!draft.trim() || !me} sx={{ minWidth: 0, px: 1.5, height: 42 }}>
            <SendIcon sx={{ fontSize: 17 }} />
          </Button>
        </Stack>
      </PaperCard>

      {/* Timeline */}
      <PaperCard tilt={0.2}>
        <Typography variant="h2" className="font-hand" sx={{ fontSize: 19, mb: 1.5 }}>Timeline 📖</Typography>
        <TimelineList timeline={proposal.timeline} />
        {proposal.status === "merged" ? (
          <SpeechBubble color="purple" tail="none" sx={{ mt: 2, display: "inline-block" }}>
            This proposal is merged — the changes are live on the endpoint. 🎉
          </SpeechBubble>
        ) : null}
      </PaperCard>
    </Box>
  );
}
