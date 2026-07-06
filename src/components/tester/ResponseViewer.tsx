"use client";

import { useState } from "react";
import { Box, Collapse, Stack, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { JsonView } from "@/components/schema/JsonView";
import { MonoTag } from "@/components/common";
import { line } from "@/components/theme";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelEmptyState } from "@/components/pixel/PixelEmptyState";
import type { TestResult } from "@/services/testerService";

function statusColor(status: number): string {
  if (status >= 500) return "#DC2626";
  if (status >= 400) return "#D97706";
  if (status >= 300) return "#7C3AED";
  if (status >= 200) return "#16A34A";
  return "#6B7280";
}

// Pretty-print JSON bodies; fall back to raw text for anything else.
function prettyBody(body: string): { code: string; json: boolean } {
  try {
    return { code: JSON.stringify(JSON.parse(body), null, 2), json: true };
  } catch {
    return { code: body, json: false };
  }
}

export function ResponseViewer({ result, loading }: { result: TestResult | null; loading: boolean }) {
  const [showHeaders, setShowHeaders] = useState(false);

  if (loading) {
    return (
      <Typography variant="body2" sx={{ color: "#6B7280", mt: 1 }}>
        Sending request…
      </Typography>
    );
  }
  if (!result) {
    return (
      <PixelEmptyState
        pose="coding"
        mascotSize={64}
        title="No response yet"
        subtitle="Send this request to inspect status, timing, headers, and body."
        sx={{ py: 3 }}
      />
    );
  }

  if (result.error) {
    return (
      <Stack direction="row" spacing={1} sx={{ mt: 1.5, p: 1.5, border: `2px solid #DC2626`, borderRadius: "10px", bgcolor: "#FEE2E2", alignItems: "flex-start" }}>
        <ErrorOutlineIcon sx={{ fontSize: 18, color: "#991B1B", mt: 0.2 }} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#991B1B" }}>
            Request failed
          </Typography>
          <Typography variant="body2" sx={{ color: "#991B1B", wordBreak: "break-word" }}>
            {result.error}
          </Typography>
        </Box>
      </Stack>
    );
  }

  const headerEntries = Object.entries(result.headers);
  const { code, json } = prettyBody(result.body);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", p: 1.25, border: `1px solid ${line}`, bgcolor: "#FAFAFC" }}>
        <PixelBadge fg="#FFFFFF" bg={statusColor(result.status)}>{result.status || "—"}</PixelBadge>
        <MonoTag>{result.durationMs} ms</MonoTag>
        <MonoTag>{result.size} B</MonoTag>
        {result.truncated ? (
          <PixelBadge fg="#D97706">truncated</PixelBadge>
        ) : null}
      </Stack>

      {headerEntries.length ? (
        <Box sx={{ mt: 1 }}>
          <Stack
            direction="row"
            spacing={0.5}
            onClick={() => setShowHeaders((v) => !v)}
            sx={{ alignItems: "center", cursor: "pointer", color: "#4B5563", userSelect: "none" }}
          >
            <ExpandMoreIcon sx={{ fontSize: 18, transform: showHeaders ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .15s" }} />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Response headers ({headerEntries.length})
            </Typography>
          </Stack>
          <Collapse in={showHeaders}>
            <Box sx={{ mt: 0.75, p: 1.25, border: `1px solid ${line}`, borderRadius: 0, bgcolor: "#F8FAFC", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
              {headerEntries.map(([key, values]) => (
                <Box key={key} sx={{ display: "flex", gap: 1, py: 0.15 }}>
                  <Box component="span" sx={{ color: "#2563EB", fontWeight: 700 }}>{key}:</Box>
                  <Box component="span" sx={{ color: "#111827", wordBreak: "break-all" }}>{values.join(", ")}</Box>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      ) : null}

      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "#4B5563" }}>
          Response body {json ? "" : "(raw)"}
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          {result.body ? <JsonView code={code} maxHeight={340} /> : (
            <Typography variant="body2" sx={{ color: "#94A3B8", fontStyle: "italic" }}>(empty body)</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
