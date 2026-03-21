import { FileText, User2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site-config";

const version = "0.0.1";
const title = "Chuyển đổi đơn hàng Etsy sang PDF";

const menuItems = [
  {
    url: siteConfig.routes.etsyPdf,
    name: "Chuyển đổi",
    icon: FileText,
  },
];

export function EtsySidebar() {
  const location = useLocation();

  const isActive = (url: string) => {
    return location.pathname === url;
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <div className="uppercase text-1xl font-semibold">{title}</div>
              <Badge variant="outline">{version}</Badge>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((project) => (
                <SidebarMenuItem key={project.name}>
                  <SidebarMenuButton
                    asChild
                    // className={
                    //   isActive(project.url)
                    //     ? "bg-primary text-primary-foreground"
                    //     : ""
                    // }
                    isActive={isActive(project.url)}
                  >
                    <Link to={project.url}>
                      <project.icon />
                      <span>{project.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <User2 /> Username
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
