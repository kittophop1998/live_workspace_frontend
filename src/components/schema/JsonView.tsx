"use client";

import { Box } from "@mui/material";
import { tokenizeJson, type JsonTokenKind } from "@/lib/schemaConvert";

const TOKEN_COLOR: Record<JsonTokenKind, string> = {
  key: "#2563EB",
  string: "#15803D",
  number: "#7C3AED",
  boolean: "#D97706",
  null: "#A1A1AA",
  punct: "#52525B",
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
        bgcolor: "#FBFBFC",
        border: "2px solid #0A0A0A",
        borderRadius: "12px",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 12.5,
        lineHeight: 1.7,
        color: "#18181B",
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
