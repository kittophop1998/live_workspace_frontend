"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { JsonView } from "@/components/schema/JsonView";
import { MonoTag } from "@/components/common";
import { line, methodColor } from "@/components/theme";
import type { FlowDefinition, FlowStep } from "@/lib/types";

function StepCard({ step, index }: { step: FlowStep; index: number }) {
  const method = step.method || "";
  const target = step.path || (step.operationId ? `operationId: ${step.operationId}` : "(unresolved)");
  return (
    <Box sx={{ border: `2px solid ${line}`, borderRadius: "12px", bgcolor: "#fff", p: 1.5, boxShadow: "2px 2px 0 #0A0A0A" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Box sx={{ width: 24, height: 24, borderRadius: "6px", bgcolor: line, color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {index + 1}
        </Box>
        <Typography sx={{ fontWeight: 800 }}>{step.stepId}</Typography>
        {method ? <MonoTag sx={{ color: methodColor[method] ?? line }}>{method}</MonoTag> : null}
        <MonoTag>{target}</MonoTag>
      </Stack>
      {step.description ? (
        <Typography variant="body2" sx={{ color: "#52525B", mt: 0.75 }}>{step.description}</Typography>
      ) : null}

      {step.dependsOn.length ? (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="caption" sx={{ color: "#71717A" }}>depends on</Typography>
          {step.dependsOn.map((dep) => (
            <Chip key={dep} size="small" variant="outlined" label={dep} sx={{ height: 20 }} />
          ))}
        </Stack>
      ) : null}

      {step.parameters.length ? (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#52525B" }}>Parameters</Typography>
          {step.parameters.map((p, i) => (
            <Stack key={i} direction="row" spacing={0.5} sx={{ alignItems: "center", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
              <Chip size="small" label={p.in} sx={{ height: 18, fontSize: 10 }} />
              <Box component="span" sx={{ color: "#2563EB" }}>{p.name}</Box>
              <Box component="span" sx={{ color: "#71717A" }}>=</Box>
              <Box component="span">{String(p.value ?? "")}</Box>
            </Stack>
          ))}
        </Box>
      ) : null}

      {step.requestBody !== undefined && step.requestBody !== null ? (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#52525B" }}>Request body</Typography>
          <Box sx={{ mt: 0.5 }}><JsonView code={JSON.stringify(step.requestBody, null, 2)} maxHeight={160} /></Box>
        </Box>
      ) : null}

      {step.outputs.length ? (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#52525B" }}>Outputs</Typography>
          {step.outputs.map((o) => (
            <Box key={o.name} sx={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
              <Box component="span" sx={{ color: "#16A34A", fontWeight: 700 }}>{o.name}</Box>
              <Box component="span" sx={{ color: "#71717A" }}> ← {o.from}</Box>
            </Box>
          ))}
        </Box>
      ) : null}

      {step.successCriteria.length ? (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#52525B" }}>Validation</Typography>
          {step.successCriteria.map((c, i) => (
            <Box key={i} sx={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "#18181B" }}>
              {c.context ? <Box component="span" sx={{ color: "#7C3AED" }}>{c.context} </Box> : null}
              {c.condition}{c.type ? <Box component="span" sx={{ color: "#71717A" }}> ({c.type})</Box> : null}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

// Read-only rendering of a parsed/saved workflow: name, description, inputs, and
// the ordered step chain. Shared by the upload preview and the saved-flow detail.
export function FlowDefinitionView({ flow }: { flow: FlowDefinition }) {
  return (
    <Box>
      <Typography variant="h2">{flow.name}</Typography>
      {flow.description ? (
        <Typography variant="body2" sx={{ color: "#52525B", mt: 0.5 }}>{flow.description}</Typography>
      ) : null}

      {flow.inputs.length ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Input variables
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
            {flow.inputs.map((v) => (
              <Chip key={v.name} size="small" variant="outlined" label={v.name} sx={{ height: 22 }} />
            ))}
          </Stack>
        </Box>
      ) : null}

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {flow.steps.length} step{flow.steps.length === 1 ? "" : "s"} (execution order)
        </Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {flow.steps.map((step, i) => (
            <Box key={step.id ?? step.stepId}>
              <StepCard step={step} index={i} />
              {i < flow.steps.length - 1 ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 0.25, color: "#A1A1AA" }}>
                  <ArrowForwardIcon sx={{ fontSize: 16, transform: "rotate(90deg)" }} />
                </Box>
              ) : null}
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
