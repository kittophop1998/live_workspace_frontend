// Pure converters between the SchemaNode tree, the backend's flat SchemaField[],
// JSON Schema (draft-07-ish), and example JSON. Also a tiny JSON tokenizer used
// by the read-only syntax-highlighted preview. No side effects — the workbench
// re-runs these whenever the tree changes so the three modes stay in sync.

import { makeNode, type NodeType, type SchemaNode } from "@/lib/schemaTree";
import type { DataType, JsonValue, SchemaField } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

// ---- JSON value → tree (paste / AI convert) -------------------------------

export function jsonValueToNode(key: string, value: JsonValue): SchemaNode {
  if (value === null) return makeNode({ key, type: "null", nullable: true });
  if (Array.isArray(value)) {
    const node = makeNode({ key, type: "array" });
    if (value.length) node.items = jsonValueToNode("items", value[0]);
    return node;
  }
  if (typeof value === "object") {
    const node = makeNode({ key, type: "object" });
    node.children = Object.entries(value).map(([k, v]) => {
      const child = jsonValueToNode(k, v);
      child.required = true; // present keys are treated as required by default
      return child;
    });
    return node;
  }
  if (typeof value === "number") {
    return makeNode({ key, type: Number.isInteger(value) ? "integer" : "number", example: value });
  }
  if (typeof value === "boolean") return makeNode({ key, type: "boolean", example: value });
  // string
  const type: NodeType = UUID_RE.test(value) ? "uuid" : ISO_RE.test(value) ? "timestamp" : "string";
  return makeNode({ key, type, example: value });
}

export function jsonValueToNodes(obj: Record<string, JsonValue>): SchemaNode[] {
  return Object.entries(obj).map(([k, v]) => {
    const node = jsonValueToNode(k, v);
    node.required = true;
    return node;
  });
}

// ---- backend flat fields → tree (initial seed) ----------------------------

// Only legacy tokens are ever looked up here (see fieldToNode below) —
// string/number/integer/boolean/uuid/timestamp/object/array/null round-trip
// natively, and "enum" only falls through when it lacks real `enumValues`.
const DATA_TYPE_TO_NODE: Partial<Record<DataType, NodeType>> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  uuid: "uuid",
  timestamp: "timestamp",
  json: "object",
  "string[]": "array",
  "number[]": "array",
  enum: "enum",
};

// Types that are already NodeType-shaped 1:1 (the backend now accepts these
// tokens directly, see backend fieldTypes) — a field carrying one of these
// round-trips natively via children/items rather than the json/string[]/
// number[] heuristics below, which only ever apply to pre-migration data.
const DIRECT_NODE_TYPES = new Set<string>([
  "string", "number", "integer", "boolean", "uuid", "timestamp", "object", "array", "null",
]);

function fieldToNode(f: SchemaField): SchemaNode {
  if (DIRECT_NODE_TYPES.has(f.type)) {
    const node = makeNode({
      key: f.key,
      type: f.type as NodeType,
      required: f.required,
      nullable: f.nullable || undefined,
      state: f.state,
      change: f.change,
      description: f.description,
      example: f.example,
      default: f.default,
      validation: f.validation,
    });
    if (f.type === "object") node.children = (f.children ?? []).map(fieldToNode);
    if (f.type === "array" && f.items) node.items = fieldToNode(f.items);
    return node;
  }
  // "enum" predates this change but only carries real `enumValues` once saved
  // through the new endpoint — legacy enum fields have none and fall through
  // to the description-parsed heuristic below.
  if (f.type === "enum" && f.enumValues?.length) {
    return makeNode({
      key: f.key,
      type: "enum",
      required: f.required,
      nullable: f.nullable || undefined,
      state: f.state,
      change: f.change,
      description: f.description,
      example: f.example,
      default: f.default,
      validation: f.validation,
      enumValues: f.enumValues,
    });
  }
  // Legacy flat encoding (json / string[] / number[] / description-parsed
  // enum) — infer the nested shape the same way this always has.
  const type = DATA_TYPE_TO_NODE[f.type] ?? "string";
  const node = makeNode({
    key: f.key,
    type,
    required: f.required,
    state: f.state,
    change: f.change,
    description: f.description,
  });
  if (f.type === "json" && f.value && typeof f.value === "object") {
    if (Array.isArray(f.value)) {
      node.type = "array";
      delete node.children;
      if (f.value.length) node.items = jsonValueToNode("items", f.value[0]);
    } else {
      node.children = jsonValueToNodes(f.value as Record<string, JsonValue>);
    }
  } else if (f.type === "string[]") {
    node.items = makeNode({ key: "items", type: "string" });
  } else if (f.type === "number[]") {
    node.items = makeNode({ key: "items", type: "number" });
  } else if (f.type === "enum") {
    node.enumValues = f.description?.split("|").map((s) => s.trim()).filter(Boolean) ?? [];
  }
  return node;
}

