import { Outlet, Link, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site-config";

export default function DefaultLayout() {
  const location = useLocation();
  const isHome = location.pathname === siteConfig.routes.home;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container max-w-full mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Dropshipping Tools</h1>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Link to={siteConfig.routes.settings}>
              <Button variant="ghost" size="icon" title="Cài đặt">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="bg-background">
        <Outlet />
      </main>
    </div>
  );
}
