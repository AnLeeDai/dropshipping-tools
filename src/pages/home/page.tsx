import { FileText, GitCompare, Grid2X2, LayoutDashboard, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CardFeatures from "@/components/card-features";
import PageHeader from "@/components/page-header";
import { getAppShellPageMeta } from "@/config/app-shell";
import { siteConfig } from "@/config/site-config";

const features = [
  {
    icons: <FileText className="h-5 w-5" />,
    title: "Tách dữ liệu đơn Etsy",
    description: "Tải nhiều file PDF, lấy dữ liệu đơn hàng và sao chép kết quả.",
    redirectUrl: siteConfig.routes.etsyPdf,
    isDisabled: false,
  },
  {
    icons: <GitCompare className="h-5 w-5" />,
    title: "So sánh sản phẩm",
    description: "Đối chiếu thông tin sản phẩm trước khi đăng bán.",
    redirectUrl: siteConfig.routes.compare,
    isDisabled: true,
  },
];

export default function HomePage() {
  const pageMeta = getAppShellPageMeta(siteConfig.routes.home);
  const PageIcon = pageMeta.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trang chính"
        title="Tổng quan"
        description="Mở nhanh các công cụ đang có trong ứng dụng."
        icon={<PageIcon className="h-5 w-5" />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Đang dùng được</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">1</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Chức năng có thể mở và dùng ngay.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Sắp có</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">1</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Chức năng đang được hoàn thiện thêm.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Grid2X2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Công cụ</CardTitle>
          </div>
          <CardDescription>Chọn công cụ bạn muốn mở.</CardDescription>
        </CardHeader>
        <CardContent className="grid items-start gap-4 pb-4 lg:grid-cols-2">
          {features.map((feature) => (
            <CardFeatures
              key={feature.title}
              icons={feature.icons}
              title={feature.title}
              description={feature.description}
              redirectUrl={feature.redirectUrl}
              isDisabled={feature.isDisabled}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
