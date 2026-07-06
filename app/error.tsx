"use client";

// Route-level error boundary. Without this, any client-side throw (a bad data
// shape from realtime/import, a stale lazy chunk, etc.) escalates to Next's
// full-page "This page couldn't load" global-error and nukes the whole app.
// Here we contain it to a recoverable card, and — importantly — surface the real
// error + stack so the underlying throw can be diagnosed instead of guessed at.

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Full stack goes to the browser console for diagnosis.
    console.error("[workspace error boundary]", error);

    // Stale/failed JS chunk after a redeploy is a common "sometimes" cause —
    // a one-time hard reload fetches the fresh chunk.
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      /Loading chunk [\d]+ failed|import\(\) failed|dynamically imported module/i.test(
        error?.message ?? "",
      );
    if (isChunkError && typeof window !== "undefined") {
      const key = "workspace:chunk-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#F8F7F4",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        color: "#2E2E2E",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#FFFFFF",
          border: "1px solid #E9E2D0",
          borderRadius: 16,
          padding: "28px 28px 24px",
          boxShadow:
            "0 1px 2px rgba(46,46,46,0.05), 0 8px 28px rgba(46,46,46,0.08)",
        }}
      >
        <div style={{ fontSize: 34, lineHeight: 1, marginBottom: 12 }}>😵‍💫</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
          หน้านี้สะดุดนิดหน่อย
        </h1>
        <p style={{ fontSize: 14, color: "#6D6D6D", margin: "0 0 18px" }}>
          เกิดข้อผิดพลาดตอนเปิดหน้านี้ ลองใหม่ได้เลย — งานที่เซฟไว้ไม่หาย
        </p>

        {(error?.message || error?.digest) && (
          <pre
            style={{
              margin: "0 0 18px",
              padding: "10px 12px",
              background: "#FBE7E7",
              border: "1px solid #F0C9C9",
              borderRadius: 10,
              fontSize: 12,
              fontFamily: "var(--font-mono, monospace)",
              color: "#B4524F",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowX: "auto",
            }}
          >
            {error?.message || "Unknown error"}
            {error?.digest ? `\ndigest: ${error.digest}` : ""}
          </pre>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              if (typeof window !== "undefined")
                sessionStorage.removeItem("workspace:chunk-reload");
              reset();
            }}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background: "#8B7CF6",
            }}
          >
            ลองใหม่
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            style={{
              cursor: "pointer",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 700,
              color: "#2E2E2E",
              background: "#FFFFFF",
              border: "1px solid #E9E2D0",
            }}
          >
            รีโหลดหน้า
          </button>
        </div>
      </div>
    </div>
  );
}
