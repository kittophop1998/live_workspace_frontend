"use client";

// API Graph — visualizes RELATIONSHIPS between endpoints. Each endpoint is a
// node; edges come from the client-side graph store (apiGraph.ts). Hand-built
// SVG canvas (no graph lib in the stack): pan, zoom, node drag, search,
// collapsible path-groups, and a node inspector. Selecting a node opens the
// existing endpoint editor — the graph never duplicates endpoint data.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, IconButton, InputBase, MenuItem, Select, Stack, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import AddRoadIcon from "@mui/icons-material/AddLink";
import ZoomInIcon from "@mui/icons-material/Add";
import ZoomOutIcon from "@mui/icons-material/Remove";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { useWorkspaceStore } from "@/lib/store";
import {
  RELATION_KINDS,
  RELATION_META,
  edgesForResource,
  endpointGroup,
  useApiGraphStore,
  type RelationKind,
} from "@/lib/apiGraph";
import { PixelEmptyState } from "@/components/pixel/PixelEmptyState";
import { ink, line, methodColor, pastel, secondaryText, wash } from "@/components/theme";
import type { Resource } from "@/lib/types";

const NODE_W = 208;
const NODE_H = 56;
const COL_GAP = 288;
const ROW_GAP = 92;
const MARGIN = 56;
const MIN_K = 0.35;
const MAX_K = 2.4;

const GROUP_COLORS = ["#8B7CF6", "#4A5DA8", "#4E8A46", "#B0703A", "#B4524F", "#3E8E9E", "#9A7418"];

type LaidNode = { id: string; x: number; y: number; resource: Resource; group: string; color: string };

