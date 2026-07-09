// Generates a Markdown API spec (api-spec.md) from the workspace's resources.
// Pure functions, computed client-side like codegen.ts — no endpoint needed.

import type { Resource, ResponseSchema, SchemaField } from "@/lib/types";
import { toJsonMock, toTypeScript } from "@/lib/codegen";

// Removed fields are soft-deleted — kept for the diff, excluded from the spec.
const live = (fields: SchemaField[]) => fields.filter((f) => f.change !== "removed");

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  inprogress: "In Progress",
  testing: "Testing",
  done: "Done",
};

// One row per field; nested object/array children flatten to dotted keys.
function fieldRows(fields: SchemaField[], prefix = ""): string[] {
  const rows: string[] = [];
  for (const f of live(fields)) {
    const key = prefix ? `${prefix}.${f.key}` : f.key;
    const type = f.type === "enum" && f.enumValues?.length ? `enum(${f.enumValues.join(" | ")})` : f.type;
    rows.push(
      `| \`${esc(key)}\` | ${esc(type)} | ${f.required ? "yes" : "no"} | ${f.state} | ${esc(f.description ?? "")} |`,
    );
    if (f.type === "object" && f.children?.length) rows.push(...fieldRows(f.children, key));
    if (f.type === "array" && f.items) rows.push(...fieldRows([f.items], `${key}[]`));
  }
  return rows;
}

function fieldTable(fields: SchemaField[]): string {
  if (!live(fields).length) return "_No fields._";
  return [
    "| Field | Type | Required | State | Description |",
    "|-------|------|----------|-------|-------------|",
    ...fieldRows(fields),
  ].join("\n");
}

function responseSection(responses: ResponseSchema[]): string {
  const parts: string[] = ["#### Responses"];
  for (const r of responses) {
    const status = r.status === 0 ? "default" : String(r.status);
    parts.push(`**${status}**${r.description ? ` — ${esc(r.description)}` : ""}`, fieldTable(r.fields));
  }
  return parts.join("\n\n");
}

function endpointSection(r: Resource): string {
  const parts: string[] = [
    `### \`${r.method ?? "GET"}\` \`${r.path ?? ""}\` — ${r.name}`,
    `Status: **${STATUS_LABEL[r.status ?? "draft"] ?? r.status}** · State: **${r.state}** · updated ${r.updatedAt} by ${r.updatedBy}`,
    "#### Request body",
    fieldTable(r.fields),
  ];
  if (live(r.fields).length) {
    parts.push(
      "Example JSON:",
      "```json\n" + toJsonMock(r) + "\n```",
      "Example TypeScript:",
      "```ts\n" + toTypeScript(r) + "\n```",
    );
  }
  if (r.responses?.length) parts.push(responseSection(r.responses));
  return parts.join("\n\n");
}

function modelSection(r: Resource): string {
  const parts: string[] = [
    `### ${r.name}`,
    `State: **${r.state}** · updated ${r.updatedAt} by ${r.updatedBy}`,
    fieldTable(r.fields),
  ];
  if (live(r.fields).length) parts.push("```ts\n" + toTypeScript(r) + "\n```");
  return parts.join("\n\n");
}

export function toMarkdownSpec(resources: Resource[], opts: { roomCode?: string | null; rev?: number } = {}): string {
  const endpoints = resources.filter((r) => r.kind === "endpoint");
  const databases = resources.filter((r) => r.kind === "database");
  const models = resources.filter((r) => r.kind === "model");

  const counts = [
    `${endpoints.length} endpoint${endpoints.length === 1 ? "" : "s"}`,
    `${models.length} model${models.length === 1 ? "" : "s"}`,
    `${databases.length} database${databases.length === 1 ? "" : "s"}`,
  ].join(" · ");
  const meta = [
    `Exported from Live Workspace on ${new Date().toISOString()}`,
    opts.roomCode ? `room \`${opts.roomCode}\`` : null,
    opts.rev !== undefined ? `rev ${opts.rev}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const parts: string[] = ["# API Specification", `> ${meta}`, `> ${counts}`];
  if (endpoints.length) parts.push("## Endpoints", ...endpoints.map(endpointSection));
  if (models.length) parts.push("## Models", ...models.map(modelSection));
  if (databases.length) parts.push("## Databases", ...databases.map(modelSection));
  return parts.join("\n\n") + "\n";
}

// Trigger a browser download of the generated spec as a .md file.
export function downloadMarkdownSpec(resources: Resource[], opts: { roomCode?: string | null; rev?: number } = {}) {
  const md = toMarkdownSpec(resources, opts);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.roomCode ? `api-spec-${opts.roomCode}.md` : "api-spec.md";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
