"use client";

import { Box, MenuItem, Select, Typography } from "@mui/material";
import { useKingdomStore } from "@/lib/store";
import { JOB_META, type Citizen, type JobType } from "@/lib/types";
import { ProgressBar } from "./common";

const STATUS_DOT: Record<Citizen["status"], string> = { working: "#6FAE5E", resting: "#5B8DD9", idle: "#C4BAA6", sick: "#D9534F" };
const JOBS: JobType[] = ["farmer", "lumberjack", "miner", "guard", "builder", "idle"];

export function CitizenCard({ citizen }: { citizen: Citizen }) {
  const assignCitizen = useKingdomStore((s) => s.assignCitizen);
  return (
    <Box sx={{ p: 1.25, borderRadius: 3, border: "1px solid #EFE7D2", bgcolor: "#FFFFFF" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ position: "relative", width: 34, height: 34, display: "grid", placeItems: "center", fontSize: 20, borderRadius: 2, bgcolor: "#F6EFDD", flexShrink: 0 }}>
          {citizen.avatar}
          <Box sx={{ position: "absolute", bottom: -2, right: -2, width: 10, height: 10, borderRadius: "50%", bgcolor: STATUS_DOT[citizen.status], border: "2px solid #fff" }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13.5 }} noWrap>
              {citizen.name}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Lv.{citizen.level}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ textTransform: "capitalize" }}>
            {citizen.status} · {JOB_META[citizen.job].label}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 10, color: "#857A6B", mb: 0.25 }}>⚡ Energy</Typography>
          <ProgressBar value={citizen.energy / 100} color="#E8A23C" height={5} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 10, color: "#857A6B", mb: 0.25 }}>😊 Happy</Typography>
          <ProgressBar value={citizen.happiness / 100} color="#6FAE5E" height={5} />
        </Box>
      </Box>

      <Select
        size="small"
        value={citizen.job}
        onChange={(e) => assignCitizen(citizen.id, e.target.value as JobType)}
        fullWidth
        sx={{ mt: 1, fontSize: 12.5, "& .MuiSelect-select": { py: 0.5 } }}
      >
        {JOBS.map((j) => (
          <MenuItem key={j} value={j} sx={{ fontSize: 13 }}>
            {JOB_META[j].icon} {JOB_META[j].label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
