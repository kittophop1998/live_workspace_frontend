"use client";

import { useState } from "react";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { NODE_TYPES, type NodeType, type SchemaNode } from "@/lib/schemaTree";
import { useSchemaTreeStore } from "@/lib/schemaTree";
import { TypeIcon } from "@/components/schema/typeMeta";
import { line } from "@/components/theme";
import type { JsonValue } from "@/lib/types";

function parseJsonish(raw: string): JsonValue | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t) as JsonValue;
  } catch {
    return t; // fall back to a raw string literal
  }
}

function jsonish(v: JsonValue | undefined): string {
  if (v === undefined) return "";
  return typeof v === "string" ? v : JSON.stringify(v);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94A3B8", mb: 0.75 }}>
      {children}
    </Typography>
  );
}

const inputSx = {
  "& .MuiOutlinedInput-root": { fontSize: 13.5 },
  "& .MuiOutlinedInput-input": { py: 1 },
} as const;

function DetailForm({ scope, node, onClose }: { scope: string; node: SchemaNode; onClose: () => void }) {
  const updateNode = useSchemaTreeStore((s) => s.updateNode);
  const addArrayItem = useSchemaTreeStore((s) => s.addArrayItem);

  const [key, setKey] = useState(node.key);
  const [description, setDescription] = useState(node.description ?? "");
  const [example, setExample] = useState(jsonish(node.example));
  const [defaultVal, setDefaultVal] = useState(jsonish(node.default));
  const [enumVal, setEnumVal] = useState((node.enumValues ?? []).join(", "));
  const v = node.validation ?? {};

  const patch = (p: Partial<SchemaNode>) => updateNode(scope, node.id, p);
  const patchValidation = (p: Partial<NonNullable<SchemaNode["validation"]>>) =>
    patch({ validation: { ...v, ...p } });

  const isString = node.type === "string" || node.type === "uuid" || node.type === "timestamp";
  const isNumeric = node.type === "number" || node.type === "integer";

  const setItemType = (t: NodeType) => {
    const itemsId = node.items?.id ?? addArrayItem(scope, node.id);
    updateNode(scope, itemsId, { type: t });
  };

  return (
    <Box sx={{ width: { xs: "100%", md: 384 }, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, py: 2, borderBottom: `1px solid ${line}` }}>
        <TypeIcon type={node.type} />
        <Typography variant="h2" sx={{ fontFamily: "var(--font-mono,monospace)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
          {node.key}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* identity */}
        <Box>
          <SectionLabel>Field name</SectionLabel>
          <TextField
            fullWidth
            size="small"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onBlur={() => key.trim() && key !== node.key ? patch({ key: key.trim() }) : setKey(node.key)}
            sx={{ ...inputSx, "& input": { fontFamily: "var(--font-mono,monospace)", fontWeight: 700 } }}
          />
        </Box>

        <Box>
          <SectionLabel>Type</SectionLabel>
          <Select fullWidth size="small" value={node.type} onChange={(e) => patch({ type: e.target.value as NodeType })} sx={inputSx}>
            {NODE_TYPES.map((t) => (
              <MenuItem key={t} value={t} sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 13 }}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {node.type === "array" ? (
          <Box>
            <SectionLabel>Array item type</SectionLabel>
            <Select fullWidth size="small" value={node.items?.type ?? "string"} onChange={(e) => setItemType(e.target.value as NodeType)} sx={inputSx}>
              {NODE_TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ fontFamily: "var(--font-mono,monospace)", fontSize: 13 }}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </Box>
        ) : null}

        <Stack direction="row" spacing={3}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch checked={node.required} onChange={(e) => patch({ required: e.target.checked })} />
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Required</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch checked={Boolean(node.nullable)} onChange={(e) => patch({ nullable: e.target.checked || undefined })} />
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Nullable</Typography>
          </Box>
        </Stack>

        <Divider />

        <Box>
          <SectionLabel>Description</SectionLabel>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            placeholder="What this field represents…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => patch({ description: description.trim() || undefined })}
            sx={inputSx}
          />
        </Box>

        {node.type === "enum" ? (
          <Box>
            <SectionLabel>Enum values (comma-separated)</SectionLabel>
            <TextField
              fullWidth
              size="small"
              placeholder="active, pending, archived"
              value={enumVal}
              onChange={(e) => setEnumVal(e.target.value)}
              onBlur={() => patch({ enumValues: enumVal.split(",").map((s) => s.trim()).filter(Boolean) })}
              sx={inputSx}
            />
          </Box>
        ) : null}

        <Stack direction="row" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <SectionLabel>Example</SectionLabel>
            <TextField fullWidth size="small" placeholder="sample value" value={example} onChange={(e) => setExample(e.target.value)} onBlur={() => patch({ example: parseJsonish(example) })} sx={inputSx} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <SectionLabel>Default</SectionLabel>
            <TextField fullWidth size="small" placeholder="default" value={defaultVal} onChange={(e) => setDefaultVal(e.target.value)} onBlur={() => patch({ default: parseJsonish(defaultVal) })} sx={inputSx} />
          </Box>
        </Stack>

        <Divider />

        <Box>
          <SectionLabel>Validation</SectionLabel>
          <Stack spacing={1.5}>
            {isString ? (
              <Stack direction="row" spacing={2}>
                <TextField fullWidth size="small" type="number" label="Min length" slotProps={{ inputLabel: { shrink: true } }} value={v.minLength ?? ""} onChange={(e) => patchValidation({ minLength: e.target.value === "" ? undefined : Number(e.target.value) })} sx={inputSx} />
                <TextField fullWidth size="small" type="number" label="Max length" slotProps={{ inputLabel: { shrink: true } }} value={v.maxLength ?? ""} onChange={(e) => patchValidation({ maxLength: e.target.value === "" ? undefined : Number(e.target.value) })} sx={inputSx} />
              </Stack>
            ) : null}
            {isNumeric ? (
              <Stack direction="row" spacing={2}>
                <TextField fullWidth size="small" type="number" label="Minimum" slotProps={{ inputLabel: { shrink: true } }} value={v.minimum ?? ""} onChange={(e) => patchValidation({ minimum: e.target.value === "" ? undefined : Number(e.target.value) })} sx={inputSx} />
                <TextField fullWidth size="small" type="number" label="Maximum" slotProps={{ inputLabel: { shrink: true } }} value={v.maximum ?? ""} onChange={(e) => patchValidation({ maximum: e.target.value === "" ? undefined : Number(e.target.value) })} sx={inputSx} />
              </Stack>
            ) : null}
            {isString ? (
              <>
                <TextField fullWidth size="small" label="Pattern (regex)" slotProps={{ inputLabel: { shrink: true } }} value={v.pattern ?? ""} onChange={(e) => patchValidation({ pattern: e.target.value || undefined })} sx={{ ...inputSx, "& input": { fontFamily: "var(--font-mono,monospace)" } }} />
                <TextField fullWidth size="small" label="Format" placeholder="email, uri, ipv4…" slotProps={{ inputLabel: { shrink: true } }} value={v.format ?? ""} onChange={(e) => patchValidation({ format: e.target.value || undefined })} sx={inputSx} />
              </>
            ) : null}
            {!isString && !isNumeric ? (
              <Typography sx={{ fontSize: 12, color: "#94A3B8" }}>No validation rules for this type.</Typography>
            ) : null}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

export function FieldDetailPanel({
  scope,
  node,
  open,
  onClose,
}: {
  scope: string;
  node: SchemaNode | null;
  open: boolean;
  onClose: () => void;
}) {
  const mobile = useMediaQuery("(max-width:899px)");
  return (
    <Drawer
      anchor={mobile ? "bottom" : "right"}
      open={open && Boolean(node)}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderLeft: mobile ? "none" : `1px solid ${line}`,
            borderTop: mobile ? `1px solid ${line}` : "none",
            borderTopLeftRadius: mobile ? 16 : 0,
            borderTopRightRadius: mobile ? 16 : 0,
            maxHeight: mobile ? "82vh" : "100%",
          },
        },
      }}
    >
      {node ? <DetailForm key={node.id} scope={scope} node={node} onClose={onClose} /> : null}
    </Drawer>
  );
}
