// Per-endpoint workflow status (draft → in progress → testing → done). A
// planning/progress attribute distinct from `Resource.state` (the server-derived
// field rollup: draft | ready | breaking).
//
// This is **server-authored** — persisted as `Resource.status` and synced over the
// WebSocket (api-spec.md §2/§3), read straight off the Resource and written via
// `store.updateEndpoint(id, { status })` → `PATCH /resources/{id}`. This module is
// now just the shared vocabulary (constants + pill styling) used by the header
// picker, the explorer filter, and the graph inspector.

import type { EndpointStatus } from "@/lib/types";

export const ENDPOINT_STATUSES: EndpointStatus[] = ["draft", "inprogress", "testing", "done"];
export const DEFAULT_ENDPOINT_STATUS: EndpointStatus = "draft";

// Shared pill styling — used by the header picker (CenterPanel), the Explorer
// status filter (LeftPanel), and the graph inspector so all stay in sync.
export const ENDPOINT_STATUS_META: Record<EndpointStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "Draft", bg: "#F4F4F5", fg: "#52525B" },
  inprogress: { label: "In Progress", bg: "#DBEAFE", fg: "#1D4ED8" },
  testing: { label: "Testing", bg: "#FEF3C7", fg: "#B45309" },
  done: { label: "Done", bg: "#DCFCE7", fg: "#15803D" },
};