export function seedFromFields(fields: SchemaField[]): SchemaNode[] {
  return fields.filter((f) => f.change !== "removed").map(fieldToNode);
}

// ---- tree → backend SchemaField[] (write-through save) --------------------

export function nodeToSchemaField(node: SchemaNode): SchemaField {
  const field: SchemaField = {
    id: node.id,
    key: node.key,
    type: node.type as DataType,
    required: node.required,
    nullable: node.nullable,
    state: node.state,
    change: node.change,
    description: node.description,
    example: node.example,
    default: node.default,
    validation: node.validation,
  };
  if (node.type === "enum") field.enumValues = node.enumValues;
  if (node.type === "object") field.children = (node.children ?? []).map(nodeToSchemaField);
  if (node.type === "array" && node.items) field.items = nodeToSchemaField(node.items);
  return field;
}

export function nodesToSchemaFields(nodes: SchemaNode[]): SchemaField[] {
  return nodes.map(nodeToSchemaField);
}

// ---- tree → JSON Schema ---------------------------------------------------

function scalarSchema(node: SchemaNode): Record<string, unknown> {
  switch (node.type) {
    case "integer":
      return { type: "integer" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "uuid":
      return { type: "string", format: "uuid" };
    case "timestamp":
      return { type: "string", format: "date-time" };
    case "enum":
      return { type: "string", enum: node.enumValues ?? [] };
    case "null":
      return { type: "null" };
    default:
      return { type: "string" };
  }
}

export function nodeToJsonSchema(node: SchemaNode): Record<string, unknown> {
  let schema: Record<string, unknown>;
  if (node.type === "object") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const child of node.children ?? []) {
      properties[child.key] = nodeToJsonSchema(child);
      if (child.required) required.push(child.key);
    }
    schema = { type: "object", properties };
    if (required.length) schema.required = required;
  } else if (node.type === "array") {
    schema = { type: "array", items: node.items ? nodeToJsonSchema(node.items) : {} };
  } else {
    schema = scalarSchema(node);
  }
  if (node.nullable && node.type !== "null") {
    const t = schema.type;
    schema.type = Array.isArray(t) ? t : [t, "null"];
  }
  if (node.description) schema.description = node.description;
  if (node.default !== undefined) schema.default = node.default;
  if (node.example !== undefined) schema.examples = [node.example];
  const v = node.validation;
  if (v) {
    if (v.minLength !== undefined) schema.minLength = v.minLength;
    if (v.maxLength !== undefined) schema.maxLength = v.maxLength;
    if (v.minimum !== undefined) schema.minimum = v.minimum;
    if (v.maximum !== undefined) schema.maximum = v.maximum;
    if (v.pattern) schema.pattern = v.pattern;
    if (v.format && node.type !== "uuid" && node.type !== "timestamp") schema.format = v.format;
  }
  return schema;
}

export function nodesToJsonSchema(nodes: SchemaNode[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const n of nodes) {
    properties[n.key] = nodeToJsonSchema(n);
    if (n.required) required.push(n.key);
  }
  const schema: Record<string, unknown> = { $schema: "http://json-schema.org/draft-07/schema#", type: "object", properties };
  if (required.length) schema.required = required;
  return schema;
}

// ---- JSON Schema → tree (sync back from the JSON Schema tab) ---------------

function pickType(raw: unknown): { type: NodeType; nullable: boolean } {
  let t = raw;
  let nullable = false;
  if (Array.isArray(raw)) {
    nullable = raw.includes("null");
    t = raw.find((x) => x !== "null");
  }
  return { type: (t as NodeType) ?? "string", nullable };
}

export function schemaToNode(key: string, schema: Record<string, unknown>, required: boolean): SchemaNode {
  const { type: rawType, nullable } = pickType(schema.type);
  const enumVals = schema.enum as unknown[] | undefined;
  let type: NodeType = rawType;
  if (enumVals && type === "string") type = "enum";
  if (type === "string" && schema.format === "uuid") type = "uuid";
  if (type === "string" && schema.format === "date-time") type = "timestamp";

  const node = makeNode({
    key,
    type,
    required,
    nullable: nullable || undefined,
    description: typeof schema.description === "string" ? schema.description : undefined,
    default: schema.default as JsonValue | undefined,
    enumValues: enumVals?.map(String),
  });
  const examples = schema.examples as unknown[] | undefined;
  if (examples?.length) node.example = examples[0] as JsonValue;

  const validation: SchemaNode["validation"] = {};
  for (const k of ["minLength", "maxLength", "minimum", "maximum"] as const) {
    if (typeof schema[k] === "number") validation[k] = schema[k] as number;
  }
  if (typeof schema.pattern === "string") validation.pattern = schema.pattern;
  if (Object.keys(validation).length) node.validation = validation;

  if (type === "object") {
    const props = (schema.properties as Record<string, Record<string, unknown>>) ?? {};
    const req = new Set((schema.required as string[]) ?? []);
    node.children = Object.entries(props).map(([k, v]) => schemaToNode(k, v, req.has(k)));
  } else if (type === "array") {
    const items = schema.items as Record<string, unknown> | undefined;
    if (items) node.items = schemaToNode("items", items, false);
  }
  return node;
}

