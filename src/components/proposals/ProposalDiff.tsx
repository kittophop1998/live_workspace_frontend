"use client";

import { Box, Stack, Tooltip, Typography } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import { MonoTag, EmptyState } from "@/components/common";
import { changeColor, ink, line, secondaryText } from "@/components/theme";
import type { DiffOp, FieldDiff } from "@/lib/proposalDiff";

const SIGN: Record<DiffOp, string> = { add: "+", modify: "~", remove: "−" };
const OP_COLOR: Record<DiffOp, string> = {
  add: changeColor.added,
  modify: changeColor.modified,
  remove: changeColor.removed,
};

// One diff row: a colored gutter sign, the field key, a change summary, and a
// Figma-style comment affordance. Green = added, red = removed, amber = changed.
function DiffRow({
  diff,
  commentCount,
  active,
  onComment,
}: {
  diff: FieldDiff;
  commentCount: number;
  active: boolean;
  onComment: (fieldKey: string) => void;
}) {
  const color = OP_COLOR[diff.op];
  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        px: 1.5,
        py: 1.1,
        borderRadius: "14px",
        bgcolor: `${color}12`,
        border: `1.5px solid ${color}33`,
        boxShadow: active ? `0 0 0 3px ${color}22` : "none",
        transition: "box-shadow .15s ease, transform .15s ease",
        "&:hover": { transform: "translateX(2px)" },
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: "7px",
          bgcolor: color,
          color: "#fff",
          fontWeight: 800,
          fontSize: 15,
          lineHeight: "22px",
          textAlign: "center",
        }}
      >
        {SIGN[diff.op]}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <MonoTag sx={{ borderColor: `${color}55` }}>{diff.key}</MonoTag>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color, textTransform: "capitalize" }}>
            {diff.op === "add" ? "added" : diff.op === "remove" ? "removed" : "changed"}
          </Typography>
          {diff.op === "add" ? (
            <Typography sx={{ fontSize: 12, color: secondaryText }}>
              {diff.field.type}{diff.field.required ? " · required" : ""}
            </Typography>
          ) : null}
        </Stack>

        {/* Per-attribute deltas for a modified field: attr before → after */}
        {diff.deltas.length ? (
          <Stack spacing={0.4} sx={{ mt: 0.75 }}>
            {diff.deltas.map((d) => (
              <Typography key={d.attr} sx={{ fontSize: 12, color: ink }}>
                <Box component="span" sx={{ color: secondaryText, textTransform: "capitalize" }}>{d.attr}: </Box>
                <Box component="span" sx={{ textDecoration: "line-through", color: changeColor.removed }}>{d.before}</Box>
                <Box component="span" sx={{ color: secondaryText }}> → </Box>
                <Box component="span" sx={{ fontWeight: 700, color: changeColor.added }}>{d.after}</Box>
              </Typography>
            ))}
          </Stack>
        ) : null}
        {diff.field.description && diff.op === "add" ? (
          <Typography sx={{ fontSize: 12, color: secondaryText, mt: 0.4 }}>{diff.field.description}</Typography>
        ) : null}
      </Box>

      <Tooltip title="Discuss this field">
        <Box
          role="button"
          aria-label={`Comment on ${diff.key}`}
          onClick={() => onComment(diff.key)}
          sx={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.4,
            px: 0.85,
            py: 0.4,
            borderRadius: "999px",
            cursor: "pointer",
            fontSize: 11.5,
            fontWeight: 700,
            color: commentCount ? "#B77410" : secondaryText,
            bgcolor: commentCount ? "#FEF3E2" : "transparent",
            border: `1px solid ${commentCount ? "#B7741033" : line}`,
            transition: "color .15s ease, border-color .15s ease",
            "&:hover": { color: "#B77410" },
          }}
        >
          <ChatBubbleOutlineIcon sx={{ fontSize: 13 }} />
          {commentCount || ""}
        </Box>
      </Tooltip>
    </Box>
  );
}

export function ProposalDiff({
  diffs,
  commentCounts,
  activeFieldKey,
  onComment,
}: {
  diffs: FieldDiff[];
  commentCounts: Record<string, number>;
  activeFieldKey: string | null;
  onComment: (fieldKey: string) => void;
}) {
  if (diffs.length === 0) {
    return (
      <EmptyState
        chibi="reader"
        chibiSize={84}
        color="blue"
        title="No changes yet — edit the draft below! ✏️"
        subtitle="Add, remove or tweak a field and the differences will light up here."
        sx={{ py: 3 }}
      />
    );
  }
  return (
    <Stack spacing={1}>
      {diffs.map((d) => (
        <DiffRow
          key={`${d.op}:${d.field.id}`}
          diff={d}
          commentCount={commentCounts[d.key] ?? 0}
          active={activeFieldKey === d.key}
          onComment={onComment}
        />
      ))}
    </Stack>
  );
}
