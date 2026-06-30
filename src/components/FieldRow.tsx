"use client";

import { useState } from "react";
import { Box, IconButton, InputBase, MenuItem, Select, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import KeyIcon from "@mui/icons-material/VpnKey";
import { useWorkspaceStore } from "@/lib/store";
import { StateBadge } from "@/components/common";
import { changeColor, line } from "@/components/theme";
import type { DataType, SchemaField } from "@/lib/types";

const TYPES: DataType[] = [
  "string",
  "number",
  "boolean",
  "uuid",
  "timestamp",
  "json",
  "string[]",
  "number[]",
  "enum",
];

const CHANGE_LABEL: Record<SchemaField["change"], string> = {
  added: "+ Added",
  removed: "− Removed",
  modified: "~ Modified",
  stable: "",
};

export function FieldRow({ resourceId, field, commentCount }: { resourceId: string; field: SchemaField; commentCount: number }) {
  const updateField = useWorkspaceStore((s) => s.updateField);
  const cycleFieldState = useWorkspaceStore((s) => s.cycleFieldState);
  const removeField = useWorkspaceStore((s) => s.removeField);
  const focusComment = useWorkspaceStore((s) => s.focusComment);
  const activeFieldId = useWorkspaceStore((s) => s.activeFieldId);

  const [keyDraft, setKeyDraft] = useState(field.key);
  const removed = field.change === "removed";
  const focused = activeFieldId === field.id;

  const commitKey = () => {
    const next = keyDraft.trim();
    if (next && next !== field.key) updateField(resourceId, field.id, { key: next });
    else setKeyDraft(field.key);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.25,
        py: 1,
        // Diff treatment via left line weight + color; focus ring when commented on.
        borderLeft: `${field.change === "stable" ? 3 : 6}px solid ${changeColor[field.change]}`,
        borderBottom: `1.5px solid ${line}`,
        bgcolor: focused ? "#FFFBEB" : removed ? "#FAFAFA" : "#fff",
        opacity: removed ? 0.6 : 1,
        textDecoration: removed ? "line-through" : "none",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      {/* Key */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, width: 190, flexShrink: 0 }}>
        {field.required ? (
          <Tooltip title="Primary / required">
            <KeyIcon sx={{ fontSize: 13, color: "#A1A1AA" }} />
          </Tooltip>
        ) : (
          <Box sx={{ width: 13 }} />
        )}
        <InputBase
          value={keyDraft}
          disabled={removed}
          onChange={(e) => setKeyDraft(e.target.value)}
          onBlur={commitKey}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          sx={{
            fontFamily: "var(--font-mono,monospace)",
            fontSize: 13.5,
            fontWeight: 700,
            "& input": { p: 0 },
          }}
        />
      </Box>

      {/* Type */}
      <Select
        size="small"
        value={field.type}
        disabled={removed}
        onChange={(e) => updateField(resourceId, field.id, { type: e.target.value as DataType })}
        sx={{
          width: 128,
          flexShrink: 0,
          fontFamily: "var(--font-mono,monospace)",
          fontSize: 12.5,
          fontWeight: 700,
          bgcolor: "#F4F4F5",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: line, borderWidth: 1.5 },
          "& .MuiSelect-select": { py: 0.4 },
        }}
      >
        {TYPES.map((t) => (
          <MenuItem key={t} value={t} sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 12.5 }}>
            {t}
          </MenuItem>
        ))}
      </Select>

      {/* Required toggle */}
      <Tooltip title={field.required ? "Required" : "Optional"}>
        <Box
          role="button"
          onClick={() => !removed && updateField(resourceId, field.id, { required: !field.required })}
          sx={{
            width: 26,
            textAlign: "center",
            fontSize: 11,
            fontWeight: 800,
            cursor: removed ? "default" : "pointer",
            color: field.required ? line : "#C4C4CC",
            flexShrink: 0,
          }}
        >
          REQ
        </Box>
      </Tooltip>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {field.description ? (
          <Typography sx={{ fontSize: 11.5, color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {field.description}
          </Typography>
        ) : null}
        {field.change !== "stable" ? (
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: changeColor[field.change], textTransform: "uppercase" }}>
            {CHANGE_LABEL[field.change]}
          </Typography>
        ) : null}
      </Box>

      {/* State badge — click to cycle draft → ready → breaking */}
      <Tooltip title="Click to cycle state">
        <Box role="button" onClick={() => !removed && cycleFieldState(resourceId, field.id)} sx={{ cursor: removed ? "default" : "pointer", flexShrink: 0 }}>
          <StateBadge state={field.state} />
        </Box>
      </Tooltip>

      {/* Comment anchor */}
      <Tooltip title="Discuss this field">
        <IconButton size="small" onClick={() => focusComment(field.id)} sx={{ position: "relative", color: commentCount ? "#2563EB" : "#A1A1AA" }}>
          <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
          {commentCount ? (
            <Box sx={{ position: "absolute", top: -2, right: -2, bgcolor: "#2563EB", color: "#fff", fontSize: 8.5, fontWeight: 800, borderRadius: "50%", width: 13, height: 13, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff" }}>
              {commentCount}
            </Box>
          ) : null}
        </IconButton>
      </Tooltip>

      <Tooltip title={removed ? "Marked removed" : "Remove field"}>
        <span>
          <IconButton size="small" disabled={removed} onClick={() => removeField(resourceId, field.id)} sx={{ color: "#A1A1AA", "&:hover": { color: "#DC2626" } }}>
            <DeleteOutlineIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
