import * as React from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getAppShellPageMeta } from "@/config/app-shell";

type CachedOutlet = {
  key: string;
  node: React.ReactNode;
};

export default function DefaultLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const pageMeta = getAppShellPageMeta(location.pathname);
  const PageIcon = pageMeta.icon;
  const routeKey = `${location.pathname}${location.search}`;
  const [cachedOutlets, setCachedOutlets] = React.useState<CachedOutlet[]>([]);
  const lastRouteKeyRef = React.useRef(routeKey);
  const scrollPositionsRef = React.useRef<Record<string, number>>({});

  React.useEffect(() => {
    if (!outlet) {
      return;
    }

    setCachedOutlets((prev) => {
      if (prev.some((item) => item.key === routeKey)) {
        return prev;
      }

      return [...prev, { key: routeKey, node: outlet }];
    });
  }, [outlet, routeKey]);

  React.useEffect(() => {
    const previousRouteKey = lastRouteKeyRef.current;
    scrollPositionsRef.current[previousRouteKey] = window.scrollY;
    lastRouteKeyRef.current = routeKey;

    const nextScrollPosition = scrollPositionsRef.current[routeKey] ?? 0;
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: nextScrollPosition, left: 0 });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [routeKey]);

  const renderedOutlets =
    outlet && !cachedOutlets.some((item) => item.key === routeKey)
      ? [...cachedOutlets, { key: routeKey, node: outlet }]
      : cachedOutlets;

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />

      <SidebarInset className="bg-muted/30">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger />

          <div className="flex min-w-0 flex-1 items-center gap-3 pl-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/30 text-muted-foreground">
              <PageIcon className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{pageMeta.title}</p>
              <p className="truncate text-xs text-muted-foreground">{pageMeta.description}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6">
          {renderedOutlets.map((item) => {
            const isActive = item.key === routeKey;

            return (
              <div key={item.key} hidden={!isActive} aria-hidden={!isActive}>
                {item.node}
              </div>
            );
          })}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
