import {
  FileText,
  LayoutDashboard,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { siteConfig } from "./site-config";

export type AppShellRouteKey = "home" | "etsyPdf" | "settings";

type AppShellItem = {
  key: AppShellRouteKey;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const appShellNavigation: AppShellItem[] = [
  {
    key: "home",
    href: siteConfig.routes.home,
    title: "Tổng quan",
    description: "Màn hình chính của ứng dụng.",
    icon: LayoutDashboard,
  },
  {
    key: "etsyPdf",
    href: siteConfig.routes.etsyPdf,
    title: "Etsy PDF",
    description: "Xử lý file PDF đơn hàng Etsy.",
    icon: FileText,
  },
  {
    key: "settings",
    href: siteConfig.routes.settings,
    title: "Cài đặt",
    description: "Cập nhật và tùy chọn ứng dụng.",
    icon: Settings2,
  },
];

export function getAppShellPageMeta(pathname: string) {
  const page =
    appShellNavigation.find((item) => item.href === pathname) ??
    appShellNavigation.find(
      (item) => item.href !== siteConfig.routes.home && pathname.startsWith(item.href),
    ) ??
    appShellNavigation[0];

  return page;
}
