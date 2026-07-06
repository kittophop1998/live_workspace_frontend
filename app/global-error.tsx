"use client";

// Last-resort boundary for errors thrown in the root layout itself (where the
// route-level error.tsx can't render). Must ship its own <html>/<body>.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[workspace global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#F8F7F4",
          fontFamily: "system-ui, sans-serif",
          color: "#2E2E2E",
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid #E9E2D0",
            borderRadius: 16,
            padding: 28,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 34, marginBottom: 12 }}>😵‍💫</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
            เกิดข้อผิดพลาด
          </h1>
          <p style={{ fontSize: 14, color: "#6D6D6D", margin: "0 0 18px" }}>
            {error?.message || "Unknown error"}
          </p>
          <button
            onClick={() => reset()}
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
        </div>
      </body>
    </html>
  );
}
