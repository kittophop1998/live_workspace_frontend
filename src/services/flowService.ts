// Typed access to the E2E flow endpoints (api-spec.md §3 /flows*). The ONLY
// place that knows the flow wire format (snake_case ↔ camelCase).

import { apiClient, unwrap } from "@/lib/api";
import type {
  Criterion,
  FlowDefinition,
  FlowOutput,
  FlowRun,
  FlowStep,
  FlowVariable,
  JsonValue,
  StepParameter,
  StepResult,
} from "@/lib/types";

// ---- Wire shapes (snake_case) --------------------------------------------
interface WireVariable { name: string; in: string; value?: JsonValue }
interface WireOutput { name: string; from: string }
interface WireParameter { name: string; in: string; value?: JsonValue }
interface WireCriterion { condition: string; context?: string; type?: string }
interface WireStep {
  id?: string;
  step_id: string;
  description?: string;
  operation_id?: string;
  method?: string;
  path?: string;
  order: number;
  depends_on: string[] | null;
  parameters: WireParameter[] | null;
  request_body?: JsonValue;
  outputs: WireOutput[] | null;
  success_criteria: WireCriterion[] | null;
}
interface WireFlow {
  id?: string;
  workspace_id?: string;
  name: string;
  description: string;
  inputs: WireVariable[] | null;
  steps: WireStep[] | null;
  created_at?: string;
  created_by?: string;
}
interface WireStepResult {
  step_id: string;
  method: string;
  url: string;
  status: number;
  duration_ms: number;
  passed: boolean;
  skipped: boolean;
  failures: string[] | null;
  outputs: Record<string, JsonValue> | null;
  error?: string;
  request_headers?: Record<string, string> | null;
  request_body?: string;
  response?: string;
}
interface WireRun {
  id: string;
  flow_id: string;
  workspace_id: string;
  status: string;
  base_url: string;
  started_at: string;
  finished_at: string;
  steps: WireStepResult[] | null;
}

// ---- Normalizers (wire → domain) -----------------------------------------
const nVariable = (v: WireVariable): FlowVariable => ({ name: v.name, in: v.in, value: v.value });
const nOutput = (o: WireOutput): FlowOutput => ({ name: o.name, from: o.from });
const nParameter = (p: WireParameter): StepParameter => ({ name: p.name, in: p.in, value: p.value });
const nCriterion = (c: WireCriterion): Criterion => ({ condition: c.condition, context: c.context, type: c.type });

const nStep = (s: WireStep): FlowStep => ({
  id: s.id,
  stepId: s.step_id,
  description: s.description,
  operationId: s.operation_id,
  method: s.method,
  path: s.path,
  order: s.order,
  dependsOn: s.depends_on ?? [],
  parameters: (s.parameters ?? []).map(nParameter),
  requestBody: s.request_body,
  outputs: (s.outputs ?? []).map(nOutput),
  successCriteria: (s.success_criteria ?? []).map(nCriterion),
});

const nFlow = (f: WireFlow): FlowDefinition => ({
  id: f.id,
  workspaceId: f.workspace_id,
  name: f.name,
  description: f.description,
  inputs: (f.inputs ?? []).map(nVariable),
  steps: (f.steps ?? []).map(nStep),
  createdAt: f.created_at,
  createdBy: f.created_by,
});

const nStepResult = (s: WireStepResult): StepResult => ({
  stepId: s.step_id,
  method: s.method,
  url: s.url,
  status: s.status,
  durationMs: s.duration_ms,
  passed: s.passed,
  skipped: s.skipped,
  failures: s.failures ?? [],
  outputs: s.outputs ?? {},
  error: s.error,
  requestHeaders: s.request_headers ?? undefined,
  requestBody: s.request_body,
  response: s.response,
});

const nRun = (r: WireRun): FlowRun => ({
  id: r.id,
  flowId: r.flow_id,
  workspaceId: r.workspace_id,
  status: r.status as FlowRun["status"],
  baseUrl: r.base_url,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  steps: (r.steps ?? []).map(nStepResult),
});

// ---- Denormalizer (domain → wire) for save --------------------------------
function toWireFlow(flow: FlowDefinition): WireFlow {
  return {
    name: flow.name,
    description: flow.description,
    inputs: flow.inputs.map((v) => ({ name: v.name, in: v.in, value: v.value })),
    steps: flow.steps.map((s) => ({
      step_id: s.stepId,
      description: s.description,
      operation_id: s.operationId,
      method: s.method,
      path: s.path,
      order: s.order,
      depends_on: s.dependsOn,
      parameters: s.parameters.map((p) => ({ name: p.name, in: p.in, value: p.value })),
      request_body: s.requestBody,
      outputs: s.outputs.map((o) => ({ name: o.name, from: o.from })),
      success_criteria: s.successCriteria.map((c) => ({ condition: c.condition, context: c.context, type: c.type })),
    })),
  };
}

// ---- API methods ----------------------------------------------------------
export const flowService = {
  // Parse an Arazzo document (raw JSON/YAML text) into preview definitions.
  async parse(text: string): Promise<FlowDefinition[]> {
    const res = await apiClient.post("/flows/parse", text, { headers: { "Content-Type": "text/plain" } });
    const data = unwrap<{ flows: WireFlow[] }>(res.data);
    return (data.flows ?? []).map(nFlow);
  },

  async save(flow: FlowDefinition): Promise<FlowDefinition> {
    const res = await apiClient.post("/flows", toWireFlow(flow));
    return nFlow(unwrap<WireFlow>(res.data));
  },

  async list(): Promise<FlowDefinition[]> {
    const res = await apiClient.get("/flows");
    return unwrap<WireFlow[]>(res.data).map(nFlow);
  },

  async get(id: string): Promise<FlowDefinition> {
    const res = await apiClient.get(`/flows/${id}`);
    return nFlow(unwrap<WireFlow>(res.data));
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/flows/${id}`);
  },

  async run(id: string, baseUrl: string, inputs: Record<string, JsonValue>): Promise<FlowRun> {
    const res = await apiClient.post(`/flows/${id}/run`, { base_url: baseUrl, inputs });
    return nRun(unwrap<WireRun>(res.data));
  },

  async listRuns(id: string): Promise<FlowRun[]> {
    const res = await apiClient.get(`/flows/${id}/runs`);
    return unwrap<WireRun[]>(res.data).map(nRun);
  },
};