export function ApiGraphView() {
  const resources = useWorkspaceStore((s) => s.resources);
  const select = useWorkspaceStore((s) => s.select);
  const setView = useWorkspaceStore((s) => s.setView);

  const edges = useApiGraphStore((s) => s.edges);
  const positions = useApiGraphStore((s) => s.positions);
  const collapsedGroups = useApiGraphStore((s) => s.collapsedGroups);
  const addEdge = useApiGraphStore((s) => s.addEdge);
  const removeEdge = useApiGraphStore((s) => s.removeEdge);
  const setPosition = useApiGraphStore((s) => s.setPosition);
  const toggleGroup = useApiGraphStore((s) => s.toggleGroup);

  const endpoints = useMemo(() => resources.filter((r) => r.kind === "endpoint"), [resources]);

  // ── Layout: columns per path-group; persisted drag positions override ──────
  const { nodes, groupList } = useMemo(() => {
    const groups = new Map<string, Resource[]>();
    for (const r of endpoints) {
      const g = endpointGroup(r.path);
      const arr = groups.get(g) ?? [];
      arr.push(r);
      groups.set(g, arr);
    }
    const groupKeys = [...groups.keys()].sort();
    const groupList = groupKeys.map((k, i) => ({
      key: k,
      count: groups.get(k)!.length,
      color: GROUP_COLORS[i % GROUP_COLORS.length],
      collapsed: Boolean(collapsedGroups[k]),
    }));
    const laid: LaidNode[] = [];
    groupKeys.forEach((k, gi) => {
      if (collapsedGroups[k]) return; // collapsed → hide members
      const color = GROUP_COLORS[gi % GROUP_COLORS.length];
      groups.get(k)!.forEach((r, ri) => {
        const def = { x: MARGIN + gi * COL_GAP, y: MARGIN + ri * ROW_GAP };
        const pos = positions[r.id] ?? def;
        laid.push({ id: r.id, x: pos.x, y: pos.y, resource: r, group: k, color });
      });
    });
    return { nodes: laid, groupList };
  }, [endpoints, positions, collapsedGroups]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const byId = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);

  // Only edges whose both ends are currently visible.
  const visibleEdges = useMemo(
    () => edges.filter((e) => nodeById.has(e.from) && nodeById.has(e.to)),
    [edges, nodeById],
  );

  // ── Camera (pan/zoom) ──────────────────────────────────────────────────────
  const [cam, setCam] = useState({ x: 40, y: 20, k: 0.9 });
  const [isPanning, setIsPanning] = useState(false);
  const camRef = useRef(cam);
  useEffect(() => {
    camRef.current = cam;
  }, [cam]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cursor-anchored wheel zoom (native listener → passive:false so we can prevent scroll).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const c = camRef.current;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const k = Math.min(MAX_K, Math.max(MIN_K, c.k * factor));
      // keep the world point under the cursor fixed
      const wx = (px - c.x) / c.k;
      const wy = (py - c.y) / c.k;
      setCam({ k, x: px - wx * k, y: py - wy * k });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Pointer drag: pan the canvas or drag a node.
  const drag = useRef<
    | { mode: "pan"; startX: number; startY: number; camX: number; camY: number }
    | { mode: "node"; id: string; startX: number; startY: number; origX: number; origY: number }
    | null
  >(null);
  const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null);

  const onPointerDownBg = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { mode: "pan", startX: e.clientX, startY: e.clientY, camX: cam.x, camY: cam.y };
    setIsPanning(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerDownNode = (e: React.PointerEvent, n: LaidNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (connect.active) {
      finishConnect(n.id);
      return;
    }
    setSelectedId(n.id);
    drag.current = { mode: "node", id: n.id, startX: e.clientX, startY: e.clientY, origX: n.x, origY: n.y };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "pan") {
      setCam((c) => ({ ...c, x: d.camX + (e.clientX - d.startX), y: d.camY + (e.clientY - d.startY) }));
    } else {
      const k = camRef.current.k;
      setLivePos({ id: d.id, x: d.origX + (e.clientX - d.startX) / k, y: d.origY + (e.clientY - d.startY) / k });
    }
  };

  const onPointerUp = () => {
    setIsPanning(false);
    const d = drag.current;
    if (d?.mode === "node" && livePos && livePos.id === d.id) {
      // commit only if actually moved (avoids clobbering on a plain click)
      if (Math.abs(livePos.x - d.origX) > 1 || Math.abs(livePos.y - d.origY) > 1) {
        setPosition(d.id, { x: livePos.x, y: livePos.y });
      }
    }
    drag.current = null;
    setLivePos(null);
  };

  const posOf = (n: LaidNode) => (livePos && livePos.id === n.id ? livePos : n);

  // ── Selection / search / connect ────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [connect, setConnect] = useState<{ active: boolean; kind: RelationKind }>({ active: false, kind: "related" });

  const matches = useCallback(
    (r: Resource) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.path ?? "").toLowerCase().includes(q) ||
        (r.method ?? "").toLowerCase().includes(q)
      );
    },
    [query],
  );

  // Center the camera on the first search hit.
  const focusMatch = () => {
    const hit = nodes.find((n) => matches(n.resource));
    if (!hit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const k = cam.k;
    setSelectedId(hit.id);
    setCam({ k, x: rect.width / 2 - (hit.x + NODE_W / 2) * k, y: rect.height / 2 - (hit.y + NODE_H / 2) * k });
  };

  const finishConnect = (targetId: string) => {
    if (selectedId && targetId !== selectedId) addEdge(selectedId, targetId, connect.kind);
    setConnect((c) => ({ ...c, active: false }));
  };

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 0;
    const cy = rect ? rect.height / 2 : 0;
    setCam((c) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, c.k * factor));
      const wx = (cx - c.x) / c.k;
      const wy = (cy - c.y) / c.k;
      return { k, x: cx - wx * k, y: cy - wy * k };
    });
  };

  const reset = () => setCam({ x: 40, y: 20, k: 0.9 });

  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined;
  const selectedResource = selectedId ? byId.get(selectedId) : undefined;

  return (
    <Box sx={{ position: "relative", height: "100%", width: "100%", overflow: "hidden", bgcolor: wash }}>
      <Box
        ref={containerRef}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        sx={{
          position: "absolute",
          inset: 0,
          cursor: connect.active ? "crosshair" : isPanning ? "grabbing" : "grab",
          touchAction: "none",
          backgroundImage: "radial-gradient(rgba(46,46,46,.07) 1px, transparent 1px)",
          backgroundSize: `${24 * cam.k}px ${24 * cam.k}px`,
          backgroundPosition: `${cam.x}px ${cam.y}px`,
        }}
      >
        {nodes.length === 0 ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
            <PixelEmptyState pose="reading" title="No endpoints to map yet" subtitle="Add or import endpoints in the Workspace, then connect them here." />
          </Box>
        ) : (
          <svg width="100%" height="100%" style={{ display: "block" }}>
            <defs>
              {RELATION_KINDS.map((k) => (
                <marker
                  key={k}
                  id={`arrow-${k}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill={RELATION_META[k].color} />
                </marker>
              ))}
            </defs>
            <g transform={`translate(${cam.x},${cam.y}) scale(${cam.k})`}>
              {/* Edges */}
              {visibleEdges.map((e) => {
                const s = posOf(nodeById.get(e.from)!);
                const t = posOf(nodeById.get(e.to)!);
                const sc = { x: s.x + NODE_W / 2, y: s.y + NODE_H / 2 };
                const tc = { x: t.x + NODE_W / 2, y: t.y + NODE_H / 2 };
                const dx = tc.x - sc.x;
                const dy = tc.y - sc.y;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len;
                const uy = dy / len;
                const m = Math.min(Math.abs((NODE_W / 2 + 6) / (ux || 1e-6)), Math.abs((NODE_H / 2 + 6) / (uy || 1e-6)));
                const x1 = sc.x + ux * m;
                const y1 = sc.y + uy * m;
                const x2 = tc.x - ux * m;
                const y2 = tc.y - uy * m;
                const meta = RELATION_META[e.kind];
                const dim = query.trim() !== "" && !(matches(byId.get(e.from)!) || matches(byId.get(e.to)!));
                return (
                  <line
                    key={e.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={meta.color}
                    strokeWidth={2}
                    strokeDasharray={meta.dashed ? "6 5" : undefined}
                    markerEnd={`url(#arrow-${e.kind})`}
                    opacity={dim ? 0.15 : 0.85}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((n) => {
                const p = posOf(n);
                const r = n.resource;
                const isSel = n.id === selectedId;
                const isMatch = matches(r);
                const dim = query.trim() !== "" && !isMatch;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x},${p.y})`}
                    style={{ cursor: connect.active ? "crosshair" : "grab" }}
                    opacity={dim ? 0.28 : 1}
                    onPointerDown={(e) => onPointerDownNode(e, n)}
                    onDoubleClick={() => {
                      select(n.id);
                      setView("workspace");
                    }}
                  >
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={12}
                      fill="#fff"
                      stroke={isSel ? n.color : line}
                      strokeWidth={isSel ? 2.5 : 1.5}
                      style={{ filter: "drop-shadow(0 2px 4px rgba(46,46,46,.08))" }}
                    />
                    <rect width={5} height={NODE_H} rx={2.5} fill={n.color} />
                    <text x={16} y={23} fontSize={11} fontWeight={800} fill={methodColor[r.method ?? "GET"]} style={{ fontFamily: "monospace" }}>
                      {r.method ?? "GET"}
                    </text>
                    <text x={54} y={23} fontSize={12.5} fontWeight={700} fill={ink}>
                      {r.name.length > 20 ? `${r.name.slice(0, 19)}…` : r.name}
                    </text>
                    <text x={16} y={42} fontSize={11} fill={secondaryText} style={{ fontFamily: "monospace" }}>
                      {(r.path ?? "").length > 30 ? `${(r.path ?? "").slice(0, 29)}…` : r.path || "(no path)"}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </Box>

      {/* ── Toolbar (top-left) ─────────────────────────────────────────────── */}
      <Stack spacing={1} sx={{ position: "absolute", top: 14, left: 14, zIndex: 4, maxWidth: 260 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "12px", px: 1, py: 0.4, boxShadow: "0 2px 8px rgba(46,46,46,.08)" }}>
          <SearchIcon sx={{ fontSize: 18, color: secondaryText }} />
          <InputBase
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && focusMatch()}
            placeholder="Search endpoint…"
            sx={{ fontSize: 13, flex: 1 }}
          />
          {query ? (
            <IconButton size="small" onClick={() => setQuery("")}>
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          ) : null}
        </Stack>

        <GroupsCard groupList={groupList} onToggle={toggleGroup} />
      </Stack>

      {/* ── Zoom controls (bottom-left) ────────────────────────────────────── */}
      <Stack direction="row" spacing={0.5} sx={{ position: "absolute", bottom: 14, left: 14, zIndex: 4, bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "12px", p: 0.4, boxShadow: "0 2px 8px rgba(46,46,46,.08)" }}>
        <Tooltip title="Zoom out"><IconButton size="small" onClick={() => zoomBy(1 / 1.2)}><ZoomOutIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
        <Box sx={{ px: 1, alignSelf: "center", fontSize: 12, fontWeight: 700, color: secondaryText, minWidth: 40, textAlign: "center" }}>{Math.round(cam.k * 100)}%</Box>
        <Tooltip title="Zoom in"><IconButton size="small" onClick={() => zoomBy(1.2)}><ZoomInIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
        <Tooltip title="Reset view"><IconButton size="small" onClick={reset}><CenterFocusStrongIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
      </Stack>

      {/* ── Legend (bottom-right) ──────────────────────────────────────────── */}
      <Box sx={{ position: "absolute", bottom: 14, right: 14, zIndex: 4, bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "12px", p: 1.25, boxShadow: "0 2px 8px rgba(46,46,46,.08)", display: { xs: "none", sm: "block" } }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: secondaryText, mb: 0.75, letterSpacing: "0.06em", textTransform: "uppercase" }}>Relationships</Typography>
        <Stack spacing={0.4}>
          {RELATION_KINDS.map((k) => (
            <Stack key={k} direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
              <Box sx={{ width: 18, height: 0, borderTop: `2px ${RELATION_META[k].dashed ? "dashed" : "solid"} ${RELATION_META[k].color}` }} />
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: ink }}>{RELATION_META[k].label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* ── Node inspector (top-right) ─────────────────────────────────────── */}
      {selectedNode && selectedResource ? (
        <NodeInspector
          resource={selectedResource}
          edges={edgesForResource(edges, selectedResource.id)}
          byId={byId}
          connect={connect}
          onSetKind={(kind) => setConnect((c) => ({ ...c, kind }))}
          onToggleConnect={() => setConnect((c) => ({ ...c, active: !c.active }))}
          onRemoveEdge={removeEdge}
          onOpenEditor={() => {
            select(selectedResource.id);
            setView("workspace");
          }}
          onOpenNode={(id) => setSelectedId(id)}
          onClose={() => {
            setSelectedId(null);
            setConnect((c) => ({ ...c, active: false }));
          }}
        />
      ) : null}
    </Box>
  );
}

function GroupsCard({
  groupList,
  onToggle,
}: {
  groupList: { key: string; count: number; color: string; collapsed: boolean }[];
  onToggle: (g: string) => void;
}) {
  const [open, setOpen] = useState(true);
  if (groupList.length === 0) return null;
  return (
    <Box sx={{ bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "12px", boxShadow: "0 2px 8px rgba(46,46,46,.08)", overflow: "hidden" }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", px: 1.1, py: 0.75, cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <LayersOutlinedIcon sx={{ fontSize: 16, color: secondaryText }} />
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: ink, flex: 1 }}>Groups</Typography>
        {open ? <UnfoldLessIcon sx={{ fontSize: 16, color: secondaryText }} /> : <UnfoldMoreIcon sx={{ fontSize: 16, color: secondaryText }} />}
      </Stack>
      {open ? (
        <Stack sx={{ px: 0.75, pb: 0.75, maxHeight: 220, overflowY: "auto" }}>
          {groupList.map((g) => (
            <Stack
              key={g.key}
              direction="row"
              spacing={0.75}
              onClick={() => onToggle(g.key)}
              sx={{ alignItems: "center", px: 0.75, py: 0.5, borderRadius: "8px", cursor: "pointer", "&:hover": { bgcolor: pastel.cream } }}
            >
              <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: g.color, opacity: g.collapsed ? 0.35 : 1 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: g.collapsed ? secondaryText : ink, flex: 1, textDecoration: g.collapsed ? "line-through" : "none" }}>
                /{g.key}
              </Typography>
              <Typography sx={{ fontSize: 11, color: secondaryText }}>{g.count}</Typography>
              {g.collapsed ? <OpenInFullIcon sx={{ fontSize: 13, color: secondaryText }} /> : <UnfoldLessIcon sx={{ fontSize: 14, color: secondaryText }} />}
            </Stack>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}

function NodeInspector({
  resource,
  edges,
  byId,
  connect,
  onSetKind,
  onToggleConnect,
  onRemoveEdge,
  onOpenEditor,
  onOpenNode,
  onClose,
}: {
  resource: Resource;
  edges: ReturnType<typeof edgesForResource>;
  byId: Map<string, Resource>;
  connect: { active: boolean; kind: RelationKind };
  onSetKind: (k: RelationKind) => void;
  onToggleConnect: () => void;
  onRemoveEdge: (id: string) => void;
  onOpenEditor: () => void;
  onOpenNode: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Box sx={{ position: "absolute", top: 14, right: 14, zIndex: 5, width: 288, maxWidth: "calc(100% - 28px)", maxHeight: "calc(100% - 28px)", overflowY: "auto", bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "14px", boxShadow: "0 8px 28px rgba(46,46,46,.16)", p: 1.75 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: ink, lineHeight: 1.2 }}>{resource.name}</Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 0.4 }}>
            <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: methodColor[resource.method ?? "GET"] }}>{resource.method ?? "GET"}</Box>
            <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11.5, color: secondaryText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resource.path || "(no path)"}</Box>
          </Stack>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
      </Stack>

      <Box
        role="button"
        onClick={onOpenEditor}
        sx={{ mt: 1.25, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 0.9, borderRadius: "10px", bgcolor: pastel.purple, color: "#6D5DD3", fontSize: 13, fontWeight: 800, cursor: "pointer", "&:hover": { bgcolor: "#E3DCFB" } }}
      >
        <OpenInFullIcon sx={{ fontSize: 15 }} /> Open in Endpoint Editor
      </Box>

      {/* Relationships list */}
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: secondaryText, mt: 2, mb: 0.75, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Relationships ({edges.length})
      </Typography>
      {edges.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: secondaryText }}>None yet.</Typography>
      ) : (
        <Stack spacing={0.5}>
          {edges.map((e) => {
            const outgoing = e.from === resource.id;
            const other = byId.get(outgoing ? e.to : e.from);
            if (!other) return null;
            const meta = RELATION_META[e.kind];
            return (
              <Stack key={e.id} direction="row" spacing={0.75} sx={{ alignItems: "center", px: 0.75, py: 0.5, borderRadius: "8px", "&:hover": { bgcolor: pastel.cream } }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: meta.color, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpenNode(other.id)}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {outgoing ? "→ " : "← "}{other.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: meta.color, fontWeight: 600 }}>{meta.label}</Typography>
                </Box>
                <IconButton size="small" onClick={() => onRemoveEdge(e.id)}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
              </Stack>
            );
          })}
        </Stack>
      )}

      {/* Connect controls */}
      <Stack spacing={0.75} sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${line}` }}>
        <Select size="small" value={connect.kind} onChange={(e) => onSetKind(e.target.value as RelationKind)} sx={{ fontSize: 12.5 }}>
          {RELATION_KINDS.map((k) => (
            <MenuItem key={k} value={k} sx={{ fontSize: 12.5, color: RELATION_META[k].color, fontWeight: 700 }}>{RELATION_META[k].label}</MenuItem>
          ))}
        </Select>
        <Box
          role="button"
          onClick={onToggleConnect}
          sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 0.8, borderRadius: "10px", border: `1.5px solid ${connect.active ? "#8B7CF6" : line}`, bgcolor: connect.active ? pastel.purple : "#fff", color: connect.active ? "#6D5DD3" : ink, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}
        >
          {connect.active ? <AddRoadIcon sx={{ fontSize: 16 }} /> : <AddIcon sx={{ fontSize: 16 }} />}
          {connect.active ? "Click a target node…" : "Add relationship"}
        </Box>
      </Stack>
    </Box>
  );
}
