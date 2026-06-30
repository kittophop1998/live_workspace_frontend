"use client";

import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useKingdomStore } from "@/lib/store";
import { RESOURCE_META, type Resource, type ResourceType } from "@/lib/types";
import { AnimatedNumber } from "./common";

type Floater = { id: number; resource: ResourceType; amount: number };

export function ResourceBar() {
  const resources = useKingdomStore((s) => s.resources);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  useEffect(() => {
    const onGain = (e: Event) => {
      const detail = (e as CustomEvent<Partial<Record<ResourceType, number>>>).detail ?? {};
      const next = (Object.entries(detail) as [ResourceType, number][])
        .filter(([, v]) => v > 0)
        .map(([resource, amount]) => ({ id: Date.now() + Math.random(), resource, amount }));
      if (!next.length) return;
      setFloaters((cur) => [...cur, ...next]);
      next.forEach((f) => setTimeout(() => setFloaters((cur) => cur.filter((x) => x.id !== f.id)), 1100));
    };
    window.addEventListener("kingdom:gain", onGain);
    return () => window.removeEventListener("kingdom:gain", onGain);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        overflowX: "auto",
        px: { xs: 1.5, lg: 2 },
        py: 1.25,
        bgcolor: "rgba(255,253,246,0.92)",
        backdropFilter: "blur(6px)",
        borderBottom: "1px solid #E7DCC2",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {resources.map((r) => (
        <ResourceChip key={r.type} resource={r} floater={floaters.find((f) => f.resource === r.type)} />
      ))}
    </Box>
  );
}

function ResourceChip({ resource, floater }: { resource: Resource; floater?: Floater }) {
  const meta = RESOURCE_META[resource.type];
  const pct = resource.capacity ? Math.min(1, resource.amount / resource.capacity) : 0;
  const rateColor = resource.ratePerMin >= 0 ? "#4F8A3E" : "#C0413D";
  return (
    <Box
      sx={{
        position: "relative",
        flex: "1 0 auto",
        minWidth: 116,
        px: 1.25,
        py: 0.75,
        borderRadius: 2.5,
        border: "1px solid #EFE7D2",
        bgcolor: "#FFFFFF",
      }}
    >
      {floater ? (
        <Typography
          sx={{
            position: "absolute",
            top: -2,
            right: 8,
            fontSize: 12,
            fontWeight: 800,
            color: meta.color,
            animation: "float-up 1.1s ease-out forwards",
            pointerEvents: "none",
          }}
        >
          +{floater.amount}
        </Typography>
      ) : null}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15, lineHeight: 1.1 }}>
            <AnimatedNumber value={resource.amount} />
          </Typography>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: rateColor, lineHeight: 1.2 }}>
            {resource.ratePerMin >= 0 ? "+" : ""}
            {resource.ratePerMin}/min
          </Typography>
        </Box>
      </Box>
      {resource.capacity ? (
        <Box sx={{ mt: 0.5, height: 3, borderRadius: 999, bgcolor: "#EFE7D2", overflow: "hidden" }}>
          <Box sx={{ height: "100%", width: `${pct * 100}%`, bgcolor: meta.color, transition: "width .4s ease" }} />
        </Box>
      ) : null}
    </Box>
  );
}
