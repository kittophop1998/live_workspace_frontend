"use client";

// API Graph — a "System Map", not a whiteboard. Three navigation levels:
//   L1  Feature Groups rail (left)     — pick one feature; never show every endpoint at once
//   L2  Graph of that group (center)   — pan/zoom/drag/auto-arrange/minimap/search/focus
//   L3  Endpoint Editor (existing)     — opened from the inspector; unchanged
// The endpoint (Resource) stays the single source of truth; the graph store only
// holds relationships, node positions and group membership (apiGraph.ts).
// Relationships are created by DRAGGING from one node to another (no dropdown).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, IconButton, InputBase, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ZoomInIcon from "@mui/icons-material/Add";
import ZoomOutIcon from "@mui/icons-material/Remove";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import AddLinkIcon from "@mui/icons-material/AddLink";
import { useWorkspaceStore } from "@/lib/store";
import { useApiStoryStore } from "@/lib/apiStory";
import {
  GROUP_COLORS,
  RELATION_KINDS,
  RELATION_META,
  groupIdFor,
  prettifyGroup,
  useApiGraphStore,
} from "@/lib/apiGraph";
import { RELATION_ICON } from "@/components/graph/relationIcons";
import { GraphInspector } from "@/components/graph/GraphInspector";
import { GraphMinimap } from "@/components/graph/GraphMinimap";
import { MARGIN, NODE_H, NODE_W, boundsOf, gridLayout, layeredLayout } from "@/components/graph/layout";
import { PixelEmptyState } from "@/components/pixel/PixelEmptyState";
import { ink, line, methodColor, pastel, secondaryText, wash } from "@/components/theme";
import type { Resource } from "@/lib/types";

const MIN_K = 0.35;
const MAX_K = 2.2;

type LaidNode = { id: string; x: number; y: number; resource: Resource; color: string };

