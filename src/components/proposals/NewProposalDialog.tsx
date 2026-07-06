"use client";

import { useState } from "react";
import { Box, Button, Dialog, IconButton, Stack, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useWorkspaceStore } from "@/lib/store";
import { useProposalStore } from "@/lib/proposals";
import { mascotSay } from "@/lib/mascot";
import { Sticker } from "@/components/common";
import { ChibiRobot, DoodleSparkle } from "@/components/doodles";
import { ink, line, secondaryText } from "@/components/theme";
import type { Resource } from "@/lib/types";

// A little "open a new PR" sheet — title + description, then Create.
export function NewProposalDialog({
  resource,
  open,
  onClose,
  onCreated,
}: {
  resource: Resource;
  open: boolean;
  onClose: () => void;
  onCreated: (proposalId: string) => void;
}) {
  const me = useWorkspaceStore((s) => s.me);
  const create = useProposalStore((s) => s.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    if (!me || !title.trim()) return;
    const p = create(resource, { title, description }, me);
    mascotSay("celebrate", "Nice! Your proposal is ready for review. 🎉");
    setTitle("");
    setDescription("");
    onCreated(p.id);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: "22px", border: `1.5px solid ${line}`, width: 460, maxWidth: "94vw", bgcolor: "#FFFFFF" } } }}
    >
      <Box sx={{ p: 3, position: "relative" }}>
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 12, right: 12 }} aria-label="Close">
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 0.5 }}>
          <Box className="animate-float" sx={{ position: "relative" }}>
            <ChibiRobot size={44} />
            <DoodleSparkle size={14} style={{ position: "absolute", top: -4, right: -6 }} className="animate-twinkle" />
          </Box>
          <Box>
            <Typography variant="h2" className="font-hand" sx={{ fontSize: 20 }}>New Proposal</Typography>
            <Typography sx={{ fontSize: 12.5, color: secondaryText }}>
              Suggest a change to <b style={{ color: ink }}>{resource.name}</b> — like a friendly pull request.
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={1.75} sx={{ mt: 2.5 }}>
          <Box>
            <Sticker color="pink" sx={{ mb: 0.75 }}>✎ Title</Sticker>
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="Add phone number to profile"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
            />
          </Box>
          <Box>
            <Sticker color="blue" sx={{ mb: 0.75 }}>💬 Description</Sticker>
            <TextField
              fullWidth
              multiline
              minRows={3}
              size="small"
              placeholder="Why this change? What does the frontend need?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ "& textarea": { fontSize: 13 } }}
            />
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: "flex-end" }}>
          <Button variant="text" onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={!title.trim() || !me}>
            Create Proposal
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
