"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Box, CircularProgress, CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "@/components/theme";
import { useWorkspaceStore } from "@/lib/store";
import { getRoomCode, getToken } from "@/lib/api";
import { RoomGate } from "@/components/RoomGate";
import { WorkspaceLayout } from "@/components/WorkspaceLayout";

// Client root: gate the app behind a room session. On mount, restore an existing
// token (from a prior visit); otherwise show the create/join screen. Mounting is
// also what avoids hydration mismatches (the UI renders relative time + reads
// localStorage), so render a loader until the client has mounted.
export function AppRoot() {
  const authed = useWorkspaceStore((s) => s.authed);
  const restoreSession = useWorkspaceStore((s) => s.restoreSession);
  // true only after client mount — keeps the first client paint equal to the
  // server HTML (a loader) without a setState-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (getToken()) restoreSession(getRoomCode());
  }, [restoreSession]);

  // A saved token but not-yet-restored session → keep the loader (the effect
  // above flips `authed`), so we never flash the login screen on reload.
  const loading = !mounted || (!authed && Boolean(getToken()));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {loading ? (
        <Box
          sx={{
            height: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#F8FAFC",
          }}
        >
          <CircularProgress sx={{ color: "#3B82F6" }} />
        </Box>
      ) : authed ? (
        <WorkspaceLayout />
      ) : (
        <RoomGate />
      )}
    </ThemeProvider>
  );
}