export function ApiGraphView() {
  const resources = useWorkspaceStore((s) => s.resources);
  const select = useWorkspaceStore((s) => s.select);
  const setView = useWorkspaceStore((s) => s.setView);
  const me = useWorkspaceStore((s) => s.me);
  const actor = me?.name;
  const selectStory = useApiStoryStore((s) => s.select);

  const edges = useApiGraphStore((s) => s.edges);
  const positions = useApiGraphStore((s) => s.positions);
  const membership = useApiGraphStore((s) => s.membership);
  const addEdge = useApiGraphStore((s) => s.addEdge);
  const setPosition = useApiGraphStore((s) => s.setPosition);
  const setPositions = useApiGraphStore((s) => s.setPositions);
  const setGroup = useApiGraphStore((s) => s.setGroup);

  const endpoints = useMemo(() => resources.filter((r) => r.kind === "endpoint"), [resources]);
  const byId = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);

  // ── L1: feature groups (union of path-derived + membership overrides) ───────
  const groupList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of endpoints) {
      const g = groupIdFor(membership, r);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    const ids = [...counts.keys()].sort();
    return ids.map((id, i) => ({ id, label: prettifyGroup(id), count: counts.get(id) ?? 0, color: GROUP_COLORS[i % GROUP_COLORS.length] }));
  }, [endpoints, membership]);

  const groupsForInspector = useMemo(() => groupList.map((g) => ({ id: g.id, label: g.label, color: g.color })), [groupList]);

  // The user's picked group (null = none yet). The *effective* active group is
  // derived: fall back to the largest group so the map is never blank, and stay
  // valid as groups appear/disappear — no state-syncing effect needed.
  const [pickedGroupId, setPickedGroupId] = useState<string | null>(null);
  const activeGroupId = useMemo(() => {
    if (groupList.length === 0) return null;
    if (pickedGroupId && groupList.some((g) => g.id === pickedGroupId)) return pickedGroupId;
    return [...groupList].sort((a, b) => b.count - a.count)[0].id;
  }, [groupList, pickedGroupId]);

  const members = useMemo(
    () => (activeGroupId ? endpoints.filter((r) => groupIdFor(membership, r) === activeGroupId) : []),
    [endpoints, membership, activeGroupId],
  );
  const memberIds = useMemo(() => members.map((r) => r.id), [members]);
  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);

  // ── L2 layout: grid defaults, saved drag positions override ─────────────────
  const nodes: LaidNode[] = useMemo(() => {
    const grid = gridLayout(memberIds);
    const color = groupList.find((g) => g.id === activeGroupId)?.color ?? GROUP_COLORS[0];
    return members.map((r) => {
      const pos = positions[r.id] ?? grid[r.id] ?? { x: MARGIN, y: MARGIN };
      return { id: r.id, x: pos.x, y: pos.y, resource: r, color };
    });
  }, [members, memberIds, positions, groupList, activeGroupId]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Only edges fully inside the active group are drawn (spec: show one feature).
  const groupEdges = useMemo(() => edges.filter((e) => memberSet.has(e.from) && memberSet.has(e.to)), [edges, memberSet]);

  // ── Selection / focus / search ──────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState(false);

  // A selection is only "active" while it belongs to the current group (derived,
  // so switching groups drops a stale selection without a state-syncing effect).
  const activeSelectedId = selectedId && memberSet.has(selectedId) ? selectedId : null;

  const neighbors = useMemo(() => {
    if (!activeSelectedId) return null;
    const set = new Set<string>([activeSelectedId]);
    for (const e of groupEdges) {
      if (e.from === activeSelectedId) set.add(e.to);
      if (e.to === activeSelectedId) set.add(e.from);
    }
    return set;
  }, [activeSelectedId, groupEdges]);

  const matches = useCallback(
    (r: Resource) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || (r.path ?? "").toLowerCase().includes(q) || (r.method ?? "").toLowerCase().includes(q);
    },
    [query],
  );

  // dim = fade a node/edge (search miss OR focus-mode non-neighbor).
  const isDim = useCallback(
    (id: string) => {
      const r = byId.get(id);
      if (query.trim() && r && !matches(r)) return true;
      if (neighbors && !neighbors.has(id)) return true;
      return false;
    },
    [byId, query, matches, neighbors],
  );

  // ── Camera (pan/zoom) ───────────────────────────────────────────────────────
  const [cam, setCam] = useState({ x: 40, y: 20, k: 0.9 });
  const [isPanning, setIsPanning] = useState(false);
  const camRef = useRef(cam);
  useEffect(() => {
    camRef.current = cam;
  }, [cam]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fitView = useCallback((ns: { x: number; y: number }[]) => {
    const el = containerRef.current;
    if (!el || ns.length === 0) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const b = boundsOf(ns);
    const pad = 64;
    const k = Math.min(MAX_K, Math.max(MIN_K, Math.min((w - pad * 2) / Math.max(b.maxX - b.minX, 1), (h - pad * 2) / Math.max(b.maxY - b.minY, 1))));
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    setCam({ k, x: w / 2 - cx * k, y: h / 2 - cy * k });
  }, []);

  // Fit whenever the active group changes (or the canvas resizes).
  useEffect(() => {
    fitView(nodes.map((n) => ({ x: n.x, y: n.y })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId, size.w, size.h]);

  // Cursor-anchored wheel zoom (native listener → passive:false).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const c = camRef.current;
      const k = Math.min(MAX_K, Math.max(MIN_K, c.k * Math.exp(-e.deltaY * 0.0015)));
      const wx = (px - c.x) / c.k;
      const wy = (py - c.y) / c.k;
      setCam({ k, x: px - wx * k, y: py - wy * k });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Pointer: pan bg / drag node / drag-to-link ──────────────────────────────
  const drag = useRef<
    | { mode: "pan"; startX: number; startY: number; camX: number; camY: number }
    | { mode: "node"; id: string; startX: number; startY: number; origX: number; origY: number }
    | { mode: "link"; from: string }
    | null
  >(null);
  const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [linkLine, setLinkLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [linkHover, setLinkHover] = useState<string | null>(null);
  // Mirror of the in-progress link source, kept in state so render never reads
  // the drag ref (react-hooks/refs). null = not currently linking.
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ from: string; to: string; left: number; top: number } | null>(null);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const c = camRef.current;
    return { x: (clientX - rect.left - c.x) / c.k, y: (clientY - rect.top - c.y) / c.k };
  };

  const onPointerDownBg = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { mode: "pan", startX: e.clientX, startY: e.clientY, camX: cam.x, camY: cam.y };
    setIsPanning(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerDownNode = (e: React.PointerEvent, n: LaidNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelectedId(n.id);
    setHint(false);
    drag.current = { mode: "node", id: n.id, startX: e.clientX, startY: e.clientY, origX: n.x, origY: n.y };
    (containerRef.current as Element)?.setPointerCapture?.(e.pointerId);
  };

  const onPointerDownHandle = (e: React.PointerEvent, n: LaidNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    drag.current = { mode: "link", from: n.id };
    setLinkFrom(n.id);
    const p = toWorld(e.clientX, e.clientY);
    setLinkLine({ x1: n.x + NODE_W, y1: n.y + NODE_H / 2, x2: p.x, y2: p.y });
    (containerRef.current as Element)?.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "pan") {
      setCam((c) => ({ ...c, x: d.camX + (e.clientX - d.startX), y: d.camY + (e.clientY - d.startY) }));
    } else if (d.mode === "node") {
      const k = camRef.current.k;
      setLivePos({ id: d.id, x: d.origX + (e.clientX - d.startX) / k, y: d.origY + (e.clientY - d.startY) / k });
    } else {
      const src = nodeById.get(d.from);
      const p = toWorld(e.clientX, e.clientY);
      if (src) setLinkLine({ x1: src.x + NODE_W, y1: src.y + NODE_H / 2, x2: p.x, y2: p.y });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    const d = drag.current;
    if (d?.mode === "node" && livePos && livePos.id === d.id) {
      if (Math.abs(livePos.x - d.origX) > 1 || Math.abs(livePos.y - d.origY) > 1) setPosition(d.id, { x: livePos.x, y: livePos.y });
    }
    if (d?.mode === "link") {
      if (linkHover && linkHover !== d.from) setPicker({ from: d.from, to: linkHover, left: e.clientX, top: e.clientY });
      setLinkLine(null);
      setLinkHover(null);
      setLinkFrom(null);
    }
    drag.current = null;
    setLivePos(null);
  };

  const posOf = (n: LaidNode) => (livePos && livePos.id === n.id ? livePos : n);

  // ── Toolbar actions ─────────────────────────────────────────────────────────
  const autoArrange = () => {
    if (memberIds.length === 0) return;
    const laid = layeredLayout(memberIds, groupEdges);
    setPositions(laid);
    fitView(Object.values(laid));
  };

  const zoomBy = (factor: number) => {
    const w = size.w || 1;
    const h = size.h || 1;
    setCam((c) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, c.k * factor));
      const wx = (w / 2 - c.x) / c.k;
      const wy = (h / 2 - c.y) / c.k;
      return { k, x: w / 2 - wx * k, y: h / 2 - wy * k };
    });
  };

  const recenterOn = (worldX: number, worldY: number) => {
    setCam((c) => ({ ...c, x: size.w / 2 - worldX * c.k, y: size.h / 2 - worldY * c.k }));
  };

  const focusSearch = () => {
    const hit = nodes.find((n) => matches(n.resource));
    if (hit) {
      setSelectedId(hit.id);
      recenterOn(hit.x + NODE_W / 2, hit.y + NODE_H / 2);
    }
  };

  const selectedResource = activeSelectedId ? byId.get(activeSelectedId) : undefined;
  const totalEndpoints = endpoints.length;

  // ── Empty: no endpoints at all ──────────────────────────────────────────────
  if (totalEndpoints === 0) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 4, bgcolor: wash }}>
        <PixelEmptyState pose="reading" title="No endpoints to map yet" subtitle="Add or import endpoints in the Workspace, then group and connect them here." />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100%", width: "100%", overflow: "hidden", bgcolor: wash }}>
      {/* ── L1: Feature Groups rail ─────────────────────────────────────────── */}
      <GroupsRail
        groups={groupList}
        total={totalEndpoints}
        activeId={activeGroupId}
        onSelect={(id) => {
          setPickedGroupId(id);
          setSelectedId(null);
          setQuery("");
        }}
      />

      {/* ── L2: graph canvas ────────────────────────────────────────────────── */}
      <Box sx={{ position: "relative", flex: 1, minWidth: 0, overflow: "hidden" }}>
        <Box
          ref={containerRef}
          onPointerDown={onPointerDownBg}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          sx={{
            position: "absolute",
            inset: 0,
            cursor: linkFrom ? "crosshair" : isPanning ? "grabbing" : "grab",
            touchAction: "none",
            backgroundImage: "radial-gradient(rgba(46,46,46,.07) 1px, transparent 1px)",
            backgroundSize: `${24 * cam.k}px ${24 * cam.k}px`,
            backgroundPosition: `${cam.x}px ${cam.y}px`,
          }}
        >
          <svg width="100%" height="100%" style={{ display: "block" }}>
            <defs>
              {RELATION_KINDS.map((k) => (
                <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={RELATION_META[k].color} />
                </marker>
              ))}
            </defs>
            <g transform={`translate(${cam.x},${cam.y}) scale(${cam.k})`}>
              {/* Edges */}
              {groupEdges.map((e) => {
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
                const meta = RELATION_META[e.kind];
                const dim = isDim(e.from) || isDim(e.to);
                return (
                  <line
                    key={e.id}
                    x1={sc.x + ux * m}
                    y1={sc.y + uy * m}
                    x2={tc.x - ux * m}
                    y2={tc.y - uy * m}
                    stroke={meta.color}
                    strokeWidth={2}
                    strokeDasharray={meta.dashed ? "6 5" : undefined}
                    markerEnd={`url(#arrow-${e.kind})`}
                    opacity={dim ? 0.12 : 0.85}
                  />
                );
              })}

              {/* Live link line while dragging a new relationship */}
              {linkLine ? (
                <line x1={linkLine.x1} y1={linkLine.y1} x2={linkLine.x2} y2={linkLine.y2} stroke="#8B7CF6" strokeWidth={2} strokeDasharray="5 4" markerEnd="url(#arrow-related)" />
              ) : null}

              {/* Nodes */}
              {nodes.map((n) => {
                const p = posOf(n);
                const r = n.resource;
                const isSel = n.id === activeSelectedId;
                const dim = isDim(n.id);
                const linkTarget = !!linkFrom && linkHover === n.id && n.id !== linkFrom;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x},${p.y})`}
                    style={{ cursor: "grab" }}
                    opacity={dim ? 0.22 : 1}
                    onPointerDown={(e) => onPointerDownNode(e, n)}
                    onPointerEnter={() => {
                      if (linkFrom) setLinkHover(n.id);
                    }}
                    onPointerLeave={() => {
                      if (linkFrom) setLinkHover((h) => (h === n.id ? null : h));
                    }}
                    onDoubleClick={() => {
                      select(n.id);
                      setView("workspace");
                    }}
                  >
                    <rect width={NODE_W} height={NODE_H} rx={12} fill="#fff" stroke={isSel || linkTarget ? n.color : line} strokeWidth={isSel || linkTarget ? 2.5 : 1.5} style={{ filter: "drop-shadow(0 2px 4px rgba(46,46,46,.08))" }} />
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
                    {/* Drag-to-link handle */}
                    <circle cx={NODE_W} cy={NODE_H / 2} r={7} fill="#fff" stroke={n.color} strokeWidth={2} style={{ cursor: "crosshair" }} onPointerDown={(e) => onPointerDownHandle(e, n)} />
                    <circle cx={NODE_W} cy={NODE_H / 2} r={2.5} fill={n.color} pointerEvents="none" />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Empty state: group has endpoints but no relationships */}
          {groupEdges.length === 0 && members.length > 0 ? (
            <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <Box sx={{ pointerEvents: "auto", textAlign: "center", bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "16px", boxShadow: "0 8px 28px rgba(46,46,46,.12)", px: 4, py: 3.5, maxWidth: 340 }}>
                <HubOutlinedIcon sx={{ fontSize: 34, color: "#8B7CF6" }} />
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: ink, mt: 1 }}>This feature has no relationships yet</Typography>
                <Typography sx={{ fontSize: 12.5, color: secondaryText, mt: 0.5, lineHeight: 1.5 }}>
                  Drag from a node’s round handle to another node to connect them, then choose what the link means.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "center" }}>
                  <Box
                    role="button"
                    onClick={() => {
                      setSelectedId(memberIds[0]);
                      setHint(true);
                    }}
                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.8, borderRadius: "10px", bgcolor: pastel.purple, color: "#6D5DD3", fontSize: 12.5, fontWeight: 800, cursor: "pointer", "&:hover": { bgcolor: "#E3DCFB" } }}
                  >
                    <AddLinkIcon sx={{ fontSize: 16 }} /> Create Relationship
                  </Box>
                  <Tooltip title="Coming soon">
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.8, borderRadius: "10px", border: `1px dashed ${line}`, color: secondaryText, fontSize: 12.5, fontWeight: 700 }}>
                      <AutoFixHighIcon sx={{ fontSize: 16 }} /> Auto Suggest
                    </Box>
                  </Tooltip>
                </Stack>
              </Box>
            </Box>
          ) : null}
        </Box>

        {/* Top toolbar: search + auto-arrange */}
        <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 14, left: 14, right: 14, zIndex: 4, alignItems: "center", pointerEvents: "none" }}>
          <Stack direction="row" spacing={0.5} sx={{ pointerEvents: "auto", alignItems: "center", bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "12px", px: 1, py: 0.4, boxShadow: "0 2px 8px rgba(46,46,46,.08)", width: 240, maxWidth: "42%" }}>
            <SearchIcon sx={{ fontSize: 18, color: secondaryText }} />
            <InputBase value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && focusSearch()} placeholder="Search this feature…" sx={{ fontSize: 13, flex: 1 }} />
            {query ? <IconButton size="small" onClick={() => setQuery("")}><CloseIcon sx={{ fontSize: 15 }} /></IconButton> : null}
          </Stack>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Arrange nodes into a readable layout">
            <Box role="button" onClick={autoArrange} sx={{ pointerEvents: "auto", display: "inline-flex", alignItems: "center", gap: 0.6, bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "12px", px: 1.25, py: 0.7, boxShadow: "0 2px 8px rgba(46,46,46,.08)", fontSize: 12.5, fontWeight: 800, color: ink, cursor: "pointer", "&:hover": { bgcolor: pastel.cream } }}>
              <AutoFixHighIcon sx={{ fontSize: 17, color: "#8B7CF6" }} /> Auto Arrange
            </Box>
          </Tooltip>
        </Stack>

        {/* Focus-mode / link hint banner */}
        {hint || neighbors ? (
          <Box sx={{ position: "absolute", top: 62, left: "50%", transform: "translateX(-50%)", zIndex: 4, bgcolor: ink, color: "#fff", borderRadius: "999px", px: 1.75, py: 0.6, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 14px rgba(46,46,46,.25)" }}>
            {hint ? "Drag from a node’s handle ● to another node to link them" : "Focus mode — this endpoint and its direct connections"}
          </Box>
        ) : null}

        {/* Zoom controls (bottom-left) */}
        <Stack direction="row" spacing={0.5} sx={{ position: "absolute", bottom: 14, left: 14, zIndex: 4, bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "12px", p: 0.4, boxShadow: "0 2px 8px rgba(46,46,46,.08)" }}>
          <Tooltip title="Zoom out"><IconButton size="small" onClick={() => zoomBy(1 / 1.2)}><ZoomOutIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
          <Box sx={{ px: 1, alignSelf: "center", fontSize: 12, fontWeight: 700, color: secondaryText, minWidth: 40, textAlign: "center" }}>{Math.round(cam.k * 100)}%</Box>
          <Tooltip title="Zoom in"><IconButton size="small" onClick={() => zoomBy(1.2)}><ZoomInIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
          <Tooltip title="Fit to view"><IconButton size="small" onClick={() => fitView(nodes.map((n) => ({ x: n.x, y: n.y })))}><CenterFocusStrongIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
        </Stack>

        {/* Minimap (bottom-right) */}
        <Box sx={{ position: "absolute", bottom: 14, right: 14, zIndex: 4, display: { xs: "none", md: "block" } }}>
          <GraphMinimap nodes={nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, color: n.color }))} view={{ x: cam.x, y: cam.y, k: cam.k, w: size.w, h: size.h }} onRecenter={recenterOn} />
        </Box>

        {/* Legend (top-right, below toolbar — hidden while inspector is open) */}
        <Box sx={{ position: "absolute", top: 62, right: 14, zIndex: 3, bgcolor: "#fff", border: `1px solid ${line}`, borderRadius: "12px", p: 1.1, boxShadow: "0 2px 8px rgba(46,46,46,.08)", display: { xs: "none", lg: selectedResource ? "none" : "block" } }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: secondaryText, mb: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Relationships</Typography>
          <Stack spacing={0.4}>
            {RELATION_KINDS.map((k) => {
              const Icon = RELATION_ICON[k];
              return (
                <Stack key={k} direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                  <Icon sx={{ fontSize: 13, color: RELATION_META[k].color }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: ink }}>{RELATION_META[k].label}</Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Box>

      {/* ── L3 gateway: contextual inspector ────────────────────────────────── */}
      {selectedResource ? (
        <GraphInspector
          resource={selectedResource}
          byId={byId}
          groups={groupsForInspector}
          currentGroupId={groupIdFor(membership, selectedResource)}
          actor={actor}
          onOpenNode={(id) => {
            const g = byId.get(id);
            if (g && !memberSet.has(id)) setPickedGroupId(groupIdFor(membership, g));
            setSelectedId(id);
          }}
          onOpenEditor={() => {
            select(selectedResource.id);
            setView("workspace");
          }}
          onOpenStory={(storyId) => {
            selectStory(storyId);
            setView("story");
          }}
          onSetGroup={(groupId) => {
            setGroup(selectedResource.id, groupId, actor);
            setPickedGroupId(groupId);
          }}
          onClose={() => setSelectedId(null)}
        />
      ) : null}

      {/* Relationship-type picker after a drag-to-link */}
      <Menu open={!!picker} onClose={() => setPicker(null)} anchorReference="anchorPosition" anchorPosition={picker ? { top: picker.top, left: picker.left } : undefined}>
        {RELATION_KINDS.map((k) => {
          const Icon = RELATION_ICON[k];
          return (
            <MenuItem
              key={k}
              onClick={() => {
                if (picker) addEdge(picker.from, picker.to, k, undefined, actor);
                setPicker(null);
              }}
              sx={{ fontSize: 13, gap: 1 }}
            >
              <Icon sx={{ fontSize: 17, color: RELATION_META[k].color }} />
              <Box component="span" sx={{ fontWeight: 700, color: RELATION_META[k].color }}>{RELATION_META[k].label}</Box>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}

function GroupsRail({
  groups,
  total,
  activeId,
  onSelect,
}: {
  groups: { id: string; label: string; count: number; color: string }[];
  total: number;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Box sx={{ width: 224, flexShrink: 0, height: "100%", borderRight: `1px solid ${line}`, bgcolor: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", px: 1.75, py: 1.5, borderBottom: `1px solid ${line}` }}>
        <HubOutlinedIcon sx={{ fontSize: 18, color: "#8B7CF6" }} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: ink, flex: 1 }}>Feature Groups</Typography>
        <Typography sx={{ fontSize: 11.5, color: secondaryText }}>{total}</Typography>
      </Stack>
      <Stack sx={{ flex: 1, overflowY: "auto", p: 1 }} spacing={0.25}>
        {groups.map((g) => {
          const active = g.id === activeId;
          return (
            <Stack
              key={g.id}
              direction="row"
              spacing={1}
              onClick={() => onSelect(g.id)}
              sx={{ alignItems: "center", px: 1.25, py: 1, borderRadius: "10px", cursor: "pointer", bgcolor: active ? pastel.purple : "transparent", "&:hover": { bgcolor: active ? pastel.purple : pastel.cream } }}
            >
              <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: g.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? "#6D5DD3" : ink, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {g.label}
              </Typography>
              <Box sx={{ px: 0.75, py: 0.1, borderRadius: "999px", bgcolor: active ? "#fff" : pastel.cream, fontSize: 11, fontWeight: 700, color: secondaryText }}>{g.count}</Box>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
