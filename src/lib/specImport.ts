// Parse an OpenAPI document (JSON or YAML) or a Postman collection (JSON) into a
// normalized list of operations: method, path, request body fields, and per-status
// response schemas. Pure — no React, no store. Consumed by ImportSpecDialog, which
// applies a chosen operation to the selected endpoint + its local response schemas.

import yaml from "js-yaml";
import { inferField } from "@/lib/codegen";
import type { DataType, HttpMethod, JsonValue } from "@/lib/types";

export interface ImportedField {
  key: string;
  type: DataType;
  required: boolean;
  description?: string;
  value?: JsonValue;
}

export interface ImportedResponse {
  status: number;
  description?: string;
  fields: ImportedField[];
}

export interface ImportedOperation {
  id: string; // `${method} ${path}` — stable within one import
  method: HttpMethod;
  path: string;
  name: string;
  summary?: string;
  requestFields: ImportedField[];
  responses: ImportedResponse[];
}

export interface ParsedSpec {
  format: "openapi" | "postman";
  title?: string;
  operations: ImportedOperation[];
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const OPENAPI_METHODS = ["get", "post", "put", "patch", "delete"] as const;

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

// ---- Entry point ----------------------------------------------------------
export function parseSpec(text: string): ParsedSpec {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Nothing to import — paste or upload a spec first.");

  const doc = loadDocument(trimmed);
  if (!isObject(doc)) throw new Error("Spec must be a JSON/YAML object.");

  if (doc.openapi || doc.swagger) return parseOpenApi(doc);
  if (doc.info && Array.isArray(doc.item)) return parsePostman(doc);
  throw new Error("Unrecognized format — expected an OpenAPI document or a Postman collection.");
}

// JSON first (covers OpenAPI JSON + Postman); fall back to YAML for openapi.yaml.
function loadDocument(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    try {
      return yaml.load(text);
    } catch {
      throw new Error("Could not parse file as JSON or YAML.");
    }
  }
}

// ---- OpenAPI --------------------------------------------------------------
function parseOpenApi(doc: Json): ParsedSpec {
  const paths = isObject(doc.paths) ? doc.paths : {};
  const operations: ImportedOperation[] = [];

  for (const [path, pathItemRaw] of Object.entries(paths)) {
    if (!isObject(pathItemRaw)) continue;
    for (const m of OPENAPI_METHODS) {
      const op = pathItemRaw[m];
      if (!isObject(op)) continue;
      const method = m.toUpperCase() as HttpMethod;
      operations.push({
        id: `${method} ${path}`,
        method,
        path,
        name: typeof op.operationId === "string" ? op.operationId : `${method} ${path}`,
        summary: typeof op.summary === "string" ? op.summary : undefined,
        requestFields: openApiRequestFields(op, doc),
        responses: openApiResponses(op, doc),
      });
    }
  }

  const title = isObject(doc.info) && typeof doc.info.title === "string" ? doc.info.title : undefined;
  return { format: "openapi", title, operations };
}

function jsonSchema(carrier: unknown): unknown {
  // { content: { "application/json": { schema } } } — tolerate any *json media type.
  if (!isObject(carrier) || !isObject(carrier.content)) return undefined;
  const content = carrier.content;
  const key = Object.keys(content).find((k) => k.includes("json")) ?? Object.keys(content)[0];
  const media = key ? content[key] : undefined;
  return isObject(media) ? media.schema : undefined;
}

function openApiRequestFields(op: Json, root: Json): ImportedField[] {
  const schema = jsonSchema(op.requestBody);
  return schema ? schemaToFields(schema, root, new Set()) : [];
}

function openApiResponses(op: Json, root: Json): ImportedResponse[] {
  if (!isObject(op.responses)) return [];
  const out: ImportedResponse[] = [];
  for (const [code, respRaw] of Object.entries(op.responses)) {
    const status = code === "default" ? 0 : Number.parseInt(code, 10);
    if (Number.isNaN(status)) continue;
    const schema = jsonSchema(respRaw);
    out.push({
      status,
      description: isObject(respRaw) && typeof respRaw.description === "string" ? respRaw.description : undefined,
      fields: schema ? schemaToFields(schema, root, new Set()) : [],
    });
  }
  return out.sort((a, b) => a.status - b.status);
}

