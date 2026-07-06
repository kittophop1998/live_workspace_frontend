"use client";

import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useProposalStore, proposalsForResource, STATUS_META } from "@/lib/proposals";
import { diffProposal, summarizeDiff } from "@/lib/proposalDiff";
import { useWorkspaceStore } from "@/lib/store";
import { NewProposalDialog } from "@/components/proposals/NewProposalDialog";
import { ProposalReview } from "@/components/proposals/ProposalReview";
import { Avatar, EmptyState, Sticker, relativeTime, useNow } from "@/components/common";
import { ink, line, secondaryText } from "@/components/theme";
import type { Resource } from "@/lib/types";

function ProposalCard({ resource, proposalId, onOpen }: { resource: Resource; proposalId: string; onOpen: () => void }) {
  const proposal = useProposalStore((s) => s.byId[proposalId]);
  useNow();
  if (!proposal) return null;
  const m = STATUS_META[proposal.status];
  const summary = summarizeDiff(diffProposal(proposal, resource));
  const colorFor = (role: string) => (role === "backend" ? "#4C86C6" : "#F5799F");
  return (
    <Box
      role="button"
      onClick={onOpen}
      sx={{
        p: 1.75,
        borderRadius: "16px",
        bgcolor: "#FFFDF8",
        border: `1.5px solid ${line}`,
        boxShadow: "0 1px 2px rgba(120,88,44,0.06)",
        cursor: "pointer",
        transition: "transform .15s ease, box-shadow .15s ease",
        "&:hover": { transform: "translateY(-2px) rotate(-0.4deg)", boxShadow: "0 6px 18px rgba(120,88,44,0.14)" },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: ink, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {proposal.title}
        </Typography>
        <Box component="span" sx={{ flexShrink: 0, px: 1, py: 0.3, borderRadius: "999px", bgcolor: m.bg, color: m.fg, border: `1.5px solid ${m.fg}2E`, fontSize: 10.5, fontWeight: 800 }}>
          {m.label}
        </Box>
      </Stack>
      <Typography sx={{ fontSize: 12, color: secondaryText, mt: 0.5 }}>{summary}</Typography>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 1 }}>
        <Avatar name={proposal.author} color={colorFor(proposal.authorRole)} size={20} />
        <Typography sx={{ fontSize: 11.5, color: secondaryText }}>
          {proposal.author} · {relativeTime(proposal.createdAt)}
          {proposal.comments.length ? ` · 💬 ${proposal.comments.length}` : ""}
        </Typography>
      </Stack>
    </Box>
  );
}

export function ProposalPanel({ resource }: { resource: Resource }) {
  const byId = useProposalStore((s) => s.byId);
  const me = useWorkspaceStore((s) => s.me);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const proposals = proposalsForResource(byId, resource.id);

  if (openId) {
    return <ProposalReview proposalId={openId} onBack={() => setOpenId(null)} />;
  }

  return (
    <Box sx={{ animation: "fade-in .2s ease" }}>
      <Stack direction="row" sx={{ alignItems: "center", mb: 2 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flex: 1 }}>
          <Sticker color="pink">📝 Proposals</Sticker>
          {proposals.length ? <Typography sx={{ fontSize: 12, color: secondaryText }}>{proposals.length} total</Typography> : null}
        </Stack>
        <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => setShowNew(true)} disabled={!me}>
          New Proposal
        </Button>
      </Stack>

      {proposals.length === 0 ? (
        <EmptyState
          chibi="bird"
          chibiSize={116}
          color="pink"
          title="No proposals yet — suggest a change! ✨"
          subtitle="A proposal is like a pull request for this endpoint: draft your changes, get a review, then merge when everyone's happy."
          action={<Button variant="outlined" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => setShowNew(true)} disabled={!me}>Start one</Button>}
          sx={{ py: 4 }}
        />
      ) : (
        <Stack spacing={1.25}>
          {proposals.map((p) => (
            <ProposalCard key={p.id} resource={resource} proposalId={p.id} onOpen={() => setOpenId(p.id)} />
          ))}
        </Stack>
      )}

      <NewProposalDialog resource={resource} open={showNew} onClose={() => setShowNew(false)} onCreated={(id) => setOpenId(id)} />
    </Box>
  );
}
