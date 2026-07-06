"use client";

import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";
import { ink, line, pastel, pastelInk, secondaryText, softShadow, softShadowSm, stateColor, tape as tapeTints } from "@/components/theme";
import { CHIBI, type ChibiName, DoodleSparkle } from "@/components/doodles";
import type { FieldState } from "@/lib/types";

const STATE_LABEL: Record<FieldState, string> = {
  draft: "Draft",
  ready: "Ready",
  breaking: "Breaking!",
};

// Pastel status sticker: [Draft] [Ready] [Breaking!].
export function StateBadge({ state, sx }: { state: FieldState; sx?: SxProps<Theme> }) {
  const t = stateColor[state];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1,
        py: 0.3,
        borderRadius: "999px",
        bgcolor: t.bg,
        color: t.fg,
        border: `1.5px solid ${t.fg}22`,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.01em",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {STATE_LABEL[state]}
    </Box>
  );
}

// Monospace token used for data types & code-like snippets — a taped code chip.
export function MonoTag({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 12,
        fontWeight: 700,
        px: 0.95,
        py: 0.25,
        border: `1.5px solid ${line}`,
        borderRadius: "8px",
        bgcolor: pastel.cream,
        color: ink,
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

// Live clock that re-renders on an interval — for relative timestamps.
export function useNow(intervalMs = 15000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function relativeTime(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Circular monogram for collaborator presence, ringed when online.
export function Avatar({ name, color, online, size = 28 }: { name: string; color: string; online?: boolean; size?: number }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: color,
        color: "#fff",
        fontSize: size * 0.4,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2.5px solid #fff",
        boxShadow: online ? "0 0 0 2.5px #fff, 0 0 0 4.5px #7ED08F" : softShadowSm,
        flexShrink: 0,
      }}
      title={name}
    >
      {initials}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notebook toolkit
// ─────────────────────────────────────────────────────────────────────────────

export type PastelName = keyof typeof pastel;

// A strip of decorative masking tape — absolutely positioned by the caller.
export function WashiTape({ sx, tint }: { sx?: SxProps<Theme>; tint?: string }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        width: 58,
        height: 20,
        bgcolor: tint ?? tapeTints[0],
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
        opacity: 0.9,
        // frayed, semi-transparent tape edges
        maskImage: "linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)",
        ...sx,
      }}
    />
  );
}

// An illustrated label — the little taped tag above a section title.
export function Sticker({
  children,
  color = "yellow",
  sx,
}: {
  children: ReactNode;
  color?: PastelName;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      component="span"
      className="font-hand"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.1,
        py: 0.35,
        borderRadius: "999px",
        bgcolor: pastel[color],
        color: pastelInk[color],
        border: `1.5px solid ${pastelInk[color]}2E`,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.03em",
        lineHeight: 1.4,
        boxShadow: softShadowSm,
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

// A restrained notebook page surface. Forms and text remain conventional;
// the optional tape is reserved for legacy call sites.
export function PaperCard({
  children,
  tilt = 0,
  taped = false,
  tapeTint,
  sx,
}: {
  children: ReactNode;
  tilt?: number;
  taped?: boolean;
  tapeTint?: string;
  sx?: SxProps<Theme>;
}) {
  void tilt;
  return (
    <Box
      sx={{
        position: "relative",
        bgcolor: "#FFFFFF",
        border: `1px solid ${line}`,
        borderRadius: "12px",
        boxShadow: softShadow,
        p: { xs: 2, sm: 3 },
        transition: "transform .15s ease, box-shadow .15s ease",
        ...sx,
      }}
    >
      {taped ? (
        <WashiTape tint={tapeTint} sx={{ top: -10, left: "50%", ml: "-29px", transform: "rotate(-3deg)" }} />
      ) : null}
      {children}
    </Box>
  );
}

// A colorful bookmark tab that sticks out of the notebook.
export function BookmarkTab({
  label,
  icon,
  color,
  active,
  onClick,
  sx,
}: {
  label: ReactNode;
  icon?: ReactNode;
  color: PastelName;
  active?: boolean;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      role="button"
      aria-pressed={active}
      onClick={onClick}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 0.6,
        cursor: "pointer",
        px: 1.6,
        pt: 0.7,
        pb: active ? 1.2 : 0.7,
        mb: active ? "-6px" : 0,
        borderRadius: "12px 12px 0 0",
        bgcolor: active ? pastel[color] : "#FFF6E9",
        color: active ? pastelInk[color] : secondaryText,
        border: `1.5px solid ${active ? `${pastelInk[color]}33` : line}`,
        borderBottom: "none",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
        boxShadow: active ? "0 -3px 10px rgba(120,88,44,0.08)" : "none",
        transform: active ? "translateY(0)" : "translateY(3px)",
        transition: "transform .16s cubic-bezier(.34,1.56,.64,1), background-color .16s ease, color .16s ease",
        animation: "bookmark-slide .25s ease",
        "&:hover": { transform: "translateY(-2px)", color: pastelInk[color], bgcolor: active ? pastel[color] : "#FFEFDC" },
        ...sx,
      }}
    >
      {icon}
      {label}
    </Box>
  );
}

