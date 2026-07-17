"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  CssBaseline,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { apiClient, apiErrorMessage } from "@/lib/api";
import { theme } from "@/components/theme";

type APIKey = { id: string; prefix: string; name: string; scopes: string[]; revokedAt?: string | null };

// Must match the backend's allowed scopes (usecase/api_key.go).
const SCOPES = ["api-spec:read", "api-spec:write", "api-spec:revision:read"];

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("CLI key");
  const [selected, setSelected] = useState<string[]>(["api-spec:read"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // GET /api-keys returns a bare array (no envelope) — see handler.List.
      setKeys((await apiClient.get<APIKey[]>("/api-keys")).data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so setState runs outside the effect body (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const create = async () => {
    try {
      setError(null);
      setCopied(false);
      const res = await apiClient.post<{ apiKey: APIKey; secret: string }>("/api-keys", {
        name,
        scopes: selected,
      });
      setSecret(res.data.secret);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const revoke = async (id: string) => {
    try {
      await apiClient.delete(`/api-keys/${id}`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      // Clipboard unavailable (permissions / insecure context) — user can still select the text.
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4">CLI API keys</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Create a scoped key for Live Workspace CLI. Copy it now; it is never shown again.
            </Typography>
            <Link href="/" underline="hover" sx={{ fontSize: 14 }}>
              ← Back to workspace
            </Link>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {secret && (
            <Alert
              severity="warning"
              action={
                <Button size="small" color="inherit" onClick={() => void copySecret()}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              }
            >
              <Typography sx={{ fontWeight: 700 }}>Copy this key now</Typography>
              <Box component="code" sx={{ display: "block", overflowWrap: "anywhere", mt: 1 }}>
                {secret}
              </Box>
            </Alert>
          )}

          <TextField label="Key name" value={name} onChange={(e) => setName(e.target.value)} />
          <Box>
            {SCOPES.map((scope) => (
              <FormControlLabel
                key={scope}
                sx={{ display: "block" }}
                control={
                  <Checkbox
                    checked={selected.includes(scope)}
                    onChange={(e) =>
                      setSelected(e.target.checked ? [...selected, scope] : selected.filter((s) => s !== scope))
                    }
                  />
                }
                label={scope}
              />
            ))}
          </Box>
          <Button variant="contained" disabled={!name.trim() || !selected.length} onClick={() => void create()}>
            Create API key
          </Button>

          <Typography variant="h6">Existing keys</Typography>
          {loading ? (
            <Stack sx={{ alignItems: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : keys.length === 0 ? (
            <Typography color="text.secondary">No keys yet.</Typography>
          ) : (
            keys.map((key) => (
              <Stack key={key.id} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                <Typography>
                  {key.name} <code>{key.prefix}…</code>
                </Typography>
                <Button
                  color="error"
                  size="small"
                  disabled={Boolean(key.revokedAt)}
                  onClick={() => void revoke(key.id)}
                >
                  {key.revokedAt ? "Revoked" : "Revoke"}
                </Button>
              </Stack>
            ))
          )}
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
