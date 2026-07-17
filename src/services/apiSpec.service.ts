// Published API spec registry (synced by @live-workspace/cli). Unlike the
// workspace endpoints this wire format is already camelCase and unenveloped
// (backend handler.revisionJSON) — the normalizers only guard shape/defaults.

import axios from "axios";
import { apiClient } from "@/lib/api";
import type { PublishedSpec, SpecRevision } from "@/lib/types";

interface WireSpecRevision {
  id: string;
  number: number;
  status?: string | null;
  contentHash?: string | null;
  sourceFilename?: string | null;
  format?: string | null;
  createdAt?: string | null;
}

interface WirePublishedSpec {
  revision: WireSpecRevision;
  content?: string | null;
}

export function nSpecRevision(w: WireSpecRevision): SpecRevision {
  return {
    id: w.id,
    number: w.number,
    status: w.status ?? "current",
    contentHash: w.contentHash ?? "",
    sourceFilename: w.sourceFilename ?? "",
    format: w.format === "json" ? "json" : "yaml",
    createdAt: w.createdAt ?? "",
  };
}

export function nPublishedSpec(w: WirePublishedSpec): PublishedSpec {
  return { revision: nSpecRevision(w.revision), content: w.content ?? "" };
}

export const apiSpecApi = {
  // Current published spec, or null when the CLI has never synced one (404).
  async getPublished(): Promise<PublishedSpec | null> {
    try {
      const res = await apiClient.get<WirePublishedSpec>("/api-spec");
      return nPublishedSpec(res.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null;
      throw err;
    }
  },

  async listRevisions(): Promise<SpecRevision[]> {
    const res = await apiClient.get<WireSpecRevision[]>("/api-spec/revisions");
    return (res.data ?? []).map(nSpecRevision);
  },
};
