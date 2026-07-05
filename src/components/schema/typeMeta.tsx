"use client";

import { Box } from "@mui/material";
import DataObjectIcon from "@mui/icons-material/DataObject";
import DataArrayIcon from "@mui/icons-material/DataArray";
import NumbersIcon from "@mui/icons-material/Numbers";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import KeyIcon from "@mui/icons-material/KeyOutlined";
import ScheduleIcon from "@mui/icons-material/ScheduleOutlined";
import ListAltIcon from "@mui/icons-material/ListAltOutlined";
import BlockIcon from "@mui/icons-material/BlockOutlined";
import type { ReactNode } from "react";
import type { NodeType } from "@/lib/schemaTree";

// Per-type accent color — drives the type icon + chip text.
export const typeColor: Record<NodeType, string> = {
  string: "#2563EB",
  number: "#7C3AED",
  integer: "#7C3AED",
  boolean: "#D97706",
  uuid: "#4F46E5",
  timestamp: "#DB2777",
  object: "#111827",
  array: "#0D9488",
  enum: "#EA580C",
  null: "#6B7280",
};

function iconFor(type: NodeType): ReactNode {
  const sx = { fontSize: 15 } as const;
  switch (type) {
    case "object":
      return <DataObjectIcon sx={sx} />;
    case "array":
      return <DataArrayIcon sx={sx} />;
    case "number":
    case "integer":
      return <NumbersIcon sx={sx} />;
    case "boolean":
      return <ToggleOnIcon sx={sx} />;
    case "uuid":
      return <KeyIcon sx={sx} />;
    case "timestamp":
      return <ScheduleIcon sx={sx} />;
    case "enum":
      return <ListAltIcon sx={sx} />;
    case "null":
      return <BlockIcon sx={sx} />;
    default:
      return <TextFieldsIcon sx={sx} />;
  }
}

export function TypeIcon({ type }: { type: NodeType }) {
  return (
    <Box sx={{ display: "inline-flex", color: typeColor[type], flexShrink: 0 }}>{iconFor(type)}</Box>
  );
}

// Compact monospace type chip used in tree rows.
export function TypeChip({ type, suffix }: { type: NodeType; suffix?: string }) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 11,
        fontWeight: 700,
        color: typeColor[type],
        bgcolor: "#F1F5F9",
        border: "1px solid #EEF2F6",
        borderRadius: "5px",
        px: 0.6,
        py: 0.1,
        whiteSpace: "nowrap",
      }}
    >
      {type}
      {suffix ? <Box component="span" sx={{ color: "#94A3B8" }}>{suffix}</Box> : null}
    </Box>
  );
}
