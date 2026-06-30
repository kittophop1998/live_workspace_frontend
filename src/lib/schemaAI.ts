// Offline, rule-based "Ask AI" assistant for the schema editor.
//
// Project constraint: NO real LLM / external AI. These are deterministic
// heuristics presented through an assistant UI — natural-language → fields,
// pasted JSON → tree (reuses schemaConvert), field explanations, example
// payloads, and duplicate-structure detection for reusable components.

import { makeNode, type NodeType, type SchemaNode } from "@/lib/schemaTree";
import { jsonValueToNodes } from "@/lib/schemaConvert";
import type { JsonValue } from "@/lib/types";

const STOPWORDS = new Set([
  "a", "an", "the", "with", "of", "is", "should", "be", "that", "has", "have",
  "field", "fields", "and", "to", "for", "as", "it", "its", "their", "which",
  "this", "must", "can", "optional", "required", "nullable", "value", "values",
]);

function toCamel(words: string[]): string {
  const cleaned = words.map((w) => w.replace(/[^a-zA-Z0-9]/g, "")).filter(Boolean);
  if (!cleaned.length) return "field";
  return cleaned
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
}

export function pascalCase(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  const p = parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  return /^[0-9]/.test(p) ? `_${p}` : p || "Shared";
}

// Infer a node type from the words of a single clause.
function inferType(clause: string): NodeType {
  const c = ` ${clause.toLowerCase()} `;
  const has = (...words: string[]) => words.some((w) => c.includes(w));
  if (has(" uuid ", " guid ", " id ", "_id")) return "uuid";
  if (has(" timestamp", " datetime", " date", " time", "created", "updated", " at ")) return "timestamp";
  if (has(" boolean", " bool ", " flag", "enabled", "active", " is ", " has ")) return "boolean";
  if (has(" enum", " status", " role", " one of", " kind", " category")) return "enum";
  if (has(" integer", " int ", " count", " number", " amount", " age", " price", " qty", " quantity", " total")) {
    return has(" integer", " int ", " count", " age", " qty", " quantity") ? "integer" : "number";
  }
  if (has(" array", " list", " many", "[]", " tags", " items", " collection")) return "array";
  if (has(" object", " nested", " json", " metadata", " profile", " address", " map ")) return "object";
  return "string";
}

// Natural-language description → a list of field nodes. Splits on lines / commas
// / "and"; each clause becomes one field with a guessed key + type.
export function nlToNodes(text: string): SchemaNode[] {
  const clauses = text
    .split(/\n|,|;|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  const seen = new Set<string>();
  const nodes: SchemaNode[] = [];
  for (const clause of clauses) {
    const type = inferType(clause);
    const words = clause
      .split(/\s+/)
      .map((w) => w.toLowerCase())
      .filter((w) => !STOPWORDS.has(w) && /[a-z0-9]/.test(w));
    const key = toCamel(words.slice(0, 2)) || "field";
    if (seen.has(key)) continue;
    seen.add(key);
    const required = /\b(required|must)\b/i.test(clause) && !/\boptional\b/i.test(clause);
    const node = makeNode({ key, type, required, description: clause });
    if (type === "array") node.items = makeNode({ key: "items", type: "string" });
    if (type === "enum") node.enumValues = [];
    nodes.push(node);
  }
  return nodes;
}

// Reuse the JSON-value converter for the "paste JSON" assistant action.
export function jsonToNodes(obj: Record<string, JsonValue>): SchemaNode[] {
  return jsonValueToNodes(obj);
}

// A plain-language explanation of a single field.
export function explainNode(node: SchemaNode): string {
  const parts: string[] = [];
  const article = /^[aeiou]/i.test(node.type) ? "an" : "a";
  parts.push(`“${node.key}” is ${article} ${node.type} field.`);
  parts.push(node.required ? "It is required." : "It is optional.");
  if (node.nullable) parts.push("It may be null.");
  if (node.type === "object") parts.push(`It nests ${node.children?.length ?? 0} child field(s).`);
  if (node.type === "array") parts.push(`It is a list of ${node.items?.type ?? "items"}.`);
  if (node.type === "enum" && node.enumValues?.length) {
    parts.push(`Allowed values: ${node.enumValues.join(", ")}.`);
  }
  const v = node.validation;
  if (v) {
    const c: string[] = [];
    if (v.minLength !== undefined) c.push(`min length ${v.minLength}`);
    if (v.maxLength !== undefined) c.push(`max length ${v.maxLength}`);
    if (v.minimum !== undefined) c.push(`≥ ${v.minimum}`);
    if (v.maximum !== undefined) c.push(`≤ ${v.maximum}`);
    if (v.pattern) c.push(`pattern ${v.pattern}`);
    if (c.length) parts.push(`Constraints: ${c.join(", ")}.`);
  }
  if (node.example !== undefined) parts.push(`Example: ${JSON.stringify(node.example)}.`);
  if (node.description) parts.push(`Note: ${node.description}`);
  return parts.join(" ");
}

// ---- duplicate-structure detection ---------------------------------------

export interface ReusableSuggestion {
  signature: string;
  suggestedName: string;
  occurrences: string[]; // field keys carrying this shape
  fieldCount: number;
}

function signature(node: SchemaNode): string {
  if (node.type === "object") {
    const kids = (node.children ?? [])
      .map((c) => `${c.key}:${signature(c)}`)
      .sort()
      .join(",");
    return `{${kids}}`;
  }
  if (node.type === "array") return `[${node.items ? signature(node.items) : "any"}]`;
  return node.type;
}

// Walk the whole tree; group object nodes (with >=2 children) by structural
// signature and surface any shape that appears more than once.
export function detectReusable(nodes: SchemaNode[]): ReusableSuggestion[] {
  const groups = new Map<string, { keys: string[]; fieldCount: number }>();

  const visit = (node: SchemaNode) => {
    if (node.type === "object" && (node.children?.length ?? 0) >= 2) {
      const sig = signature(node);
      const g = groups.get(sig) ?? { keys: [], fieldCount: node.children!.length };
      g.keys.push(node.key);
      groups.set(sig, g);
    }
    node.children?.forEach(visit);
    if (node.items) visit(node.items);
  };
  nodes.forEach(visit);

  const out: ReusableSuggestion[] = [];
  for (const [sig, g] of groups) {
    if (g.keys.length < 2) continue;
    out.push({
      signature: sig,
      suggestedName: pascalCase(g.keys[0]),
      occurrences: g.keys,
      fieldCount: g.fieldCount,
    });
  }
  return out.sort((a, b) => b.occurrences.length - a.occurrences.length);
}
