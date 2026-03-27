import { Grid2X2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { appShellNavigation } from "@/config/app-shell";

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="group-data-[collapsible=icon]:items-center">
        <div className="flex w-full items-start justify-between gap-2 rounded-lg border bg-sidebar-accent/30 p-3 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <div className="flex min-w-0 items-start gap-3 group-data-[collapsible=icon]:items-center">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-sidebar-background group-data-[collapsible=icon]:size-10">
              <Grid2X2 className="h-4 w-4" />
            </div>

            <div className="min-w-0 space-y-1 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold">Dropshipping Tools</p>
              <p className="text-xs text-sidebar-foreground/70">Bộ công cụ</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-1">
        <SidebarGroup className="pt-0">
          <SidebarGroupLabel>Chức năng</SidebarGroupLabel>
          <SidebarGroupContent className="pt-3">
            <SidebarMenu className="gap-2">
              {appShellNavigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? location.pathname === item.href
                    : location.pathname === item.href ||
                      location.pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link to={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:items-center">
        <div className="flex w-full items-center justify-between gap-2 rounded-lg border bg-sidebar-accent/20 p-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">Giao diện</p>
            <p className="truncate text-xs text-sidebar-foreground/70">
              Sáng, tối hoặc theo hệ thống
            </p>
          </div>

          <ModeToggle />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
