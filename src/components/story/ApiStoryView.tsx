"use client";

// API Story — visualizes business flows as ordered lists of endpoint references
// (plus note / section-header annotation steps). Every endpoint step links back
// to the existing endpoint editor; stories never duplicate endpoint data.

import { useMemo, useState } from "react";
import { Box, IconButton, InputBase, Menu, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ApiIcon from "@mui/icons-material/Api";
import NotesIcon from "@mui/icons-material/NotesOutlined";
import TitleIcon from "@mui/icons-material/Title";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SouthIcon from "@mui/icons-material/South";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import { useWorkspaceStore } from "@/lib/store";
import { useApiStoryStore, type Story, type StoryStep } from "@/lib/apiStory";
import { PixelEmptyState } from "@/components/pixel/PixelEmptyState";
import { ink, line, methodColor, pastel, secondaryText, wash } from "@/components/theme";
import type { Resource } from "@/lib/types";

export function ApiStoryView() {
  const stories = useApiStoryStore((s) => s.stories);
  const selectedId = useApiStoryStore((s) => s.selectedId);
  const select = useApiStoryStore((s) => s.select);
  const createStory = useApiStoryStore((s) => s.createStory);

  const selected = useMemo(() => stories.find((s) => s.id === selectedId) ?? stories[0], [stories, selectedId]);

  return (
    <Box sx={{ height: "100%", display: "grid", gridTemplateColumns: { xs: "1fr", md: "260px minmax(0,1fr)" }, bgcolor: wash }}>
      {/* Story list */}
      <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", borderRight: `1px solid ${line}`, bgcolor: "#fff", minHeight: 0 }}>
        <Stack direction="row" sx={{ alignItems: "center", px: 2, py: 1.75, borderBottom: `1px solid ${line}` }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: ink, flex: 1, letterSpacing: "0.02em" }}>FLOWS</Typography>
          <Tooltip title="New flow">
            <IconButton size="small" onClick={() => createStory()} sx={{ bgcolor: pastel.purple, borderRadius: "8px", "&:hover": { bgcolor: "#E3DCFB" } }}>
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
          {stories.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: secondaryText, p: 1.5 }}>No flows yet. Create one to map a business flow.</Typography>
          ) : (
            stories.map((s) => (
              <Box
                key={s.id}
                role="button"
                onClick={() => select(s.id)}
                sx={{ px: 1.25, py: 1, borderRadius: "10px", cursor: "pointer", bgcolor: s.id === selected?.id ? pastel.purple : "transparent", "&:hover": { bgcolor: s.id === selected?.id ? pastel.purple : pastel.cream } }}
              >
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</Typography>
                <Typography sx={{ fontSize: 11, color: secondaryText }}>{s.steps.filter((st) => st.type === "endpoint").length} endpoints · {s.steps.length} steps</Typography>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Story detail */}
      <Box sx={{ minHeight: 0, overflowY: "auto" }}>
        {selected ? (
          <StoryDetail key={selected.id} story={selected} />
        ) : (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
            <PixelEmptyState
              pose="reading"
              title="Tell your first API story"
              subtitle="A flow is an ordered list of endpoints — Login → Profile → Permissions → Dashboard."
              action={
                <Box role="button" onClick={() => createStory()} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 2, py: 1, borderRadius: "10px", bgcolor: "#8B7CF6", color: "#fff", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>
                  <AddIcon sx={{ fontSize: 18 }} /> New Flow
                </Box>
              }
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

function StoryDetail({ story }: { story: Story }) {
  const resources = useWorkspaceStore((s) => s.resources);
  const selectResource = useWorkspaceStore((s) => s.select);
  const setView = useWorkspaceStore((s) => s.setView);

  const renameStory = useApiStoryStore((s) => s.renameStory);
  const deleteStory = useApiStoryStore((s) => s.deleteStory);
  const duplicateStory = useApiStoryStore((s) => s.duplicateStory);
  const addStep = useApiStoryStore((s) => s.addStep);
  const updateStep = useApiStoryStore((s) => s.updateStep);
  const removeStep = useApiStoryStore((s) => s.removeStep);
  const moveStep = useApiStoryStore((s) => s.moveStep);

  const byId = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);
  const endpoints = useMemo(() => resources.filter((r) => r.kind === "endpoint"), [resources]);

  const [nameDraft, setNameDraft] = useState(story.name);
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);

  const openEndpoint = (id: string) => {
    selectResource(id);
    setView("workspace");
  };

  return (
    <Box sx={{ maxWidth: 820, mx: "auto", px: { xs: 2, sm: 4 }, py: { xs: 2.5, sm: 3.5 } }}>
      {/* Header */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
        <AutoStoriesOutlinedIcon sx={{ fontSize: 22, color: "#8B7CF6" }} />
        <InputBase
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => renameStory(story.id, nameDraft)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          sx={{ flex: 1, fontSize: 24, fontWeight: 800, color: ink, "& input": { p: 0 } }}
        />
        <Tooltip title="Duplicate flow">
          <IconButton onClick={() => duplicateStory(story.id)}><ContentCopyIcon sx={{ fontSize: 18 }} /></IconButton>
        </Tooltip>
        <Tooltip title="Delete flow">
          <IconButton onClick={() => { if (window.confirm(`Delete "${story.name}"?`)) deleteStory(story.id); }} sx={{ color: "#D07A7A" }}>
            <DeleteOutlineIcon sx={{ fontSize: 19 }} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: secondaryText, mb: 3, pl: 4 }}>
        {story.steps.filter((s) => s.type === "endpoint").length} endpoints · ordered flow
      </Typography>

      {/* Steps */}
      {story.steps.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <PixelEmptyState pose="idle" title="No steps yet" subtitle="Add endpoints, notes, and section headers to build the flow." />
        </Box>
      ) : (
        <Stack spacing={0}>
          {story.steps.map((step, i) => (
            <Box key={step.id}>
              {i > 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 0.4 }}>
                  <SouthIcon sx={{ fontSize: 18, color: "#C9BFF3" }} />
                </Box>
              ) : null}
              <StepRow
                step={step}
                index={i}
                total={story.steps.length}
                resource={step.resourceId ? byId.get(step.resourceId) : undefined}
                onOpen={openEndpoint}
                onMove={(delta) => moveStep(story.id, step.id, delta)}
                onRemove={() => removeStep(story.id, step.id)}
                onUpdateText={(text) => updateStep(story.id, step.id, { text })}
              />
            </Box>
          ))}
        </Stack>
      )}

      {/* Add controls */}
      <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}>
        <AddButton icon={<ApiIcon sx={{ fontSize: 17 }} />} label="Add Endpoint" onClick={(e) => setAddAnchor(e.currentTarget)} />
        <AddButton icon={<TitleIcon sx={{ fontSize: 17 }} />} label="Add Section" onClick={() => addStep(story.id, { type: "section", text: "New section" })} />
        <AddButton icon={<NotesIcon sx={{ fontSize: 17 }} />} label="Add Note" onClick={() => addStep(story.id, { type: "note", text: "" })} />
      </Stack>

      <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)} slotProps={{ paper: { sx: { maxHeight: 360, width: 320 } } }}>
        {endpoints.length === 0 ? (
          <MenuItem disabled sx={{ fontSize: 13 }}>No endpoints in this workspace</MenuItem>
        ) : (
          endpoints.map((r) => (
            <MenuItem
              key={r.id}
              onClick={() => { addStep(story.id, { type: "endpoint", resourceId: r.id }); setAddAnchor(null); }}
              sx={{ fontSize: 13, gap: 1 }}
            >
              <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 800, fontSize: 11.5, color: methodColor[r.method ?? "GET"], minWidth: 46 }}>{r.method ?? "GET"}</Box>
              <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.path || r.name}</Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
}

function AddButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: (e: React.MouseEvent<HTMLElement>) => void }) {
  return (
    <Box
      role="button"
      onClick={onClick}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.85, borderRadius: "10px", border: `1.5px dashed ${line}`, bgcolor: "#fff", color: secondaryText, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s ease", "&:hover": { borderColor: "#8B7CF6", color: "#6D5DD3", bgcolor: pastel.purple } }}
    >
      {icon} {label}
    </Box>
  );
}

function StepControls({ index, total, onMove, onRemove }: { index: number; total: number; onMove: (d: number) => void; onRemove: () => void }) {
  return (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
      <Tooltip title="Move up"><span><IconButton size="small" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUpwardIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>
      <Tooltip title="Move down"><span><IconButton size="small" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDownwardIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>
      <Tooltip title="Remove step"><IconButton size="small" onClick={onRemove}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
    </Stack>
  );
}

function StepRow({
  step,
  index,
  total,
  resource,
  onOpen,
  onMove,
  onRemove,
  onUpdateText,
}: {
  step: StoryStep;
  index: number;
  total: number;
  resource: Resource | undefined;
  onOpen: (id: string) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onUpdateText: (text: string) => void;
}) {
  const controls = <StepControls index={index} total={total} onMove={onMove} onRemove={onRemove} />;

  if (step.type === "section") {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <TitleIcon sx={{ fontSize: 18, color: secondaryText }} />
        <InputBase
          defaultValue={step.text}
          onBlur={(e) => onUpdateText(e.target.value)}
          placeholder="Section header"
          sx={{ flex: 1, fontSize: 15, fontWeight: 800, color: ink, letterSpacing: "0.02em", textTransform: "uppercase" }}
        />
        {controls}
      </Stack>
    );
  }

  if (step.type === "note") {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <NotesIcon sx={{ fontSize: 18, color: secondaryText, mt: 1 }} />
        <TextField
          defaultValue={step.text}
          onBlur={(e) => onUpdateText(e.target.value)}
          placeholder="Write a note…"
          size="small"
          fullWidth
          multiline
          sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: 13, color: secondaryText } }}
        />
        <Box sx={{ mt: 0.5 }}>{controls}</Box>
      </Stack>
    );
  }

  // endpoint step
  if (!resource) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 1.5, py: 1.25, borderRadius: "12px", border: `1.5px dashed ${line}`, bgcolor: pastel.pink }}>
        <Typography sx={{ flex: 1, fontSize: 13, color: "#B4524F" }}>Endpoint no longer exists</Typography>
        {controls}
      </Stack>
    );
  }
  const method = resource.method ?? "GET";
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 1.5, py: 1.25, borderRadius: "12px", border: `1px solid ${line}`, bgcolor: "#fff", boxShadow: "0 1px 3px rgba(46,46,46,.05)", transition: "transform .12s ease, box-shadow .12s ease", "&:hover": { transform: "translateY(-1px)", boxShadow: "0 3px 10px rgba(46,46,46,.1)" } }}>
      <Box
        role="button"
        onClick={() => onOpen(resource.id)}
        sx={{ display: "flex", alignItems: "center", gap: 1.25, flex: 1, minWidth: 0, cursor: "pointer" }}
      >
        <Box component="span" sx={{ fontFamily: "monospace", fontSize: 12, fontWeight: 800, color: method === "GET" ? "#fff" : "#fff", bgcolor: methodColor[method], px: 0.9, py: 0.4, borderRadius: "6px", minWidth: 52, textAlign: "center" }}>{method}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: ink, lineHeight: 1.2 }}>{resource.name}</Typography>
          <Typography sx={{ fontFamily: "monospace", fontSize: 11.5, color: secondaryText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resource.path || "(no path)"}</Typography>
        </Box>
      </Box>
      <Tooltip title="Open in editor"><IconButton size="small" onClick={() => onOpen(resource.id)}><OpenInFullIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
      {controls}
    </Stack>
  );
}
