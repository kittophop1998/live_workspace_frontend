"use client";

import { Box, Button, Card, Typography } from "@mui/material";
import { useKingdomStore } from "@/lib/store";
import { CitizenCard } from "./CitizenCard";
import { SectionTitle, StatusBadge } from "./common";

export function CitizenPanel() {
  const citizens = useKingdomStore((s) => s.citizens);
  const bulkAssignIdle = useKingdomStore((s) => s.bulkAssignIdle);
  const idleCount = citizens.filter((c) => c.status === "idle").length;

  return (
    <Card sx={{ p: 1.5 }}>
      <SectionTitle
        icon="👥"
        title="Citizens"
        action={<StatusBadge tone={idleCount ? "warning" : "neutral"}>{idleCount} idle</StatusBadge>}
      />
      {idleCount > 0 ? (
        <Box sx={{ display: "flex", gap: 0.75, mb: 1.25 }}>
          <Button size="small" variant="outlined" fullWidth onClick={() => bulkAssignIdle("farmer", idleCount)} sx={{ minHeight: 34, fontSize: 12 }}>
            🧑‍🌾 All → Farm
          </Button>
          <Button size="small" variant="outlined" fullWidth onClick={() => bulkAssignIdle("guard", idleCount)} sx={{ minHeight: 34, fontSize: 12 }}>
            🛡️ All → Guard
          </Button>
        </Box>
      ) : null}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: { lg: 440 }, overflowY: { lg: "auto" }, pr: { lg: 0.5 } }}>
        {citizens.map((c) => (
          <CitizenCard key={c.id} citizen={c} />
        ))}
        {!citizens.length ? <Typography variant="caption">No citizens yet.</Typography> : null}
      </Box>
    </Card>
  );
}