// A rounded speech bubble with a little tail. `tail` picks the corner.
export function SpeechBubble({
  children,
  color = "blue",
  tail = "bottom-left",
  sx,
}: {
  children: ReactNode;
  color?: PastelName;
  tail?: "bottom-left" | "left" | "none";
  sx?: SxProps<Theme>;
}) {
  const tailSx =
    tail === "none"
      ? {}
      : tail === "left"
        ? { top: "50%", left: -7, mt: "-6px" }
        : { bottom: -7, left: 22 };
  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-block",
        px: 1.6,
        py: 1,
        bgcolor: pastel[color],
        color: pastelInk[color],
        border: `1.5px solid ${pastelInk[color]}2E`,
        borderRadius: "16px",
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.5,
        boxShadow: softShadowSm,
        animation: "speech-in .28s cubic-bezier(.34,1.56,.64,1)",
        "&::after":
          tail === "none"
            ? undefined
            : {
                content: '""',
                position: "absolute",
                width: 12,
                height: 12,
                bgcolor: pastel[color],
                borderRight: `1.5px solid ${pastelInk[color]}2E`,
                borderBottom: `1.5px solid ${pastelInk[color]}2E`,
                transform: "rotate(45deg)",
                ...tailSx,
              },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

// A cheerful empty state: chibi character + speech-bubble line + optional action.
// Never says "No data".
export function EmptyState({
  chibi = "cat",
  image,
  imageAlt = "",
  title,
  subtitle,
  action,
  chibiSize = 96,
  imageWidth = 220,
  color = "pink",
  sx,
}: {
  chibi?: ChibiName;
  /** Custom illustration (e.g. /images/no_response.png). Replaces the chibi when set. */
  image?: string;
  imageAlt?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  chibiSize?: number;
  imageWidth?: number;
  color?: PastelName;
  sx?: SxProps<Theme>;
}) {
  const Chibi = CHIBI[chibi];
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 1.5,
        p: 4,
        ...sx,
      }}
    >
      {image ? (
        <Box
          component="img"
          src={image}
          alt={imageAlt}
          className="animate-float"
          sx={{ width: "100%", maxWidth: imageWidth, height: "auto", userSelect: "none", pointerEvents: "none" }}
        />
      ) : (
        <Box sx={{ position: "relative" }} className="animate-float">
          <Chibi size={chibiSize} />
          <DoodleSparkle size={18} style={{ position: "absolute", top: -4, right: -8 }} className="animate-twinkle" />
        </Box>
      )}
      {image ? null : (
        <SpeechBubble color={color} tail="bottom-left" sx={{ mt: 0.5 }}>
          {title}
        </SpeechBubble>
      )}
      {subtitle ? (
        <Typography sx={{ fontSize: 13, color: secondaryText, maxWidth: 280 }}>{subtitle}</Typography>
      ) : null}
      {action ? <Box sx={{ mt: 0.5 }}>{action}</Box> : null}
    </Box>
  );
}
