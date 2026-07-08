"use client";

// Write-through glue between the client-only Visual Builder tree
// (lib/schemaTree.ts) and the backend, mirroring lib/responseSchemas.ts's
// "local store + write-through + re-adopt on server echo" pattern — the
// Visual Builder previously lived only in localStorage with no API.
//
// Kept in its own file rather than folded into schemaTree.ts: schemaConvert.ts
// already imports from schemaTree.ts, so schemaTree.ts importing back from
// schemaConvert.ts here would create a cycle.

import { nodesToSchemaFields, seedFromFields } from "@/lib/schemaConvert";
import { useSchemaTreeStore, type SchemaNode } from "@/lib/schemaTree";
import { useResponseSchemaStore } from "@/lib/responseSchemas";
import { workspaceApi } from "@/services/workspace.service";
import type { Resource } from "@/lib/types";

const DEBOUNCE_MS = 500;
const REQ_SUFFIX = "::req";
const RES_SCOPE_RE = /^(.+)::res::(-?\d+)$/;

// Scopes just adopted from server data — skip the very next push for each so
// re-seeding a scope (from a snapshot or this client's own save echo) never
// bounces straight back out as an outgoing write (push -> echo -> adopt ->
// re-push -> ... loop).
const suppressed = new Set<string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let previousTrees: Record<string, SchemaNode[]> = {};
let started = false;

function pushScope(scope: string, nodes: SchemaNode[]): void {
  if (scope.endsWith(REQ_SUFFIX)) {
    const resourceId = scope.slice(0, -REQ_SUFFIX.length);
    void workspaceApi.setRequestFields(resourceId, nodesToSchemaFields(nodes)).catch(() => {
      /* offline/transient — the local tree still holds the edit */
    });
    return;
  }
  const match = RES_SCOPE_RE.exec(scope);
  if (!match) return;
  const [, resourceId, statusText] = match;
  const status = Number(statusText);
  const current = useResponseSchemaStore.getState().schemasFor(resourceId);
  if (!current.some((s) => s.status === status)) return; // status was removed mid-edit
  const next = current.map((s) => (s.status === status ? { ...s, fields: nodesToSchemaFields(nodes) } : s));
  // setForResource itself writes-through to PUT /resources/{id}/responses.
  useResponseSchemaStore.getState().setForResource(resourceId, next);
}

function flushScope(scope: string): void {
  const timer = timers.get(scope);
  if (!timer) return;
  clearTimeout(timer);
  timers.delete(scope);
  const nodes = useSchemaTreeStore.getState().trees[scope];
  if (nodes) pushScope(scope, nodes);
}

function flushAll(): void {
  for (const scope of [...timers.keys()]) flushScope(scope);
}

// Seed/re-adopt this client's tree for every resource's request body and
// response statuses from server-authoritative data (initial snapshot, REST
// mutation echo, or WS broadcast). Marks each touched scope as suppressed
// first so the resulting store change isn't mistaken for a new local edit.
export function seedSchemaTreesFromResources(resources: Resource[]): void {
  const scopes: Record<string, SchemaNode[]> = {};
  for (const resource of resources) {
    const reqScope = `${resource.id}${REQ_SUFFIX}`;
    scopes[reqScope] = seedFromFields(resource.fields);
    for (const response of resource.responses ?? []) {
      scopes[`${resource.id}::res::${response.status}`] = seedFromFields(response.fields);
    }
  }
  const keys = Object.keys(scopes);
  if (keys.length === 0) return;
  for (const scope of keys) suppressed.add(scope);
  useSchemaTreeStore.getState().adoptScopes(scopes);
}

// Subscribe once (call from a top-level client component's mount effect,
// after the tree store's own localStorage hydrate) to debounce-save every
// local tree edit to the backend.
export function initSchemaTreeSync(): void {
  if (started) return;
  started = true;
  previousTrees = useSchemaTreeStore.getState().trees;

  useSchemaTreeStore.subscribe((state) => {
    const trees = state.trees;
    if (trees === previousTrees) return;
    const prev = previousTrees;
    previousTrees = trees;
    for (const scope of Object.keys(trees)) {
      if (trees[scope] === prev[scope]) continue;
      if (suppressed.has(scope)) {
        suppressed.delete(scope);
        continue;
      }
      const existing = timers.get(scope);
      if (existing) clearTimeout(existing);
      timers.set(
        scope,
        setTimeout(() => {
          timers.delete(scope);
          const nodes = useSchemaTreeStore.getState().trees[scope];
          if (nodes) pushScope(scope, nodes);
        }, DEBOUNCE_MS),
      );
    }
  });

  if (typeof window !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushAll();
    });
    window.addEventListener("beforeunload", flushAll);
  }
}