export function jsonSchemaToNodes(schema: Record<string, unknown>): SchemaNode[] {
  const props = (schema.properties as Record<string, Record<string, unknown>>) ?? {};
  const req = new Set((schema.required as string[]) ?? []);
  return Object.entries(props).map(([k, v]) => schemaToNode(k, v, req.has(k)));
}

// ---- tree → example JSON --------------------------------------------------

function sampleScalar(node: SchemaNode): JsonValue {
  if (node.example !== undefined) return node.example;
  if (node.default !== undefined) return node.default;
  switch (node.type) {
    case "uuid":
      return "00000000-0000-4000-8000-000000000000";
    case "timestamp":
      return new Date(0).toISOString();
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return false;
    case "enum":
      return node.enumValues?.[0] ?? "value";
    case "null":
      return null;
    default:
      return `sample_${node.key}`;
  }
}

export function nodeToExample(node: SchemaNode): JsonValue {
  // An explicit example wins for any type, including object/array.
  if (node.example !== undefined) return node.example;
  if (node.type === "object") {
    const obj: Record<string, JsonValue> = {};
    for (const c of node.children ?? []) obj[c.key] = nodeToExample(c);
    return obj;
  }
  if (node.type === "array") {
    return node.items ? [nodeToExample(node.items)] : [];
  }
  return sampleScalar(node);
}

export function nodesToExample(nodes: SchemaNode[]): Record<string, JsonValue> {
  const obj: Record<string, JsonValue> = {};
  for (const n of nodes) obj[n.key] = nodeToExample(n);
  return obj;
}

// ---- tree → TypeScript interface ------------------------------------------

// PascalCase identifier safe for an interface name.
function pascalCase(name: string): string {
  const pascal = name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return /^[0-9]/.test(pascal) ? `_${pascal}` : pascal || "Schema";
}

// Quote a property key only when it isn't a plain identifier.
const tsKey = (key: string): string => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key));

function tsScalar(node: SchemaNode): string {
  switch (node.type) {
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "enum":
      return node.enumValues?.length ? node.enumValues.map((v) => JSON.stringify(v)).join(" | ") : "string";
    case "null":
      return "null";
    default:
      return "string"; // string | uuid | timestamp
  }
}

function tsObject(children: SchemaNode[], indent: number): string {
  if (!children.length) return "Record<string, unknown>";
  const pad = "  ".repeat(indent + 1);
  const close = "  ".repeat(indent);
  const lines = children.map((c) => {
    const optional = c.required ? "" : "?";
    const doc = c.description ? `${pad}/** ${c.description} */\n` : "";
    return `${doc}${pad}${tsKey(c.key)}${optional}: ${tsType(c, indent + 1)};`;
  });
  return `{\n${lines.join("\n")}\n${close}}`;
}

function tsType(node: SchemaNode, indent: number): string {
  let base: string;
  if (node.type === "object") base = tsObject(node.children ?? [], indent);
  else if (node.type === "array") base = node.items ? `${tsType(node.items, indent)}[]` : "unknown[]";
  else base = tsScalar(node);
  if (node.nullable && node.type !== "null") base += " | null";
  return base;
}

export function nodesToTypeScript(nodes: SchemaNode[], typeName: string): string {
  return `export interface ${pascalCase(typeName)} ${tsObject(nodes, 0)}`;
}

// ---- tiny JSON tokenizer (read-only syntax highlight) ---------------------

export type JsonTokenKind = "key" | "string" | "number" | "boolean" | "null" | "punct" | "plain";
export interface JsonToken {
  value: string;
  kind: JsonTokenKind;
}

const TOKEN_RE =
  /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])/g;

export function tokenizeJson(src: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(src))) {
    if (m.index > last) tokens.push({ value: src.slice(last, m.index), kind: "plain" });
    if (m[1]) tokens.push({ value: m[1], kind: "key" });
    else if (m[2]) tokens.push({ value: m[2], kind: "string" });
    else if (m[3]) tokens.push({ value: m[3], kind: "number" });
    else if (m[4]) tokens.push({ value: m[4], kind: "boolean" });
    else if (m[5]) tokens.push({ value: m[5], kind: "null" });
    else if (m[6]) tokens.push({ value: m[6], kind: "punct" });
    last = m.index + m[0].length;
  }
  if (last < src.length) tokens.push({ value: src.slice(last), kind: "plain" });
  return tokens;
}
