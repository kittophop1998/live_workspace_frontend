"use client";

import { Box } from "@mui/material";
import { tokenizeJson, type JsonTokenKind } from "@/lib/schemaConvert";

const TOKEN_COLOR: Record<JsonTokenKind, string> = {
  key: "#2563EB",
  string: "#15803D",
  number: "#7C3AED",
  boolean: "#D97706",
  null: "#94A3B8",
  punct: "#4B5563",
  plain: "inherit",
};

// Read-only, syntax-highlighted JSON block.
export function JsonView({ code, maxHeight = 460 }: { code: string; maxHeight?: number | string }) {
  const tokens = tokenizeJson(code);
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        bgcolor: "#F8FAFC",
        border: "1px solid #E8EDF3",
        borderRadius: "12px",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 12.5,
        lineHeight: 1.7,
        color: "#111827",
        overflow: "auto",
        maxHeight,
        whiteSpace: "pre",
        tabSize: 2,
      }}
    >
      <code>
        {tokens.map((t, i) => (
          <Box key={i} component="span" sx={{ color: TOKEN_COLOR[t.kind] }}>
            {t.value}
          </Box>
        ))}
      </code>
    </Box>
  );
}
