import { HashRouter } from "react-router";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateNotifier } from "@/components/update-dialog";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <HashRouter>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider>
          {children}
          <UpdateNotifier />
        </TooltipProvider>
        <Toaster position="top-center" />
      </ThemeProvider>
    </HashRouter>
  );
}
