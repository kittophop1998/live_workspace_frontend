// Generates a Markdown document from an API Story — the ordered business flow
// built in the Story view. Pure functions, computed client-side like
// specExport.ts — no endpoint needed. Endpoint steps resolve against the
// workspace resources (single source of truth); a dangling reference is
// exported as an explicit "endpoint removed" marker, mirroring the UI.

import type { Story, StoryStep } from "@/lib/apiStory";
import type { Resource } from "@/lib/types";

const esc = (s: string) => s.replace(/\n/g, " ").trim();

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

// Compact one-line overview of the endpoint chain, e.g.
// `POST /auth/login` → `GET /me` → `GET /permissions`
function flowLine(steps: StoryStep[], byId: Map<string, Resource>): string | null {
  const chain = steps
    .filter((s) => s.type === "endpoint")
    .map((s) => {
      const r = s.resourceId ? byId.get(s.resourceId) : undefined;
      if (!r) return "`(removed)`";
      return `\`${r.method ?? "GET"} ${r.path || r.name}\``;
    });
  return chain.length ? chain.join(" → ") : null;
}

export function toMarkdownStory(story: Story, resources: Resource[]): string {
  const byId = new Map(resources.map((r) => [r.id, r]));
  const endpointCount = story.steps.filter((s) => s.type === "endpoint").length;

  const meta = [
    `API Story exported ${new Date().toISOString()}`,
    `${endpointCount} endpoint${endpointCount === 1 ? "" : "s"}`,
    `${story.steps.length} step${story.steps.length === 1 ? "" : "s"}`,
  ].join(" · ");

  const parts: string[] = [`# ${esc(story.name)}`, `> ${meta}`];

  const overview = flowLine(story.steps, byId);
  if (overview) parts.push(`**Flow:** ${overview}`);

  let n = 0; // endpoint steps number continuously across sections
  for (const step of story.steps) {
    if (step.type === "section") {
      parts.push(`## ${esc(step.text || "Section")}`);
      continue;
    }
    if (step.type === "note") {
      if (step.text?.trim()) parts.push(`> ${esc(step.text)}`);
      continue;
    }
    n += 1;
    const r = step.resourceId ? byId.get(step.resourceId) : undefined;
    if (!r) {
      parts.push(`${n}. ⚠️ _Endpoint no longer exists._`);
      continue;
    }
    const lines = [`${n}. **\`${r.method ?? "GET"}\`** \`${r.path || "(no path)"}\` — ${esc(r.name)}`];
    if (step.text?.trim()) lines.push(`   - ${esc(step.text)}`);
    parts.push(lines.join("\n"));
  }

  if (!story.steps.length) parts.push("_No steps._");
  return parts.join("\n\n") + "\n";
}

// Trigger a browser download of the story as a .md file.
export function downloadMarkdownStory(story: Story, resources: Resource[]) {
  const md = toMarkdownStory(story, resources);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `api_story_${slug(story.name) || "untitled"}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
