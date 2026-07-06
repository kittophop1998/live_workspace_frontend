"use client";

import { Box, type SxProps, type Theme } from "@mui/material";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { blue, line, secondaryText, ink } from "@/components/theme";

// ─────────────────────────────────────────────────────────────────────────────
// PixelTabs — clean horizontal tabs with a single lavender underline that slides
// smoothly to the active tab. Keyboard-navigable (arrow keys / Home / End).
// Text is a normal sans font; only the motion is the accent.
// ─────────────────────────────────────────────────────────────────────────────

export interface PixelTabItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export function PixelTabs<T extends string>({
  tabs,
  value,
  onChange,
  sx,
}: {
  tabs: PixelTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  sx?: SxProps<Theme>;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = refs.current[value];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, tabs]);

  const move = (dir: 1 | -1) => {
    const i = tabs.findIndex((t) => t.value === value);
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    onChange(next.value);
    refs.current[next.value]?.focus();
  };

  return (
    <Box role="tablist" aria-orientation="horizontal" sx={{ position: "relative", display: "flex", gap: 0.25, borderBottom: `1px solid ${line}`, ...sx }}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Box
            key={t.value}
            component="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[t.value] = el;
            }}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
              else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
              else if (e.key === "Home") { e.preventDefault(); onChange(tabs[0].value); refs.current[tabs[0].value]?.focus(); }
              else if (e.key === "End") { e.preventDefault(); const last = tabs[tabs.length - 1]; onChange(last.value); refs.current[last.value]?.focus(); }
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              px: 1.25,
              py: 1,
              flexShrink: 0,
              whiteSpace: "nowrap",
              border: `1px solid ${active ? line : "transparent"}`,
              borderBottom: "none",
              borderRadius: 0,
              background: active ? "#F7F5FF" : "none",
              cursor: "pointer",
              font: "inherit",
              fontSize: 13.5,
              fontWeight: 700,
              color: active ? ink : secondaryText,
              transition: "color .15s ease",
              "&:hover": { color: ink },
              "&:focus-visible": { outline: `2px solid ${blue}`, outlineOffset: 2 },
            }}
          >
            {t.icon}
            {t.label}
          </Box>
        );
      })}
      {/* sliding lavender underline */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: -1.5,
          height: 3,
          borderRadius: 0,
          bgcolor: blue,
          left: indicator.left,
          width: indicator.width,
          transition: "left .25s cubic-bezier(.4,0,.2,1), width .25s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </Box>
  );
}
