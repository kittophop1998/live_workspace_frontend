// Generates a TypeScript interface or a JSON mock from a Resource's fields.
// Pure functions — the right panel re-runs these whenever the schema changes.

import type { DataType, JsonValue, Resource, SchemaField } from "@/lib/types";

const TS_TYPE: Record<DataType, string> = {
  string: "string",
  number: "number",
  integer: "number",
  boolean: "boolean",
  uuid: "string",
  timestamp: "string",
  json: "Record<string, unknown>",
  "string[]": "string[]",
  "number[]": "number[]",
  enum: "string",
  object: "Record<string, unknown>",
  array: "unknown[]",
  null: "null",
};

// PascalCase identifier safe for an interface name.
function pascalCase(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const pascal = cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return /^[0-9]/.test(pascal) ? `_${pascal}` : pascal || "Schema";
}

// Removed fields are excluded from generated output (they no longer exist on the wire).
const live = (fields: SchemaField[]) => fields.filter((f) => f.change !== "removed");

// Infer a TS type literal from a sample JSON value (for `json` fields with a shape).
function tsTypeFromJson(v: JsonValue): string {
  if (v === null) return "unknown";
  if (Array.isArray(v)) return v.length ? `${tsTypeFromJson(v[0])}[]` : "unknown[]";
  switch (typeof v) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object": {
      const entries = Object.entries(v as Record<string, JsonValue>);
      if (!entries.length) return "Record<string, unknown>";
      return `{ ${entries.map(([k, val]) => `${k}: ${tsTypeFromJson(val)}`).join("; ")} }`;
    }
    default:
      return "unknown";
  }
}

// Reverse of codegen: infer a field's DataType (and nested `value`) from a sample
// JSON value. Used when pasting a whole JSON object to build a schema at once.
export function inferField(v: JsonValue): { type: DataType; value?: JsonValue } {
  if (typeof v === "string") return { type: "string" };
  if (typeof v === "number") return { type: "number" };
  if (typeof v === "boolean") return { type: "boolean" };
  if (Array.isArray(v)) {
    if (v.length && v.every((x) => typeof x === "string")) return { type: "string[]" };
    if (v.length && v.every((x) => typeof x === "number")) return { type: "number[]" };
    return { type: "json", value: v }; // arrays of objects / mixed → nested json
  }
  if (v !== null && typeof v === "object") return { type: "json", value: v };
  return { type: "string" }; // null → nullable string
}

// TS type for a field — a json field with a defined shape, or a nested
// object/array field, gets an inline literal built from its children/items.
const fieldTsType = (f: SchemaField): string => {
  if (f.type === "json" && f.value !== undefined) return tsTypeFromJson(f.value);
  if (f.type === "object" && f.children?.length) {
    return `{ ${f.children.map((c) => `${c.key}${c.required ? "" : "?"}: ${fieldTsType(c)}`).join("; ")} }`;
  }
  if (f.type === "array" && f.items) return `${fieldTsType(f.items)}[]`;
  return TS_TYPE[f.type];
};

export function toTypeScript(resource: Resource): string {
  const name = pascalCase(resource.name);
  const lines = live(resource.fields).map((f) => {
    const optional = f.required ? "" : "?";
    const flag =
      f.state === "draft" ? " // [draft]" : f.state === "breaking" ? " // [breaking change]" : "";
    const doc = f.description ? `  /** ${f.description} */\n` : "";
    return `${doc}  ${f.key}${optional}: ${fieldTsType(f)};${flag}`;
  });
  return `export interface ${name} {\n${lines.join("\n")}\n}`;
}

function sampleValue(f: SchemaField): unknown {
  switch (f.type) {
    case "uuid":
      return "00000000-0000-4000-8000-000000000000";
    case "string":
      return `sample_${f.key}`;
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "timestamp":
      return new Date(0).toISOString();
    case "json":
      return f.value ?? {};
    case "string[]":
      return ["sample"];
    case "number[]":
      return [0];
    case "enum":
      return f.enumValues?.[0] ?? f.description?.split("|")[0]?.trim() ?? "value";
    case "object":
      return f.children?.length
        ? Object.fromEntries(f.children.map((c) => [c.key, sampleValue(c)]))
        : (f.value ?? {});
    case "array":
      return f.items ? [sampleValue(f.items)] : [];
    case "null":
      return null;
  }
}

export function toJsonMock(resource: Resource): string {
  const obj: Record<string, unknown> = {};
  for (const f of live(resource.fields)) obj[f.key] = sampleValue(f);
  return JSON.stringify(obj, null, 2);
}
