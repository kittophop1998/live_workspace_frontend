"use client";

import { Box, Button, Card, Typography } from "@mui/material";
import { useKingdomStore } from "@/lib/store";
import { RESOURCE_META, type EventEffect, type GameEvent, type ResourceType } from "@/lib/types";
import { SectionTitle, StatusBadge, formatSec, useNow } from "./common";

const SEV_TONE = { info: "info", warning: "warning", danger: "danger" } as const;
const SEV_BORDER = { info: "#5B8DD9", warning: "#E8A23C", danger: "#D9534F" } as const;

function effectText(e: EventEffect): string {
  const sign = e.delta >= 0 ? "+" : "";
  if (e.resource) return `${sign}${e.delta} ${RESOURCE_META[e.resource].icon}`;
  if (e.stat) return `${sign}${e.delta} ${e.stat.replace("_", " ")}`;
  return "";
}

export function EventPanel() {
  const events = useKingdomStore((s) => s.events);
  return (
    <Card sx={{ p: 1.5 }}>
      <SectionTitle icon="📜" title="Events" action={<StatusBadge tone={events.length ? "danger" : "neutral"}>{events.length}</StatusBadge>} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
        {!events.length ? (
          <Typography variant="caption" sx={{ textAlign: "center", py: 1 }}>
            All quiet in the kingdom. 🌤️
          </Typography>
        ) : null}
      </Box>
    </Card>
  );
}

function EventCard({ event }: { event: GameEvent }) {
  const resources = useKingdomStore((s) => s.resources);
  const kingdom = useKingdomStore((s) => s.kingdom);
  const resolveEvent = useKingdomStore((s) => s.resolveEvent);
  const now = useNow();
  const remaining = Math.max(0, (new Date(event.expiresAt).getTime() - now) / 1000);

  const canChoose = (req?: GameEvent["choices"][number]["requires"]): boolean => {
    if (!req) return true;
    return (Object.entries(req) as [ResourceType | "defense", number][]).every(([k, v]) =>
      k === "defense" ? (kingdom?.stats.defense ?? 0) >= v : (resources.find((r) => r.type === k)?.amount ?? 0) >= v,
    );
  };

  return (
    <Box sx={{ p: 1.25, borderRadius: 3, border: "1px solid #EFE7D2", borderLeft: `4px solid ${SEV_BORDER[event.severity]}`, bgcolor: "#FFFFFF" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{event.title}</Typography>
        <StatusBadge tone={SEV_TONE[event.severity]}>⏳ {formatSec(remaining)}</StatusBadge>
      </Box>
      <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
        {event.description}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {event.choices.map((c) => {
          const ok = canChoose(c.requires);
          return (
            <Button
              key={c.id}
              size="small"
              variant={ok ? "contained" : "outlined"}
              disabled={!ok}
              onClick={() => resolveEvent(event.id, c.id)}
              sx={{ minHeight: 34, justifyContent: "space-between", fontSize: 12.5, px: 1.25 }}
            >
              <span>{c.label}</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{c.effects.map(effectText).join(" ")}</span>
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}
