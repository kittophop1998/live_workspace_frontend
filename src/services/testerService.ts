// Sends a single test request through the backend proxy (POST /http/test). The
// proxy avoids browser CORS/mixed-content limits (a direct fetch fails on any
// cross-origin or http target when the page is served over https, e.g. Railway)
// and measures server-observed latency. This is the only place that knows the
// /http/test wire shape (snake_case → camelCase).

import { apiClient, unwrap } from "@/lib/api";

export interface TestRequestInput {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface TestResult {
  status: number;
  durationMs: number;
  headers: Record<string, string[]>;
  body: string;
  size: number;
  truncated: boolean;
  error: string;
}

interface WireTestResult {
  status: number;
  duration_ms: number;
  headers: Record<string, string[]> | null;
  body: string;
  size: number;
  truncated?: boolean;
  error: string;
}

// The server-side executor allows a slow target up to 20s (httpexec.DefaultTimeout).
// Give this one call a longer axios budget than the client's default (8s) so the
// server's own timeout governs and we get a proper `status:0` result instead of the
// client aborting first. Other endpoints keep the snappy default.
const TEST_TIMEOUT_MS = 25_000;

export async function sendTest(input: TestRequestInput): Promise<TestResult> {
  const res = await apiClient.post(
    "/http/test",
    {
      method: input.method,
      url: input.url,
      headers: input.headers,
      body: input.body ?? "",
    },
    { timeout: TEST_TIMEOUT_MS },
  );
  const data = unwrap<WireTestResult>(res.data);
  return {
    status: data.status,
    durationMs: data.duration_ms,
    headers: data.headers ?? {},
    body: data.body,
    size: data.size,
    truncated: Boolean(data.truncated),
    error: data.error,
  };
}
