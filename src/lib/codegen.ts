// Generates a TypeScript interface or a JSON mock from a Resource's fields.
// Pure functions — the right panel re-runs these whenever the schema changes.

import type { DataType, Resource, SchemaField } from "@/lib/types";

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

export function toTypeScript(resource: Resource): string {
  const name = pascalCase(resource.name);
  const lines = live(resource.fields).map((f) => {
    const optional = f.required ? "" : "?";
    const flag =
      f.state === "draft" ? " // [draft]" : f.state === "breaking" ? " // [breaking change]" : "";
    const doc = f.description ? `  /** ${f.description} */\n` : "";
    return `${doc}  ${f.key}${optional}: ${TS_TYPE[f.type]};${flag}`;
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
      return {};
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
