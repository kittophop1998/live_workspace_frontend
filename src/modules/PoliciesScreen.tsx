"use client";

import { Box, Card, Switch, Typography } from "@mui/material";
import { SectionTitle, StatusBadge } from "@/components/common";
import { useKingdomStore } from "@/lib/store";

// Rule-based automation — explicitly NOT AI/LLM (see Agents.md §3). Each rule is a
// deterministic when/then the backend evaluates every tick.
export function PoliciesScreen() {
  const policies = useKingdomStore((s) => s.policies);
  const togglePolicy = useKingdomStore((s) => s.togglePolicy);
  return (
    <Card sx={{ p: 1.5 }}>
      <SectionTitle icon="📐" title="Policy Rules" action={<StatusBadge tone="info">rule-based</StatusBadge>} />
      <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
        Simple if-this-then-that rules that run automatically each tick. No AI — just deterministic policy logic.
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {policies.map((p) => (
          <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.25, borderRadius: 3, border: "1px solid #EFE7D2", bgcolor: "#FFFFFF" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{p.name}</Typography>
                <StatusBadge tone={p.enabled ? "success" : "neutral"}>{p.enabled ? "active" : "off"}</StatusBadge>
              </Box>
              <Typography variant="caption" sx={{ display: "block", mt: 0.25 }}>
                {p.description}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontFamily: "monospace", color: "#857A6B" }}>
                WHEN {p.when.metric} {p.when.op} {p.when.value} → {p.then.action} {p.then.count ?? ""} {p.then.job ?? ""}
              </Typography>
            </Box>
            <Switch checked={p.enabled} onChange={() => togglePolicy(p.id)} color="primary" />
          </Box>
        ))}
      </Box>
    </Card>
  );
}
