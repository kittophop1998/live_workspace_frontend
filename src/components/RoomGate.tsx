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
import BoltIcon from "@mui/icons-material/Bolt";
import { useWorkspaceStore } from "@/lib/store";
import { workspaceApi } from "@/services/workspace.service";
import { apiErrorMessage } from "@/lib/api";
import { flatShadow, line } from "@/components/theme";

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
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#F4F4F5",
        p: 2,
      }}
    >
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        sx={{
          width: "100%",
          maxWidth: 400,
          bgcolor: "#fff",
          border: `2px solid ${line}`,
          borderRadius: "12px",
          boxShadow: flatShadow,
          p: 3,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "8px",
              bgcolor: line,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "2px 2px 0 #71717A",
            }}
          >
            <BoltIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h1" sx={{ lineHeight: 1 }}>
              Live Workspace
            </Typography>
            <Typography variant="caption" sx={{ color: "#71717A" }}>
              Schema collaboration hub
            </Typography>
          </Box>
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
          sx={{ my: 2.5, "& .MuiToggleButton-root": { py: 0.75, fontWeight: 700 } }}
        >
          <ToggleButton value="create">Create room</ToggleButton>
          <ToggleButton value="join">Join room</ToggleButton>
        </ToggleButtonGroup>

        <Stack spacing={1.75}>
          <TextField
            label="Your name"
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
            <Alert severity="error" sx={{ border: `2px solid ${line}`, borderRadius: "8px", py: 0 }}>
              {error}
            </Alert>
          )}

          <Button type="submit" variant="contained" disabled={!canSubmit} sx={{ py: 1 }}>
            {busy
              ? mode === "create"
                ? "Creating…"
                : "Joining…"
              : mode === "create"
                ? "Create room"
                : "Join room"}
          </Button>
        </Stack>

        <Typography
          variant="caption"
          sx={{ display: "block", mt: 2, color: "#71717A", textAlign: "center" }}
        >
          {mode === "create"
            ? "You'll get a room code to share with your team."
            : "Enter the code a teammate shared with you."}
        </Typography>
      </Box>
    </Box>
  );
}
