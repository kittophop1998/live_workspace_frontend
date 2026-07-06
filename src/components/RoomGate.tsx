"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useWorkspaceStore } from "@/lib/store";
import { workspaceApi } from "@/services/workspace.service";
import { apiErrorMessage } from "@/lib/api";
import { line, secondaryText, softShadowLg } from "@/components/theme";
import { ChibiReader, DoodleCloud, DoodleStar, DoodleSparkle } from "@/components/doodles";

type Mode = "create" | "join";

// Landing screen: create a new room (returns a shareable code) or join one with
// an existing code. On success applyRoomSession persists the token + hydrates,
// flipping the auth gate so the workspace mounts.
export function RoomGate() {
  const applyRoomSession = useWorkspaceStore((s) => s.applyRoomSession);

  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmedName = name.trim();
  const trimmedCode = roomCode.trim();
  const canSubmit =
    !busy && trimmedName.length > 0 && (mode === "create" || trimmedCode.length > 0);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const session =
        mode === "create"
          ? await workspaceApi.createRoom(trimmedName)
          : await workspaceApi.joinRoom(trimmedCode, trimmedName);
      applyRoomSession(session);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        position: "relative",
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        overflow: "hidden",
      }}
    >
      {/* Floating doodles in the margins */}
      <DoodleCloud size={90} style={{ position: "absolute", top: "12%", left: "12%", opacity: 0.8 }} className="animate-float" />
      <DoodleCloud size={64} style={{ position: "absolute", bottom: "16%", right: "14%", opacity: 0.7 }} className="animate-float" />
      <DoodleStar size={22} style={{ position: "absolute", top: "22%", right: "24%" }} className="animate-twinkle" />
      <DoodleSparkle size={20} style={{ position: "absolute", bottom: "26%", left: "22%" }} className="animate-twinkle" />

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 410,
          bgcolor: "#FFFDF8",
          border: `1.5px solid ${line}`,
          borderRadius: "26px",
          boxShadow: softShadowLg,
          p: 3.5,
        }}
      >
        {/* Mascot peeking over the top of the page */}
        <Box sx={{ position: "absolute", top: -46, left: "50%", ml: "-44px" }} className="animate-float">
          <ChibiReader size={88} />
        </Box>

        <Stack sx={{ alignItems: "center", mb: 2.5, mt: 3.5 }}>
          <Typography variant="h1" className="font-hand" sx={{ fontSize: 28, lineHeight: 1 }}>
            Live Workspace
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: secondaryText, mt: 0.5 }}>
            our little schema notebook ✎ ♡
          </Typography>
        </Stack>

        <ToggleButtonGroup
          exclusive
          fullWidth
          value={mode}
          onChange={(_, v: Mode | null) => {
            if (v) {
              setMode(v);
              setError(null);
            }
          }}
          sx={{ mb: 2.5, gap: 1, "& .MuiToggleButton-root": { py: 0.75, borderRadius: "999px !important", border: `1.5px solid ${line} !important` } }}
        >
          <ToggleButton value="create">✎ New notebook</ToggleButton>
          <ToggleButton value="join">→ Join one</ToggleButton>
        </ToggleButtonGroup>

        <Stack spacing={1.75}>
          <TextField
            label="What should we call you?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ava Chen"
            size="small"
            fullWidth
            autoFocus
          />
          {mode === "join" && (
            <TextField
              label="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="e.g. 123456"
              size="small"
              fullWidth
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
          )}

          {error && (
            <Alert severity="error" sx={{ border: `1.5px solid ${line}`, borderRadius: "12px", py: 0 }}>
              {error}
            </Alert>
          )}

          <Button type="submit" variant="contained" disabled={!canSubmit} sx={{ py: 1.1, fontSize: 15 }}>
            {busy
              ? mode === "create"
                ? "Opening…"
                : "Joining…"
              : mode === "create"
                ? "Open my notebook ♡"
                : "Join the room →"}
          </Button>
        </Stack>

        <Typography
          sx={{ display: "block", fontSize: 12, mt: 2, color: secondaryText, textAlign: "center" }}
        >
          {mode === "create"
            ? "You'll get a room code to share with your team 🐣"
            : "Enter the code a teammate scribbled down for you ✏️"}
        </Typography>
      </Box>
    </Box>
  );
}
