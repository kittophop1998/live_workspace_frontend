"use client";

import { useMemo, useState } from "react";
import { Box, Button, Collapse, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { useResponseSchemaStore } from "@/lib/responseSchemas";
import { SchemaWorkbench } from "@/components/schema/SchemaWorkbench";
import { line } from "@/components/theme";

const COMMON_STATUSES: { status: number; description: string }[] = [
  { status: 200, description: "OK" },
  { status: 201, description: "Created" },
  { status: 204, description: "No Content" },
  { status: 400, description: "Bad Request" },
  { status: 401, description: "Unauthorized" },
  { status: 403, description: "Forbidden" },
  { status: 404, description: "Not Found" },
  { status: 409, description: "Conflict" },
  { status: 422, description: "Unprocessable Entity" },
  { status: 500, description: "Server Error" },
];

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "#16A34A";
  if (status >= 400 && status < 500) return "#D97706";
  if (status >= 500) return "#DC2626";
  return "#52525B";
}

export function ResponseAccordions({ resourceId }: { resourceId: string }) {
  const schemas = useResponseSchemaStore((s) => s.byResource[resourceId]);
  const addStatus = useResponseSchemaStore((s) => s.addStatus);
  const removeStatus = useResponseSchemaStore((s) => s.removeStatus);

  const sorted = useMemo(() => [...(schemas ?? [])].sort((a, b) => a.status - b.status), [schemas]);
  const [open, setOpen] = useState<Set<number>>(() => new Set(sorted[0] ? [sorted[0].status] : []));
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);

  const toggle = (status: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  const available = COMMON_STATUSES.filter((c) => !sorted.some((s) => s.status === c.status));

  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" sx={{ alignItems: "center", mb: 1.5 }}>
        <Typography variant="h2" sx={{ flex: 1 }}>Responses</Typography>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={(e) => setMenuEl(e.currentTarget)}>
          Add response
        </Button>
        <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
          {available.length === 0 ? (
            <MenuItem disabled>All common statuses added</MenuItem>
          ) : (
            available.map((c) => (
              <MenuItem
                key={c.status}
                onClick={() => {
                  addStatus(resourceId, c.status, c.description);
                  setOpen((s) => new Set(s).add(c.status));
                  setMenuEl(null);
                }}
                sx={{ gap: 1, fontFamily: "var(--font-mono,monospace)", fontWeight: 700 }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: statusColor(c.status) }} />
                {c.status} — {c.description}
              </MenuItem>
            ))
          )}
        </Menu>
      </Stack>

      {sorted.length === 0 ? (
        <Box sx={{ p: 3, textAlign: "center", color: "#A1A1AA", fontSize: 13, border: "1.5px dashed #D4D4D8", borderRadius: "12px" }}>
          No responses defined. Add a status above, or import an OpenAPI / Postman spec.
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {sorted.map((s) => {
            const isOpen = open.has(s.status);
            const c = statusColor(s.status);
            return (
              <Box key={s.status} sx={{ border: `2px solid ${line}`, borderRadius: "12px", bgcolor: "#fff", boxShadow: "3px 3px 0 #0A0A0A", overflow: "hidden" }}>
                <Box
                  role="button"
                  onClick={() => toggle(s.status)}
                  sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25, cursor: "pointer", userSelect: "none", borderBottom: isOpen ? `2px solid ${line}` : "none" }}
                >
                  <ExpandMoreIcon sx={{ transition: "transform .15s ease", transform: isOpen ? "none" : "rotate(-90deg)" }} />
                  <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: c, border: `1px solid ${line}` }} />
                  <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 800, fontSize: 14, color: c }}>{s.status}</Typography>
                  {s.description ? <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#52525B" }}>{s.description}</Typography> : null}
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Remove this response">
                    <CloseIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStatus(resourceId, s.status);
                      }}
                      sx={{ fontSize: 16, color: "#A1A1AA", "&:hover": { color: "#DC2626" } }}
                    />
                  </Tooltip>
                </Box>
                <Collapse in={isOpen} unmountOnExit>
                  <Box sx={{ p: 2, bgcolor: "#F9F9FA" }}>
                    <SchemaWorkbench scope={`${resourceId}::res::${s.status}`} seedFields={s.fields} />
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
