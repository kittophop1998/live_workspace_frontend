"use client";

import { Box, CircularProgress, CssBaseline, ThemeProvider, Typography } from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { pathScreens, tabForScreen } from "@/lib/routes";
import { useKingdomStore, type Tab } from "@/lib/store";
import { useGameTick } from "@/lib/useGameTick";
import { ResourceBar } from "./ResourceBar";
import { theme } from "./theme";

const NAV: { tab: Tab; label: string; icon: string }[] = [
  { tab: "village", label: "Village", icon: "🏘️" },
  { tab: "citizens", label: "Citizens", icon: "👥" },
  { tab: "buildings", label: "Buildings", icon: "🏗️" },
  { tab: "events", label: "Events", icon: "📜" },
  { tab: "policies", label: "Policies", icon: "📐" },
];

export function GameLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const ready = useKingdomStore((s) => s.ready);
  const tab = useKingdomStore((s) => s.tab);
  const setTab = useKingdomStore((s) => s.setTab);
  const loadGame = useKingdomStore((s) => s.loadGame);
  const events = useKingdomStore((s) => s.events);

  useGameTick();

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  // URL → screen sync
  useEffect(() => {
    const routeScreen = pathScreens[pathname];
    if (routeScreen && routeScreen !== useKingdomStore.getState().screen) {
      useKingdomStore.setState({ screen: routeScreen, tab: tabForScreen(routeScreen) });
    }
  }, [pathname]);

  // store.go/setTab → URL sync
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent<{ path?: string }>).detail?.path;
      if (path && path !== window.location.pathname) router.push(path);
    };
    window.addEventListener("kingdom:navigate", handler);
    return () => window.removeEventListener("kingdom:navigate", handler);
  }, [router]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100dvh", bgcolor: "#F5ECD8" }}>
        <ResourceBar />
        <Box sx={{ mx: "auto", maxWidth: 1240, display: "flex", gap: 2, px: { xs: 1.5, lg: 2 }, pt: 2, pb: { xs: 11, lg: 4 } }}>
          {/* Desktop sidebar */}
          <Box
            component="nav"
            sx={{ display: { xs: "none", lg: "flex" }, flexDirection: "column", gap: 0.5, width: 184, flexShrink: 0, position: "sticky", top: 78, alignSelf: "flex-start" }}
          >
            <Typography variant="caption" sx={{ px: 1, mb: 0.5, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
              Kingdom
            </Typography>
            {NAV.map((n) => (
              <NavItem key={n.tab} active={tab === n.tab} icon={n.icon} label={n.label} badge={n.tab === "events" ? events.length : 0} onClick={() => setTab(n.tab)} />
            ))}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {ready ? children : (
              <Box sx={{ display: "grid", placeItems: "center", minHeight: "50vh", gap: 1.5 }}>
                <CircularProgress sx={{ color: "#D9A441" }} />
                <Typography variant="caption">Waking the kingdom…</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Mobile bottom nav */}
        <Box
          component="nav"
          sx={{
            display: { xs: "flex", lg: "none" },
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 40,
            bgcolor: "rgba(255,253,246,0.96)",
            backdropFilter: "blur(8px)",
            borderTop: "1px solid #E7DCC2",
            px: 0.5,
            pb: "calc(env(safe-area-inset-bottom, 0px))",
          }}
        >
          {NAV.map((n) => (
            <Box
              key={n.tab}
              component="button"
              onClick={() => setTab(n.tab)}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.25,
                py: 1,
                bgcolor: "transparent",
                border: "none",
                cursor: "pointer",
                color: tab === n.tab ? "#B9842B" : "#A99C82",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 19, filter: tab === n.tab ? "none" : "grayscale(0.4)" }}>{n.icon}</span>
              <Typography sx={{ fontSize: 10, fontWeight: tab === n.tab ? 800 : 600 }}>{n.label}</Typography>
              {n.tab === "events" && events.length ? (
                <Box sx={{ position: "absolute", top: 4, right: "30%", width: 7, height: 7, borderRadius: "50%", bgcolor: "#D9534F" }} />
              ) : null}
            </Box>
          ))}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function NavItem({ active, icon, label, badge, onClick }: { active: boolean; icon: string; label: string; badge: number; onClick: () => void }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.25,
        py: 1,
        borderRadius: 2.5,
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        bgcolor: active ? "#FBF1D8" : "transparent",
        color: active ? "#B9842B" : "#6B6151",
        fontWeight: active ? 800 : 600,
        transition: "background .12s ease",
        "&:hover": { bgcolor: active ? "#FBF1D8" : "rgba(0,0,0,0.03)" },
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 14, flex: 1 }}>{label}</span>
      {badge ? <Box sx={{ minWidth: 18, height: 18, px: 0.5, display: "grid", placeItems: "center", borderRadius: 999, bgcolor: "#D9534F", color: "#fff", fontSize: 11, fontWeight: 800 }}>{badge}</Box> : null}
    </Box>
  );
}
