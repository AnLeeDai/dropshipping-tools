import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/page-header";
import { getAppShellPageMeta } from "@/config/app-shell";
import { appVersion, siteConfig } from "@/config/site-config";
import EtsyUpload from "./etsy-upload";

export default function EtsyPDFPage() {
  const pageMeta = getAppShellPageMeta(siteConfig.routes.etsyPdf);
  const PageIcon = pageMeta.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Công cụ"
        title="Etsy PDF"
        description="Tải file PDF để lấy dữ liệu đơn hàng Etsy."
        icon={<PageIcon className="h-5 w-5" />}
        actions={<Badge variant="outline">v{appVersion.etsyPdf}</Badge>}
      />

      <EtsyUpload />
    </div>
  );
}
