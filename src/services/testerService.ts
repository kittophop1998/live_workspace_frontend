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

export async function sendTest(input: TestRequestInput): Promise<TestResult> {
  const res = await apiClient.post("/http/test", {
    method: input.method,
    url: input.url,
    headers: input.headers,
    body: input.body ?? "",
  });
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
