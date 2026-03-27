import * as React from "react";
import ButtonBack from "@/components/ui/button-back";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useUpdater } from "@/hooks/use-updater";
import { useUpdateSettings } from "@/hooks/use-update-settings";

export function SettingsPage() {
  const { updateInfo, isChecking, error, checkForUpdates } = useUpdater();
  const { settings, toggleAutoNotify, setLastChecked } = useUpdateSettings();
  const [checkStatus, setCheckStatus] = React.useState<"idle" | "checking" | "success" | "error">(
    "idle"
  );

  const handleCheckForUpdates = async () => {
    try {
      setCheckStatus("checking");
      await checkForUpdates();
      setLastChecked();
      setCheckStatus(error ? "error" : "success");
    } catch {
      setCheckStatus("error");
    }
  };

  const formatLastChecked = (date: string | null) => {
    if (!date) return "Chưa kiểm tra";
    const d = new Date(date);
    return d.toLocaleString("vi-VN");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <ButtonBack to="/" />
          <div>
            <h1 className="text-2xl font-bold">Cài đặt</h1>
            <p className="text-sm text-muted-foreground">Quản lý và cập nhật ứng dụng</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto py-8 px-4">

        {/* Updates Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {updateInfo.hasUpdate ? (
                <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
              )}
              Cập nhật ứng dụng
            </CardTitle>
            <CardDescription>
              {updateInfo.hasUpdate
                ? `Phiên bản ${updateInfo.newVersion} có sẵn`
                : "Bạn đang sử dụng phiên bản mới nhất"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Current Version */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phiên bản hiện tại</p>
                <p className="text-lg font-semibold">{updateInfo.currentVersion || "1.0.0"}</p>
              </div>
              {updateInfo.newVersion && updateInfo.hasUpdate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phiên bản mới</p>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {updateInfo.newVersion}
                  </p>
                </div>
              )}
            </div>

            {/* Last checked */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Lần kiểm tra cuối: <span className="font-medium">{formatLastChecked(null)}</span>
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Lỗi</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Success message */}
            {checkStatus === "success" && !updateInfo.hasUpdate && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Ứng dụng đã là phiên bản mới nhất
                </p>
              </div>
            )}

            {/* Auto-notify toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
              <div>
                <p className="font-medium text-sm">Thông báo tự động</p>
                <p className="text-xs text-muted-foreground">
                  Hiển thị cảnh báo khi có phiên bản mới khi khởi động
                </p>
              </div>
              <Switch checked={settings.autoNotifyOnStartup} onCheckedChange={toggleAutoNotify} />
            </div>

            {/* Check button */}
            <Button
              onClick={handleCheckForUpdates}
              disabled={isChecking || checkStatus === "checking"}
              className="w-full gap-2"
              size="lg"
            >
              {isChecking || checkStatus === "checking" ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Kiểm tra cập nhật ngay
                </>
              )}
            </Button>

            {/* Update available action */}
            {updateInfo.hasUpdate && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Phiên bản mới {updateInfo.newVersion} đã sẵn sàng
                </p>
                {updateInfo.releaseNotes && (
                  <div className="text-xs bg-background rounded p-2 max-h-48 overflow-y-auto">
                    <p className="text-muted-foreground whitespace-pre-wrap wrap-break-word">
                      {typeof updateInfo.releaseNotes === "string"
                        ? updateInfo.releaseNotes
                        : JSON.stringify(updateInfo.releaseNotes, null, 2)}
                    </p>
                  </div>
                )}
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Cập nhật sẽ được tải xuống tự động. Bạn sẽ được thông báo khi sẵn sàng cài đặt.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* About Section */}
        <Card className="shadow-sm mt-6">
          <CardHeader>
            <CardTitle>Về ứng dụng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tên ứng dụng</p>
              <p className="text-base font-semibold">Dropshipping Tools</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phiên bản</p>
              <p className="text-base font-semibold">{updateInfo.currentVersion || "1.0.0"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tác giả</p>
              <p className="text-base font-semibold">An Lee Dai</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
