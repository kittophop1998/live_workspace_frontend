"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Container, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { apiClient, apiErrorMessage } from "@/lib/api";

type APIKey = { id: string; prefix: string; name: string; scopes: string[]; revokedAt?: string | null };
const scopes = ["api-spec:read", "api-spec:write", "api-spec:revision:read"];

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([]), [name, setName] = useState("CLI key"), [selected, setSelected] = useState<string[]>(["api-spec:read"]), [secret, setSecret] = useState<string | null>(null), [error, setError] = useState<string | null>(null);
  const load = async () => { try { setKeys((await apiClient.get<APIKey[]>("/api-keys")).data); } catch (value) { setError(apiErrorMessage(value)); } };
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  const create = async () => { try { setError(null); const response = await apiClient.post<{ apiKey: APIKey; secret: string }>("/api-keys", { name, scopes: selected }); setSecret(response.data.secret); await load(); } catch (value) { setError(apiErrorMessage(value)); } };
  const revoke = async (id: string) => { try { await apiClient.delete(`/api-keys/${id}`); await load(); } catch (value) { setError(apiErrorMessage(value)); } };
  return <Container maxWidth="sm" sx={{ py: 6 }}><Stack spacing={3}><Typography variant="h4">CLI API keys</Typography><Typography color="text.secondary">Create a scoped key for Live Workspace CLI. Copy it now; it is never shown again.</Typography>{error && <Alert severity="error">{error}</Alert>}{secret && <Alert severity="warning"><Typography sx={{ fontWeight: 700 }}>Copy this key now</Typography><Box component="code" sx={{ display: "block", overflowWrap: "anywhere", mt: 1 }}>{secret}</Box></Alert>}<TextField label="Key name" value={name} onChange={(event) => setName(event.target.value)} />{scopes.map((scope) => <FormControlLabel key={scope} control={<Checkbox checked={selected.includes(scope)} onChange={(event) => setSelected(event.target.checked ? [...selected, scope] : selected.filter((value) => value !== scope))} />} label={scope} />)}<Button variant="contained" disabled={!name || !selected.length} onClick={() => void create()}>Create API key</Button><Typography variant="h6">Existing keys</Typography>{keys.map((key) => <Stack key={key.id} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}><Typography>{key.name} <code>{key.prefix}…</code></Typography><Button color="error" size="small" disabled={Boolean(key.revokedAt)} onClick={() => void revoke(key.id)}>{key.revokedAt ? "Revoked" : "Revoke"}</Button></Stack>)}</Stack></Container>;
}
