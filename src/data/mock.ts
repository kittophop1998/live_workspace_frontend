// Seed data for the Live Workspace. Acts as the initial shared document the first
// time the app loads (before anything is persisted to localStorage). Realistic
// API/DB schemas so the blueprint is meaningful out of the box.

import type { ActivityEvent, Collaborator, Comment, Resource } from "@/lib/types";

// Team members. The current tab adopts one of these identities on mount.
export const SEED_COLLABORATORS: Collaborator[] = [
  { id: "u_ava", name: "Ava Chen", role: "backend", color: "#2563EB" },
  { id: "u_liam", name: "Liam Park", role: "frontend", color: "#DB2777" },
  { id: "u_noah", name: "Noah Reed", role: "backend", color: "#059669" },
  { id: "u_mia", name: "Mia Torres", role: "frontend", color: "#D97706" },
];

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const SEED_RESOURCES: Resource[] = [
  {
    id: "r_user",
    name: "User",
    kind: "model",
    state: "ready",
    updatedAt: ago(8),
    updatedBy: "Ava Chen",
    fields: [
      { id: "f_u_id", key: "id", type: "uuid", required: true, state: "ready", change: "stable" },
      { id: "f_u_email", key: "email", type: "string", required: true, state: "ready", change: "stable" },
      { id: "f_u_name", key: "displayName", type: "string", required: true, state: "ready", change: "stable" },
      { id: "f_u_role", key: "role", type: "enum", required: true, state: "ready", change: "stable", description: "admin | member | viewer" },
      { id: "f_u_created", key: "createdAt", type: "timestamp", required: true, state: "ready", change: "stable" },
      { id: "f_u_avatar", key: "avatarUrl", type: "string", required: false, state: "draft", change: "added", description: "Proposed — CDN URL" },
    ],
  },
  {
    id: "r_create_order",
    name: "createOrder",
    kind: "endpoint",
    method: "POST",
    path: "/api/v1/orders",
    state: "breaking",
    updatedAt: ago(2),
    updatedBy: "Noah Reed",
    fields: [
      { id: "f_o_userId", key: "userId", type: "uuid", required: true, state: "ready", change: "stable" },
      { id: "f_o_items", key: "items", type: "json", required: true, state: "ready", change: "stable", description: "LineItem[]" },
      { id: "f_o_coupon", key: "couponCode", type: "string", required: false, state: "draft", change: "added" },
      { id: "f_o_total", key: "totalCents", type: "number", required: true, state: "breaking", change: "modified", description: "Renamed from `total` (now integer cents)" },
      { id: "f_o_currency", key: "currency", type: "string", required: true, state: "breaking", change: "added", description: "New required field — breaks existing clients" },
      { id: "f_o_legacy", key: "total", type: "number", required: false, state: "breaking", change: "removed", description: "Deprecated — remove after v2 migration" },
    ],
  },
  {
    id: "r_orders_table",
    name: "orders",
    kind: "database",
    state: "draft",
    updatedAt: ago(24),
    updatedBy: "Ava Chen",
    fields: [
      { id: "f_t_id", key: "id", type: "uuid", required: true, state: "ready", change: "stable" },
      { id: "f_t_user", key: "user_id", type: "uuid", required: true, state: "ready", change: "stable" },
      { id: "f_t_status", key: "status", type: "enum", required: true, state: "ready", change: "stable", description: "pending | paid | shipped | cancelled" },
      { id: "f_t_total", key: "total_cents", type: "number", required: true, state: "draft", change: "modified" },
      { id: "f_t_meta", key: "metadata", type: "json", required: false, state: "draft", change: "added" },
    ],
  },
  {
    id: "r_get_user",
    name: "getUser",
    kind: "endpoint",
    method: "GET",
    path: "/api/v1/users/:id",
    state: "ready",
    updatedAt: ago(120),
    updatedBy: "Liam Park",
    fields: [
      { id: "f_g_id", key: "id", type: "uuid", required: true, state: "ready", change: "stable" },
      { id: "f_g_include", key: "include", type: "string[]", required: false, state: "ready", change: "stable", description: "e.g. ['orders','profile']" },
    ],
  },
];

export const SEED_ACTIVITY: ActivityEvent[] = [
  { id: "a1", actor: "Noah Reed", verb: "flagged", target: "currency", resourceId: "r_create_order", at: ago(2) },
  { id: "a2", actor: "Noah Reed", verb: "renamed", target: "total → totalCents", resourceId: "r_create_order", at: ago(3) },
  { id: "a3", actor: "Ava Chen", verb: "added", target: "avatarUrl", resourceId: "r_user", at: ago(8) },
  { id: "a4", actor: "Ava Chen", verb: "added", target: "metadata", resourceId: "r_orders_table", at: ago(24) },
];

export const SEED_COMMENTS: Comment[] = [
  {
    id: "c1",
    resourceId: "r_create_order",
    fieldId: "f_o_currency",
    author: "Liam Park",
    role: "frontend",
    body: "This will break the web client — we send no currency yet. Can we default to USD server-side for one release?",
    at: ago(1),
  },
  {
    id: "c2",
    resourceId: "r_create_order",
    fieldId: "f_o_currency",
    author: "Noah Reed",
    role: "backend",
    body: "Fair. I'll make it optional with a USD fallback, then required in v2.",
    at: ago(1),
  },
  {
    id: "c3",
    resourceId: "r_user",
    fieldId: "f_u_avatar",
    author: "Mia Torres",
    role: "frontend",
    body: "👍 we already have the upload widget ready for this.",
    at: ago(6),
  },
];
