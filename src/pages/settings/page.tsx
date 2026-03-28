import * as React from "react";
import {
  ArrowUpCircle,
  BellRing,
  CheckCircle2,
  Download,
  FileText,
  Info,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import { getAppShellPageMeta } from "@/config/app-shell";
import { siteConfig } from "@/config/site-config";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useUpdateSettings } from "@/hooks/use-update-settings";
import { useUpdater } from "@/hooks/use-updater";

function formatDateTime(date: string | null | undefined) {
  if (!date) {
    return "Chưa kiểm tra";
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Không xác định";
  }

  return parsedDate.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "Không xác định";
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Không xác định";
  }

  return parsedDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function DetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-4 py-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-right text-sm font-medium">{value}</span>
      </div>
      {!isLast && <Separator />}
    </>
  );
}

function SettingRow({
  title,
  description,
  action,
  isLast = false,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {!isLast && <Separator />}
    </>
  );
}

export function SettingsPage() {
  const pageMeta = getAppShellPageMeta(siteConfig.routes.settings);
  const PageIcon = pageMeta.icon;
  const {
    updateInfo,
    isChecking,
    isDownloading,
    error,
    isUpdateReady,
    isUpdateDeferred,
    deferredReason,
    lastCheckedAt,
    checkForUpdates,
    quitAndInstall,
  } = useUpdater();
  const { settings, toggleAutoNotify, setLastChecked } = useUpdateSettings();
  const [checkStatus, setCheckStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [isInstalling, setIsInstalling] = React.useState(false);

  const handleCheckForUpdates = async () => {
    try {
      const result = await checkForUpdates();
      if (!result.isUpdateDeferred) {
        setLastChecked();
      }
      setCheckStatus(result.error ? "error" : result.isUpdateDeferred ? "idle" : "success");
    } catch {
      setCheckStatus("error");
    }
  };

  const handleInstallUpdate = async () => {
    try {
      setIsInstalling(true);
      await quitAndInstall();
    } catch (installError) {
      console.error("Failed to install update:", installError);
      setIsInstalling(false);
    }
  };

  const lastChecked = settings.lastCheckedAt || lastCheckedAt;
  const discoveredUpdateLabel = updateInfo.newVersion
    ? `phiên bản ${updateInfo.newVersion}`
    : "một bản cập nhật mới";
  const statusLabel = error
    ? "Lỗi"
    : isUpdateDeferred
      ? "Tạm chờ"
    : isUpdateReady
      ? "Sẵn sàng"
      : isDownloading
        ? "Đang tải"
        : updateInfo.hasUpdate
          ? "Có bản mới"
          : "Mới nhất";
  const statusVariant = error
    ? "destructive"
    : isUpdateDeferred
      ? "secondary"
    : updateInfo.hasUpdate || isDownloading || isUpdateReady
      ? "default"
      : "secondary";
  const statusDescription = error
    ? error
    : isUpdateDeferred
      ? deferredReason || "Ứng dụng sẽ sẵn sàng kiểm tra cập nhật sau ít giây nữa."
    : isUpdateReady
      ? "Bản cập nhật đã tải xong."
      : isDownloading
        ? "Ứng dụng đang tải bản cập nhật ở nền."
        : updateInfo.hasUpdate
          ? `Đã tìm thấy ${discoveredUpdateLabel}.`
          : "Bạn đang dùng bản mới nhất.";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ứng dụng"
        title="Cài đặt"
        description="Quản lý cập nhật và một số tùy chọn của ứng dụng."
        icon={<PageIcon className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {error ? (
                      <Info className="h-5 w-5 text-destructive" />
                    ) : isUpdateReady ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isDownloading ? (
                      <Download className="h-5 w-5" />
                    ) : updateInfo.hasUpdate ? (
                      <ArrowUpCircle className="h-5 w-5" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                    Cập nhật
                  </CardTitle>
                  <CardDescription>{statusDescription}</CardDescription>
                </div>

                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Không thể kiểm tra bản mới</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!error && isUpdateDeferred && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Đang chờ dịch vụ cập nhật sẵn sàng</AlertTitle>
                  <AlertDescription>{deferredReason}</AlertDescription>
                </Alert>
              )}

              {!error && !isUpdateDeferred && checkStatus === "success" && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Đã kiểm tra xong</AlertTitle>
                  <AlertDescription>
                    {updateInfo.hasUpdate
                      ? `Đã tìm thấy ${discoveredUpdateLabel}.`
                      : "Ứng dụng đang ở phiên bản mới nhất."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {isUpdateReady ? (
                  <Button onClick={handleInstallUpdate} disabled={isInstalling} className="sm:w-auto">
                    {isInstalling ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Đang cài đặt...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Cài đặt
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleCheckForUpdates}
                    disabled={isChecking || isUpdateDeferred}
                    className="sm:w-auto"
                  >
                    {isChecking ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Đang kiểm tra...
                      </>
                    ) : isUpdateDeferred ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Vui lòng đợi...
                      </>
                    ) : (
                      <>
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                        Kiểm tra bản mới
                      </>
                    )}
                  </Button>
                )}

                <Button variant="outline" disabled className="sm:w-auto">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {updateInfo.canAutoUpdate
                    ? "Nhận cập nhật tự động"
                    : "Chỉ có trên bản cài đặt"}
                </Button>
              </div>

              <Separator />

              <div className="space-y-1">
                <DetailRow label="Phiên bản đang dùng" value={updateInfo.currentVersion} />
                <DetailRow
                  label="Phiên bản mới"
                  value={updateInfo.hasUpdate ? updateInfo.newVersion || "Đang xác nhận" : "Chưa có"}
                />
                <DetailRow label="Ngày phát hành" value={formatDate(updateInfo.releaseDate)} />
                <DetailRow label="Lần kiểm tra gần nhất" value={formatDateTime(lastChecked)} isLast />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Thông báo</CardTitle>
              </div>
              <CardDescription>Tùy chọn liên quan đến bản cập nhật.</CardDescription>
            </CardHeader>

            <CardContent>
              <SettingRow
                title="Báo khi có bản mới"
                description="Hiện hộp thoại khi ứng dụng tìm thấy bản cập nhật."
                action={
                  <Switch
                    checked={settings.autoNotifyOnStartup}
                    onCheckedChange={toggleAutoNotify}
                  />
                }
                isLast
              />
            </CardContent>
          </Card>

          {updateInfo.releaseNotes && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>Nội dung bản mới</CardTitle>
                </div>
                <CardDescription>Các thay đổi trong bản cập nhật.</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="rounded-md border bg-muted/20 p-4">
                  <p className="mb-2 text-sm font-medium">
                    {updateInfo.releaseName || "Bản cập nhật mới"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {updateInfo.releaseNotes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Trạng thái</CardTitle>
              </div>
              <CardDescription>Thông tin nhanh về bản cập nhật.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">Trạng thái</span>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <BellRing className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Thông báo cập nhật</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.autoNotifyOnStartup ? "Đang bật" : "Đang tắt"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <Download className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Cập nhật tự động</p>
                    <p className="text-sm text-muted-foreground">
                      {updateInfo.canAutoUpdate
                        ? "Bản cài đặt có thể nhận bản mới tự động."
                        : "Bạn đang ở môi trường dev hoặc bản build chưa phát hành."}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Giới thiệu</CardTitle>
              </div>
              <CardDescription>Thông tin cơ bản của ứng dụng.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-1">
              <DetailRow label="Tên ứng dụng" value="Dropshipping Tools" />
              <DetailRow label="Tác giả" value="An Lee Dai" />
              <DetailRow label="Nguồn cập nhật" value="GitHub Releases" isLast />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
