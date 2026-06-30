"use client";

import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { isContainer, type SchemaNode } from "@/lib/schemaTree";
import { TypeChip, TypeIcon } from "@/components/schema/typeMeta";

export type DropPos = "before" | "after" | "inside";

export interface RowCallbacks {
  expanded: Set<string>;
  selectedId: string | null;
  dragId: string | null;
  dropHint: { id: string; pos: DropPos } | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddItem: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragHint: (h: { id: string; pos: DropPos } | null) => void;
  onDrop: (targetId: string, pos: DropPos) => void;
}

const changeDot: Record<SchemaNode["change"], string | null> = {
  added: "#16A34A",
  modified: "#D97706",
  removed: "#DC2626",
  stable: null,
};

export function SchemaNodeRow({ node, depth, cb }: { node: SchemaNode; depth: number; cb: RowCallbacks }) {
  const container = isContainer(node.type);
  const childNodes =
    node.type === "object" ? node.children ?? [] : node.type === "array" && node.items ? [node.items] : [];
  const expandable = childNodes.length > 0;
  const open = cb.expanded.has(node.id);
  const selected = cb.selectedId === node.id;
  const dragging = cb.dragId === node.id;
  const hint = cb.dropHint?.id === node.id ? cb.dropHint.pos : null;

  const computePos = (e: React.DragEvent): DropPos => {
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - r.top) / r.height;
    if (container && ratio > 0.3 && ratio < 0.7) return "inside";
    return ratio < 0.5 ? "before" : "after";
  };

  return (
    <>
      <Box
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          cb.onDragStart(node.id);
        }}
        onDragEnd={() => {
          cb.onDragStart("");
          cb.onDragHint(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (cb.dragId && cb.dragId !== node.id) cb.onDragHint({ id: node.id, pos: computePos(e) });
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (cb.dragId && cb.dragId !== node.id) cb.onDrop(node.id, computePos(e));
          cb.onDragHint(null);
        }}
        onClick={() => cb.onSelect(node.id)}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          minHeight: 38,
          pr: 1,
          cursor: "pointer",
          opacity: dragging ? 0.4 : 1,
          bgcolor: selected ? "#EFF6FF" : hint === "inside" ? "#F0FDF4" : "transparent",
          boxShadow: selected ? "inset 2px 0 0 #2563EB" : hint === "inside" ? "inset 0 0 0 1.5px #16A34A" : "none",
          transition: "background-color .1s ease",
          "&:hover": { bgcolor: selected ? "#EFF6FF" : "#FAFAFA" },
          "&:hover .row-actions": { opacity: 1 },
          // drop line indicator
          "&::before":
            hint === "before" || hint === "after"
              ? {
                  content: '""',
                  position: "absolute",
                  left: depth * 16 + 30,
                  right: 8,
                  height: 2,
                  bgcolor: "#2563EB",
                  top: hint === "before" ? 0 : "auto",
                  bottom: hint === "after" ? 0 : "auto",
                }
              : undefined,
        }}
      >
        {/* indentation guides */}
        {Array.from({ length: depth }).map((_, i) => (
          <Box key={i} sx={{ width: 16, flexShrink: 0, alignSelf: "stretch", borderLeft: "1.5px solid #ECECEF", ml: i === 0 ? "10px" : 0 }} />
        ))}

        {/* expand caret */}
        {expandable ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              cb.onToggle(node.id);
            }}
            sx={{ p: 0.25, color: "#71717A", "&:hover": { bgcolor: "transparent" } }}
          >
            <ChevronRightIcon sx={{ fontSize: 18, transition: "transform .12s ease", transform: open ? "rotate(90deg)" : "none" }} />
          </IconButton>
        ) : (
          <Box sx={{ width: 20, flexShrink: 0 }} />
        )}

        <TypeIcon type={node.type} />

        <Typography
          sx={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 13,
            fontWeight: 700,
            color: node.change === "removed" ? "#A1A1AA" : "#18181B",
            textDecoration: node.change === "removed" ? "line-through" : "none",
            whiteSpace: "nowrap",
          }}
        >
          {node.key}
        </Typography>

        {node.required ? (
          <Tooltip title="Required">
            <Box component="span" sx={{ color: "#DC2626", fontWeight: 800, fontSize: 13, lineHeight: 1 }}>*</Box>
          </Tooltip>
        ) : null}

        <TypeChip type={node.type} suffix={node.type === "array" && node.items ? `<${node.items.type}>` : undefined} />

        {node.nullable ? (
          <Box component="span" sx={{ fontSize: 10, fontWeight: 700, color: "#71717A", border: "1px solid #E4E4E7", borderRadius: "4px", px: 0.4 }}>
            nullable
          </Box>
        ) : null}

        {/* draft / changed indicators */}
        {node.state === "draft" ? (
          <Tooltip title="Draft">
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#D97706", flexShrink: 0 }} />
          </Tooltip>
        ) : null}
        {changeDot[node.change] ? (
          <Tooltip title={node.change}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: changeDot[node.change]!, flexShrink: 0 }} />
          </Tooltip>
        ) : null}

        <Box sx={{ flex: 1 }} />

        {/* hover actions */}
        <Box className="row-actions" sx={{ display: "flex", alignItems: "center", gap: 0.25, opacity: 0, transition: "opacity .12s ease" }}>
          {node.type === "object" ? (
            <Tooltip title="Add child field">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); cb.onAddChild(node.id); }} sx={{ p: 0.4, color: "#52525B" }}>
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          {node.type === "array" && !node.items ? (
            <Tooltip title="Add item schema">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); cb.onAddItem(node.id); }} sx={{ p: 0.4, color: "#52525B" }}>
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="Duplicate">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); cb.onDuplicate(node.id); }} sx={{ p: 0.4, color: "#52525B" }}>
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); cb.onDelete(node.id); }} sx={{ p: 0.4, color: "#A1A1AA", "&:hover": { color: "#DC2626" } }}>
              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Box sx={{ display: "flex", color: "#C4C4CC", cursor: "grab" }}>
            <DragIndicatorIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      </Box>

      {/* recursive children */}
      {open
        ? childNodes.map((c) => <SchemaNodeRow key={c.id} node={c} depth={depth + 1} cb={cb} />)
        : null}
    </>
  );
}
