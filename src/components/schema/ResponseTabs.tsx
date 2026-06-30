"use client";

import { useMemo, useState } from "react";
import { Box, Button, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
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

export function ResponseTabs({ resourceId, typeName }: { resourceId: string; typeName: string }) {
  const schemas = useResponseSchemaStore((s) => s.byResource[resourceId]);
  const addStatus = useResponseSchemaStore((s) => s.addStatus);
  const removeStatus = useResponseSchemaStore((s) => s.removeStatus);

  const sorted = useMemo(() => [...(schemas ?? [])].sort((a, b) => a.status - b.status), [schemas]);
  const [active, setActive] = useState<number | null>(null);
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);

  // Resolve the active tab during render — falls back to the first status when the
  // user's pick is gone (removed) or unset, so no setState-in-effect is needed.
  const current = (active !== null && sorted.find((s) => s.status === active)) || sorted[0] || null;
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
                  setActive(c.status);
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
        <Box sx={{ border: `2px solid ${line}`, borderRadius: "12px", bgcolor: "#fff", boxShadow: "3px 3px 0 #0A0A0A", overflow: "hidden" }}>
          {/* Status tab strip */}
          <Stack direction="row" sx={{ borderBottom: `2px solid ${line}`, bgcolor: "#FAFAFA", overflowX: "auto" }}>
            {sorted.map((s) => {
              const isActive = s.status === current?.status;
              const c = statusColor(s.status);
              return (
                <Box
                  key={s.status}
                  role="button"
                  onClick={() => setActive(s.status)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.5,
                    py: 1,
                    cursor: "pointer",
                    flexShrink: 0,
                    borderRight: `1.5px solid #E4E4E7`,
                    borderBottom: isActive ? `3px solid ${c}` : "3px solid transparent",
                    bgcolor: isActive ? "#fff" : "transparent",
                    "&:hover": { bgcolor: isActive ? "#fff" : "#F0F0F2" },
                  }}
                >
                  <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: c, border: `1px solid ${line}` }} />
                  <Typography sx={{ fontFamily: "var(--font-mono,monospace)", fontWeight: 800, fontSize: 13.5, color: c }}>
                    {s.status}
                  </Typography>
                  {s.description ? (
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#71717A" }}>{s.description}</Typography>
                  ) : null}
                  <Tooltip title="Remove this response">
                    <CloseIcon
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStatus(resourceId, s.status);
                      }}
                      sx={{ fontSize: 15, ml: 0.25, color: "#A1A1AA", "&:hover": { color: "#DC2626" } }}
                    />
                  </Tooltip>
                </Box>
              );
            })}
          </Stack>

          {current ? (
            <Box sx={{ p: 2, bgcolor: "#F9F9FA" }}>
              <SchemaWorkbench
                key={`${resourceId}::res::${current.status}`}
                scope={`${resourceId}::res::${current.status}`}
                seedFields={current.fields}
                typeName={`${typeName}Response${current.status}`}
              />
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
