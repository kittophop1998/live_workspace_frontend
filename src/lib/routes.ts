import type { Screen, Tab } from "@/lib/store";

// Screen ↔ path mapping. Navigation is store-driven (store.go / store.setTab emit
// a `kingdom:navigate` event that GameLayout syncs to the URL).
export const screenPaths: Record<Screen, string> = {
  village: "/",
  citizens: "/citizens",
  buildings: "/buildings",
  events: "/events",
  policies: "/policies",
};

export const pathScreens = Object.fromEntries(
  Object.entries(screenPaths).map(([screen, path]) => [path, screen]),
) as Record<string, Screen>;

export const tabScreens: Record<Tab, Screen> = {
  village: "village",
  citizens: "citizens",
  buildings: "buildings",
  events: "events",
  policies: "policies",
};

export function tabForScreen(screen: Screen): Tab {
  return screen;
}
