"use client";

import { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import { findNode, isContainer, useSchemaTreeStore, type SchemaNode } from "@/lib/schemaTree";
import { SchemaNodeRow, type DropPos, type RowCallbacks } from "@/components/schema/SchemaNodeRow";
import { FieldDetailPanel } from "@/components/schema/FieldDetailPanel";
import { useWorkspaceStore } from "@/lib/store";
import { EmptyState } from "@/components/common";
import { line } from "@/components/theme";

function collectContainerIds(nodes: SchemaNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    if (isContainer(n.type)) acc.push(n.id);
    if (n.children) collectContainerIds(n.children, acc);
    if (n.items) collectContainerIds([n.items], acc);
  }
  return acc;
}

export function SchemaTreeEditor({ scope }: { scope: string }) {
  const nodes = useSchemaTreeStore((s) => s.trees[scope] ?? []);
  const addChild = useSchemaTreeStore((s) => s.addChild);
  const addArrayItem = useSchemaTreeStore((s) => s.addArrayItem);
  const duplicateNode = useSchemaTreeStore((s) => s.duplicateNode);
  const deleteNode = useSchemaTreeStore((s) => s.deleteNode);
  const moveNode = useSchemaTreeStore((s) => s.moveNode);
  const removeField = useWorkspaceStore((s) => s.removeField);

  // The request-body tree seeds 1:1 from the resource's backend fields
  // (schemaConvert.seedFromFields). Deleting a top-level field from the
  // client-only tree alone lets it re-seed on a fresh machine, so mirror the
  // delete onto the backend field it maps to (by key) so removal persists.
  const reqResourceId = scope.endsWith("::req") ? scope.slice(0, -"::req".length) : null;

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(collectContainerIds(nodes)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; pos: DropPos } | null>(null);

  const expand = (id: string) => setExpanded((s) => new Set(s).add(id));
  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const select = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const cb: RowCallbacks = {
    expanded,
    selectedId,
    dragId,
    dropHint,
    onToggle: toggle,
    onSelect: select,
    onAddChild: (id) => {
      const newId = addChild(scope, id);
      expand(id);
      select(newId);
    },
    onAddItem: (id) => {
      const newId = addArrayItem(scope, id);
      expand(id);
      select(newId);
    },
    onDuplicate: (id) => {
      const newId = duplicateNode(scope, id);
      if (newId) setSelectedId(newId);
    },
    onDelete: (id) => {
      // Only top-level nodes map to a backend field; nested nodes stay local.
      const topLevel = nodes.find((n) => n.id === id);
      deleteNode(scope, id);
      if (reqResourceId && topLevel) {
        const field = useWorkspaceStore
          .getState()
          .resources.find((r) => r.id === reqResourceId)
          ?.fields.find((f) => f.key === topLevel.key && f.change !== "removed");
        if (field) removeField(reqResourceId, field.id);
      }
      if (selectedId === id) {
        setSelectedId(null);
        setDetailOpen(false);
      }
    },
    onDragStart: (id) => setDragId(id || null),
    onDragHint: setDropHint,
    onDrop: (targetId, pos) => moveNode(scope, dragId!, targetId, pos),
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    if (!selectedId) return;
    const node = findNode(nodes, selectedId);
    if (!node) return;
    if (e.key === "Enter") {
      e.preventDefault();
      cb.onAddChild(isContainer(node.type) ? node.id : node.id);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      cb.onDuplicate(node.id);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      cb.onDelete(node.id);
    } else if (e.key === "ArrowRight") {
      expand(node.id);
    } else if (e.key === "ArrowLeft") {
      setExpanded((s) => {
        const next = new Set(s);
        next.delete(node.id);
        return next;
      });
    }
  };

  const selectedNode = selectedId ? findNode(nodes, selectedId) : null;

  return (
    <Box>
      {/* toolbar */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => select(addChild(scope, null))}>
          Add field
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" startIcon={<UnfoldMoreIcon />} onClick={() => setExpanded(new Set(collectContainerIds(nodes)))}>
          Expand all
        </Button>
        <Button size="small" variant="outlined" startIcon={<UnfoldLessIcon />} onClick={() => setExpanded(new Set())}>
          Collapse
        </Button>
      </Stack>

      {/* tree */}
      <Box
        tabIndex={0}
        onKeyDown={onKeyDown}
        onDragOver={(e) => e.preventDefault()}
        sx={{
          border: `1px solid ${line}`,
          borderRadius: "12px",
          bgcolor: "#fff",
          overflow: "hidden",
          outline: "none",
          py: 0.5,
          "& > *:not(:last-child)": { borderBottom: "1px solid #F1F5F9" },
        }}
      >
        {nodes.length === 0 ? (
          <EmptyState
            image="/images/no_response.png"
            imageAlt="No fields yet"
            imageWidth={280}
            title="No fields yet"
            sx={{ py: 4 }}
          />
        ) : (
          nodes.map((n) => <SchemaNodeRow key={n.id} node={n} depth={0} cb={cb} />)
        )}
      </Box>

      <Typography sx={{ mt: 1, fontSize: 11, color: "#94A3B8" }}>
        Drag to reorder · click a field to edit details · <b>Enter</b> add · <b>⌘/Ctrl+D</b> duplicate · <b>Del</b> remove
      </Typography>

      <FieldDetailPanel scope={scope} node={selectedNode} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </Box>
  );
}
