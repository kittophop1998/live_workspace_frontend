// Generates a TypeScript interface or a JSON mock from a Resource's fields.
// Pure functions — the right panel re-runs these whenever the schema changes.

import type { DataType, JsonValue, Resource, SchemaField } from "@/lib/types";

const TS_TYPE: Record<DataType, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  uuid: "string",
  timestamp: "string",
  json: "Record<string, unknown>",
  "string[]": "string[]",
  "number[]": "number[]",
  enum: "string",
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

// TS type for a field — a json field with a defined shape gets an inline literal.
const fieldTsType = (f: SchemaField): string =>
  f.type === "json" && f.value !== undefined ? tsTypeFromJson(f.value) : TS_TYPE[f.type];

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
      return f.description?.split("|")[0]?.trim() ?? "value";
  }
}

export function toJsonMock(resource: Resource): string {
  const obj: Record<string, unknown> = {};
  for (const f of live(resource.fields)) obj[f.key] = sampleValue(f);
  return JSON.stringify(obj, null, 2);
}
