"use client";

import { Box, Button, Card, Tooltip, Typography } from "@mui/material";
import { useKingdomStore } from "@/lib/store";
import { RESOURCE_META, type Building, type ResourceType } from "@/lib/types";
import { ProgressBar, StatusBadge, formatSec } from "./common";

const STATUS_TONE = { producing: "success", upgrading: "info", constructing: "warning", idle: "neutral" } as const;
const STATUS_LABEL = { producing: "Producing", upgrading: "Upgrading", constructing: "Building", idle: "Idle" } as const;

export function BuildingCard({ building }: { building: Building }) {
  const resources = useKingdomStore((s) => s.resources);
  const tasks = useKingdomStore((s) => s.tasks);
  const upgradeBuilding = useKingdomStore((s) => s.upgradeBuilding);

  const task = tasks.find((t) => t.targetBuildingId === building.id && t.status === "in_progress");
  const up = building.upgrade;
  const affordable = up ? (Object.entries(up.cost) as [ResourceType, number][]).every(([k, v]) => (resources.find((r) => r.type === k)?.amount ?? 0) >= v) : false;
  const busy = building.status === "upgrading" || building.status === "constructing";
  const maxed = !up;

  const costText = up
    ? (Object.entries(up.cost) as [ResourceType, number][]).map(([k, v]) => `${RESOURCE_META[k].icon}${v}`).join("  ")
    : "";

  return (
    <Card sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1, transition: "transform .15s ease, box-shadow .15s ease", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 22px rgba(59,48,38,0.1)" } }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ display: "flex", gap: 1, minWidth: 0 }}>
          <Box sx={{ width: 40, height: 40, display: "grid", placeItems: "center", fontSize: 24, borderRadius: 2.5, bgcolor: "#F6EFDD", border: "1px solid #E7DCC2", flexShrink: 0 }}>
            {building.icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }} noWrap>
              {building.name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
              <StatusBadge tone="warning">Lv.{building.level}</StatusBadge>
              <StatusBadge tone={STATUS_TONE[building.status]}>{STATUS_LABEL[building.status]}</StatusBadge>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {building.maxWorkers > 0 ? (
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            👷 {building.workers}/{building.maxWorkers}
          </Typography>
        ) : (
          <Typography variant="caption">—</Typography>
        )}
        {building.produces ? (
          <Typography variant="caption" sx={{ fontWeight: 800, color: RESOURCE_META[building.produces].color }}>
            +{building.productionPerMin} {RESOURCE_META[building.produces].icon}/min
          </Typography>
        ) : (
          <Typography variant="caption" sx={{ color: "#857A6B" }}>
            support
          </Typography>
        )}
      </Box>

      {task ? (
        <Box>
          <ProgressBar value={task.progress} color="#5B8DD9" height={6} />
          <Typography variant="caption" sx={{ mt: 0.25, display: "block" }}>
            ⏳ {formatSec(task.remainingSec)} left
          </Typography>
        </Box>
      ) : maxed ? (
        <Button size="small" disabled fullWidth variant="outlined" sx={{ minHeight: 34 }}>
          Max level
        </Button>
      ) : (
        <Tooltip title={busy ? "Busy" : affordable ? `Cost: ${costText}` : `Need more — ${costText}`} arrow>
          <span>
            <Button
              size="small"
              fullWidth
              variant={affordable ? "contained" : "outlined"}
              disabled={busy || !affordable}
              onClick={() => upgradeBuilding(building.id)}
              sx={{ minHeight: 34, fontSize: 12.5 }}
            >
              Upgrade → Lv.{up!.nextLevel}
            </Button>
          </span>
        </Tooltip>
      )}
      {!task && !maxed ? (
        <Typography variant="caption" sx={{ textAlign: "center", color: affordable ? "#857A6B" : "#C0413D", mt: -0.5 }}>
          {costText}
        </Typography>
      ) : null}
    </Card>
  );
}