function resolveRef(ref: string, root: Json): unknown {
  // "#/components/schemas/User" → root.components.schemas.User
  if (!ref.startsWith("#/")) return undefined;
  let cur: unknown = root;
  for (const seg of ref.slice(2).split("/")) {
    if (!isObject(cur)) return undefined;
    cur = cur[decodeURIComponent(seg.replace(/~1/g, "/").replace(/~0/g, "~"))];
  }
  return cur;
}

function deref(schema: unknown, root: Json, seen: Set<string>): Json | undefined {
  if (!isObject(schema)) return undefined;
  if (typeof schema.$ref === "string") {
    if (seen.has(schema.$ref)) return undefined; // cycle guard
    seen.add(schema.$ref);
    return deref(resolveRef(schema.$ref, root), root, seen);
  }
  return schema;
}

// Top-level object schema → one field per property. Nested objects/arrays-of-objects
// collapse to a `json` field carrying a sample shape (so codegen/preview still work).
function schemaToFields(schemaRaw: unknown, root: Json, seen: Set<string>): ImportedField[] {
  const schema = deref(schemaRaw, root, new Set(seen));
  if (!schema) return [];

  const merged = mergeAllOf(schema, root, seen);
  const props = isObject(merged.properties) ? merged.properties : undefined;
  if (!props) {
    // Non-object response (array/primitive) — expose a single representative field.
    return [{ key: "data", type: openApiType(merged, root, seen), required: true, value: sampleFromSchema(merged, root, new Set(seen), 0) }];
  }

  const required = new Set(Array.isArray(merged.required) ? (merged.required as string[]) : []);
  return Object.entries(props).map(([key, propRaw]) => {
    const prop = deref(propRaw, root, new Set(seen)) ?? (isObject(propRaw) ? propRaw : {});
    const type = openApiType(propRaw, root, seen);
    const field: ImportedField = {
      key,
      type,
      required: required.has(key),
      description: typeof prop.description === "string" ? prop.description : undefined,
    };
    if (type === "json") field.value = sampleFromSchema(propRaw, root, new Set(seen), 0);
    return field;
  });
}

function mergeAllOf(schema: Json, root: Json, seen: Set<string>): Json {
  if (!Array.isArray(schema.allOf)) return schema;
  const out: Json = { ...schema };
  const properties: Json = isObject(schema.properties) ? { ...schema.properties } : {};
  const required: string[] = Array.isArray(schema.required) ? [...(schema.required as string[])] : [];
  for (const part of schema.allOf) {
    const sub = mergeAllOf(deref(part, root, new Set(seen)) ?? {}, root, seen);
    if (isObject(sub.properties)) Object.assign(properties, sub.properties);
    if (Array.isArray(sub.required)) required.push(...(sub.required as string[]));
  }
  out.properties = properties;
  out.required = required;
  return out;
}

function openApiType(schemaRaw: unknown, root: Json, seen: Set<string>): DataType {
  const schema = deref(schemaRaw, root, new Set(seen));
  if (!schema) return "json"; // unresolved $ref → treat as nested object
  if (Array.isArray(schema.enum)) return "enum";

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  const format = typeof schema.format === "string" ? schema.format : "";

  switch (type) {
    case "string":
      if (format === "uuid" || format === "guid") return "uuid";
      if (format === "date-time" || format === "date") return "timestamp";
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array": {
      const item = deref(schema.items, root, new Set(seen));
      const itemType = item && (Array.isArray(item.type) ? item.type[0] : item.type);
      if (itemType === "string") return "string[]";
      if (itemType === "integer" || itemType === "number") return "number[]";
      return "json";
    }
    case "object":
    default:
      return isObject(schema.properties) || schema.$ref ? "json" : "string";
  }
}

