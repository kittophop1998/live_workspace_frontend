"use client";

import { Box, Stack, Tooltip, Typography } from "@mui/material";
import ApiIcon from "@mui/icons-material/Api";
import StorageIcon from "@mui/icons-material/Storage";
import AddIcon from "@mui/icons-material/Add";
import { useWorkspaceStore } from "@/lib/store";
import { MonoTag, StateBadge } from "@/components/common";
import { line, methodColor, stateColor } from "@/components/theme";
import type { Resource, ResourceKind } from "@/lib/types";

const GROUPS: { kind: ResourceKind; label: string; icon: React.ReactNode }[] = [
  { kind: "endpoint", label: "API Endpoints", icon: <ApiIcon sx={{ fontSize: 16 }} /> },
  { kind: "database", label: "Databases", icon: <StorageIcon sx={{ fontSize: 16 }} /> },
];

function StateDot({ state }: { state: Resource["state"] }) {
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        border: `2px solid ${line}`,
        bgcolor: stateColor[state].bg,
        flexShrink: 0,
      }}
    />
  );
}

function ResourceRow({ r }: { r: Resource }) {
  const selectedId = useWorkspaceStore((s) => s.selectedId);
  const select = useWorkspaceStore((s) => s.select);
  const active = r.id === selectedId;
  return (
    <Box
      role="button"
      onClick={() => select(r.id)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1,
        py: 0.85,
        mb: 0.5,
        borderRadius: "8px",
        cursor: "pointer",
        border: `2px solid ${active ? line : "transparent"}`,
        bgcolor: active ? "#fff" : "transparent",
        boxShadow: active ? "3px 3px 0 #0A0A0A" : "none",
        transition: "background .1s ease",
        "&:hover": { bgcolor: active ? "#fff" : "#E9E9EC" },
      }}
    >
      <StateDot state={r.state} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.name}
        </Typography>
        {r.kind === "endpoint" && r.path ? (
          <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 10.5, color: "#71717A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.path}
          </Typography>
        ) : null}
      </Box>
      {r.kind === "endpoint" && r.method ? (
        <MonoTag sx={{ color: methodColor[r.method], fontSize: 9.5, px: 0.5 }}>{r.method}</MonoTag>
      ) : null}
    </Box>
  );
}

export function LeftPanel() {
  const resources = useWorkspaceStore((s) => s.resources);
  const addResource = useWorkspaceStore((s) => s.addResource);

  // Quick legend of how many of each state exist across the workspace.
  const counts = resources.reduce(
    (acc, r) => ((acc[r.state] = (acc[r.state] ?? 0) + 1), acc),
    {} as Record<string, number>,
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", borderRight: `2px solid ${line}`, bgcolor: "#FAFAFA" }}>
      <Box sx={{ p: 2, borderBottom: `2px solid ${line}` }}>
        <Typography variant="h2">Explorer</Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
          <StateBadge state="ready" sx={{ opacity: counts.ready ? 1 : 0.4 }} />
          <StateBadge state="draft" sx={{ opacity: counts.draft ? 1 : 0.4 }} />
          <StateBadge state="breaking" sx={{ opacity: counts.breaking ? 1 : 0.4 }} />
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
        {GROUPS.map(({ kind, label, icon }) => {
          const items = resources.filter((r) => r.kind === kind);
          return (
            <Box key={kind} sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, mb: 0.75 }}>
                <Stack direction="row" spacing={0.75} sx={{ color: line, alignItems: "center" }}>
                  {icon}
                  <Typography variant="h3" sx={{ fontSize: 11 }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#A1A1AA" }}>
                    {items.length}
                  </Typography>
                </Stack>
                <Tooltip title={`New ${kind}`}>
                  <Box
                    role="button"
                    onClick={() => addResource(kind)}
                    sx={{ display: "flex", cursor: "pointer", color: "#71717A", "&:hover": { color: line } }}
                  >
                    <AddIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Tooltip>
              </Box>
              {items.length === 0 ? (
                <Typography sx={{ px: 1, fontSize: 12, color: "#A1A1AA", fontStyle: "italic" }}>None yet</Typography>
              ) : (
                items.map((r) => <ResourceRow key={r.id} r={r} />)
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
