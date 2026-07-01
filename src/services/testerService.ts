// Sends a single "Try it" request straight from the browser to the target URL.
// The backend exposes no proxy route (POST /http/test → 404), so we fetch the
// target directly and measure client-observed latency. Trade-off: cross-origin
// targets are subject to the browser's CORS policy — a CORS block surfaces as a
// network error below (status 0), which is expected for APIs that don't allow it.

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

const MAX_BODY_BYTES = 1_000_000; // 1 MB — keep the viewer responsive.
const NO_BODY_METHODS = new Set(["GET", "HEAD"]);

function collectHeaders(headers: Headers): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  headers.forEach((value, key) => {
    (out[key] ??= []).push(value);
  });
  return out;
}

export async function sendTest(input: TestRequestInput): Promise<TestResult> {
  const method = input.method.toUpperCase();
  const started = performance.now();

  try {
    const res = await fetch(input.url, {
      method,
      headers: input.headers,
      // fetch forbids a body on GET/HEAD; only attach it when the method allows one.
      body: !NO_BODY_METHODS.has(method) && input.body != null ? input.body : undefined,
      redirect: "follow",
    });

    const full = await res.text();
    const size = new Blob([full]).size;
    const truncated = size > MAX_BODY_BYTES;
    const body = truncated ? full.slice(0, MAX_BODY_BYTES) : full;

    return {
      status: res.status,
      durationMs: Math.round(performance.now() - started),
      headers: collectHeaders(res.headers),
      body,
      size,
      truncated,
      error: "",
    };
  } catch (err) {
    // Network failure, DNS, or (most commonly) a CORS block — the browser hides
    // the real reason, so give an actionable hint.
    const message =
      err instanceof TypeError
        ? "Request failed — the target may be unreachable or blocked by CORS (the browser can't read cross-origin responses that don't allow it)."
        : err instanceof Error
          ? err.message
          : "Request failed";
    return {
      status: 0,
      durationMs: Math.round(performance.now() - started),
      headers: {},
      body: "",
      size: 0,
      truncated: false,
      error: message,
    };
  }
}
