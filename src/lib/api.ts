import axios, { type AxiosInstance } from "axios";

// This app has NO backend of its own. Axios is used only for optional OUTGOING
// integrations — e.g. pushing a generated schema/mock to a webhook (Slack, n8n,
// a mock server). Base URL is configurable; calls degrade gracefully if unset.
export const httpClient: AxiosInstance = axios.create({
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL ?? "";

export interface WebhookResult {
  ok: boolean;
  message: string;
}

// Post a generated payload to the configured webhook. When no URL is set we
// simulate a successful round-trip so the export flow is demoable offline.
export async function pushToWebhook(payload: unknown): Promise<WebhookResult> {
  if (!WEBHOOK_URL) {
    await new Promise((r) => setTimeout(r, 450));
    return { ok: true, message: "Simulated: set NEXT_PUBLIC_WEBHOOK_URL to POST for real." };
  }
  try {
    const res = await httpClient.post(WEBHOOK_URL, payload);
    return { ok: true, message: `Sent — ${res.status} ${res.statusText}` };
  } catch (err) {
    const msg = axios.isAxiosError(err) ? err.message : "Unknown error";
    return { ok: false, message: msg };
  }
}
