import { Outlet } from "react-router-dom";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { EtsySidebar } from "../etsy-sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ButtonBack from "@/components/ui/button-back";

export default function EtstPDFLayout() {
  return (
    <SidebarProvider>
      <EtsySidebar />

      <main className="flex-1 px-4 py-6">
        <div className="flex items-center gap-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger />
            </TooltipTrigger>

            <TooltipContent>Đóng mở sidebar</TooltipContent>
          </Tooltip>

          <ButtonBack />
        </div>

        <div className="mt-5">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