// Build a representative JSON sample for a `json` field (depth-capped, cycle-safe).
function sampleFromSchema(schemaRaw: unknown, root: Json, seen: Set<string>, depth: number): JsonValue {
  const schema = deref(schemaRaw, root, seen);
  if (!schema || depth > 4) return {};
  if (schema.example !== undefined) return schema.example as JsonValue;
  if (schema.default !== undefined) return schema.default as JsonValue;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0] as JsonValue;

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === "array") {
    return [sampleFromSchema(schema.items, root, new Set(seen), depth + 1)];
  }
  if (type === "object" || isObject(schema.properties)) {
    const merged = mergeAllOf(schema, root, seen);
    const props = isObject(merged.properties) ? merged.properties : {};
    const obj: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(props)) obj[k] = sampleFromSchema(v, root, new Set(seen), depth + 1);
    return obj;
  }
  switch (type) {
    case "string":
      return schema.format === "uuid" ? "00000000-0000-4000-8000-000000000000" : "string";
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return false;
    default:
      return null;
  }
}

// ---- Postman --------------------------------------------------------------
function parsePostman(doc: Json): ParsedSpec {
  const operations: ImportedOperation[] = [];
  walkPostmanItems(Array.isArray(doc.item) ? doc.item : [], operations);
  const title = isObject(doc.info) && typeof doc.info.name === "string" ? doc.info.name : undefined;
  return { format: "postman", title, operations };
}

function walkPostmanItems(items: unknown[], out: ImportedOperation[]): void {
  for (const itemRaw of items) {
    if (!isObject(itemRaw)) continue;
    if (Array.isArray(itemRaw.item)) {
      walkPostmanItems(itemRaw.item, out); // folder
      continue;
    }
    if (!isObject(itemRaw.request)) continue;
    const req = itemRaw.request;
    const method = String(req.method ?? "GET").toUpperCase();
    if (!HTTP_METHODS.includes(method as HttpMethod)) continue;
    const path = postmanPath(req.url);
    out.push({
      id: `${method} ${path}`,
      method: method as HttpMethod,
      path,
      name: typeof itemRaw.name === "string" ? itemRaw.name : `${method} ${path}`,
      requestFields: fieldsFromRawJson(isObject(req.body) ? req.body.raw : undefined),
      responses: postmanResponses(itemRaw.response),
    });
  }
}

function postmanPath(url: unknown): string {
  if (typeof url === "string") return stripToPath(url);
  if (isObject(url)) {
    if (Array.isArray(url.path)) {
      const segs = url.path.map((s) => (isObject(s) ? "" : String(s))).filter(Boolean);
      return "/" + segs.join("/");
    }
    if (typeof url.raw === "string") return stripToPath(url.raw);
  }
  return "/";
}

function stripToPath(raw: string): string {
  // Drop protocol/host + query, keep the path. Postman {{baseUrl}} vars are tolerated.
  const noVars = raw.replace(/\{\{[^}]+\}\}/g, "");
  const noQuery = noVars.split("?")[0];
  const m = noQuery.match(/^[a-z]+:\/\/[^/]+(\/.*)$/i);
  const path = m ? m[1] : noQuery;
  const clean = path.replace(/^https?:\/\/[^/]+/i, "");
  return clean.startsWith("/") ? clean : "/" + clean;
}

function postmanResponses(responses: unknown): ImportedResponse[] {
  if (!Array.isArray(responses)) return [];
  return responses
    .filter(isObject)
    .map((r) => ({
      status: typeof r.code === "number" ? r.code : Number.parseInt(String(r.code ?? 0), 10) || 0,
      description: typeof r.name === "string" ? r.name : typeof r.status === "string" ? r.status : undefined,
      fields: fieldsFromRawJson(r.body),
    }))
    .sort((a, b) => a.status - b.status);
}

// Postman bodies are raw example JSON — infer field types like the "Paste JSON" flow.
function fieldsFromRawJson(raw: unknown): ImportedField[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!isObject(parsed)) return [];
  return Object.entries(parsed).map(([key, value]) => {
    const { type, value: nested } = inferField(value as JsonValue);
    return { key, type, required: false, value: nested };
  });
}
