"use client";

// Derives a field-level diff between a proposal's draft fields and the currently
// published resource fields, plus a rule-based review summary (no LLM). The diff
// drives both the visual diff UI (ProposalDiff.tsx) and the merge (store
// .mergeProposalChanges), which replays it through the real field APIs.

import type { FieldChange, Resource, SchemaField } from "@/lib/types";
import type { Proposal } from "@/lib/proposals";

export type DiffOp = "add" | "remove" | "modify";

export interface AttrDelta {
  attr: string; // "type" | "required" | "description" | "value"
  before: string;
  after: string;
}

export interface FieldDiff {
  op: DiffOp;
  change: FieldChange; // "added" | "removed" | "modified" — indexes theme.changeColor
  key: string; // display key
  field: SchemaField; // proposal field (add/modify) or published field (remove) — carries the id to apply
  before?: SchemaField;
  after?: SchemaField;
  deltas: AttrDelta[];
}

function requiredLabel(f: SchemaField): string {
  return f.required ? "required" : "optional";
}

function valueLabel(f: SchemaField): string {
  return f.value === undefined ? "—" : JSON.stringify(f.value);
}

// Compare the mutable attributes of a field pair. Empty ⇒ nothing meaningful changed.
function attrDeltas(before: SchemaField, after: SchemaField): AttrDelta[] {
  const deltas: AttrDelta[] = [];
  if (before.key !== after.key) deltas.push({ attr: "name", before: before.key, after: after.key });
  if (before.type !== after.type) deltas.push({ attr: "type", before: before.type, after: after.type });
  if (before.required !== after.required)
    deltas.push({ attr: "required", before: requiredLabel(before), after: requiredLabel(after) });
  if ((before.description ?? "") !== (after.description ?? ""))
    deltas.push({ attr: "description", before: before.description || "—", after: after.description || "—" });
  if (JSON.stringify(before.value) !== JSON.stringify(after.value))
    deltas.push({ attr: "value", before: valueLabel(before), after: valueLabel(after) });
  return deltas;
}

// Match proposal fields against published fields by id (the proposal seeds copies
// that keep the original ids). New ids ⇒ add; published ids absent from the
// proposal ⇒ remove; shared ids with attribute changes ⇒ modify.
export function diffProposal(proposal: Proposal, resource: Resource | undefined): FieldDiff[] {
  const published = resource?.fields ?? [];
  const publishedById = new Map(published.map((f) => [f.id, f]));
  const proposalIds = new Set(proposal.fields.map((f) => f.id));
  const diffs: FieldDiff[] = [];

  for (const after of proposal.fields) {
    const before = publishedById.get(after.id);
    if (!before) {
      diffs.push({ op: "add", change: "added", key: after.key, field: after, after, deltas: [] });
      continue;
    }
    const deltas = attrDeltas(before, after);
    if (deltas.length) {
      diffs.push({ op: "modify", change: "modified", key: after.key, field: after, before, after, deltas });
    }
  }

  for (const before of published) {
    if (!proposalIds.has(before.id)) {
      diffs.push({ op: "remove", change: "removed", key: before.key, field: before, before, deltas: [] });
    }
  }

  // Stable, readable ordering: additions, then changes, then removals.
  const rank: Record<DiffOp, number> = { add: 0, modify: 1, remove: 2 };
  return diffs.sort((a, b) => rank[a.op] - rank[b.op] || a.key.localeCompare(b.key));
}

export function countByOp(diffs: FieldDiff[]): Record<DiffOp, number> {
  return diffs.reduce(
    (acc, d) => ((acc[d.op] += 1), acc),
    { add: 0, modify: 0, remove: 0 } as Record<DiffOp, number>,
  );
}

// A "breaking" change is one that can invalidate an existing client: removing a
// field, or making an optional field required.
export function breakingChanges(diffs: FieldDiff[]): FieldDiff[] {
  return diffs.filter(
    (d) => d.op === "remove" || d.deltas.some((x) => x.attr === "required" && x.after === "required"),
  );
}

// One-line summary for the mascot / list preview.
export function summarizeDiff(diffs: FieldDiff[]): string {
  if (diffs.length === 0) return "No changes yet — nothing differs from the published endpoint.";
  const c = countByOp(diffs);
  const parts: string[] = [];
  if (c.add) parts.push(`${c.add} added`);
  if (c.modify) parts.push(`${c.modify} changed`);
  if (c.remove) parts.push(`${c.remove} removed`);
  const breaking = breakingChanges(diffs).length;
  const tail = breaking ? ` · ⚠️ ${breaking} breaking` : "";
  return `${parts.join(", ")}${tail}`;
}

// Multi-line rule-based review for the "Review Proposal" assistant action.
export function reviewProposal(diffs: FieldDiff[]): string[] {
  if (diffs.length === 0) return ["This proposal doesn't change anything yet — add or edit a field to get started."];
  const lines: string[] = [summarizeDiff(diffs)];
  for (const d of breakingChanges(diffs)) {
    if (d.op === "remove") lines.push(`⚠️ Removing "${d.key}" may break clients still sending it.`);
    else lines.push(`⚠️ "${d.key}" becomes required — existing callers must now include it.`);
  }
  if (breakingChanges(diffs).length === 0) lines.push("✓ No breaking changes detected — safe to merge.");
  return lines;
}
