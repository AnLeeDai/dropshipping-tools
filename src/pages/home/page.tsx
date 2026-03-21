import { FileText, GitCompare } from "lucide-react";

import CardFeatures from "@/components/card-features";
import { siteConfig } from "@/config/site-config";
import { ModeToggle } from "@/components/mode-toggle";

const features = [
  {
    icons: <FileText className="w-6 h-6" />,
    title: "Chuyển đổi đơn hàng Etsy sang PDF",
    description: "Chuyển đổi đơn hàng Etsy từ PDF sang Google Sheet.",
    redirectUrl: siteConfig.routes.etsyPdf,
    isDisabled: false,
  },
  {
    icons: <GitCompare className="w-6 h-6" />,
    title: "So sánh sản phẩm",
    description: "So sánh thông tin và đặc điểm giữa các sản phẩm.",
    redirectUrl: siteConfig.routes.compare,
    isDisabled: true,
  },
];

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center gap-5 items-center">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Danh sách tính năng</h1>
          <p className="text-muted-foreground mt-2">
            Chọn chức năng bạn muốn truy cập
          </p>
        </div>

        <ModeToggle />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <CardFeatures
            key={index}
            icons={feature.icons}
            title={feature.title}
            description={feature.description}
            redirectUrl={feature.redirectUrl}
            isDisabled={feature.isDisabled}
          />
        ))}
      </div>
    </div>
  );
}
