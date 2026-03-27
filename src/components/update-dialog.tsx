import * as React from "react";
import { Download, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUpdater } from "@/hooks/use-updater";
import { useUpdateSettings } from "@/hooks/use-update-settings";

interface UpdateDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UpdateDialog({ open, onOpenChange }: UpdateDialogProps) {
  const { updateInfo, isDownloading, downloadProgress, error, isUpdateReady, quitAndInstall } =
    useUpdater();
  const [isOpen, setIsOpen] = React.useState(open ?? updateInfo.hasUpdate);
  const [isInstalling, setIsInstalling] = React.useState(false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    } else {
      setIsOpen(updateInfo.hasUpdate);
    }
  }, [open, updateInfo.hasUpdate]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleInstall = async () => {
    if (!isUpdateReady) {
      return; // Don't allow install if update not ready
    }
    
    try {
      setIsInstalling(true);
      await quitAndInstall();
    } catch (err) {
      console.error("Failed to install update:", err);
      setIsInstalling(false);
    }
  };

  if (!updateInfo.hasUpdate || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="flex items-start gap-3">
            {isDownloading ? (
              <Download className="h-5 w-5 animate-bounce text-blue-500 mt-1 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-1 shrink-0" />
            )}
            <div>
              <CardTitle>Cập nhật khả dụng</CardTitle>
              <CardDescription className="mt-1">
                Phiên bản mới {updateInfo.newVersion} đã sẵn sàng
              </CardDescription>
            </div>
          </div>
          <button
            onClick={() => handleOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4">
          {updateInfo.currentVersion && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Phiên bản hiện tại:</span>{" "}
                {updateInfo.currentVersion}
              </p>
            </div>
          )}

          {updateInfo.releaseNotes && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium">Ghi chú phát hành:</p>
              <div className="max-h-32 overflow-y-auto text-sm text-muted-foreground">
                {typeof updateInfo.releaseNotes === "string" ? (
                  <p className="whitespace-pre-wrap wrap-break-word">{updateInfo.releaseNotes}</p>
                ) : (
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(updateInfo.releaseNotes, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {isDownloading && downloadProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Đang tải xuống...</span>
                <span className="font-medium">
                  {downloadProgress.percent}%
                </span>
              </div>
              <Progress value={downloadProgress.percent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {(downloadProgress.transferred / 1024 / 1024).toFixed(2)} MB /{" "}
                {(downloadProgress.total / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {!isDownloading && !isUpdateReady ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="flex-1"
                >
                  Để sau
                </Button>
                <Button
                  type="button"
                  disabled
                  className="flex-1 gap-2"
                  title="Đang tải xuống tự động..."
                >
                  <Download className="h-4 w-4" />
                  Đợi tải xong...
                </Button>
              </>
            ) : isDownloading ? (
              <Button disabled className="w-full gap-2">
                <Download className="h-4 w-4 animate-spin" />
                Đang tải xuống...
              </Button>
            ) : isUpdateReady && !isInstalling ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="flex-1"
                >
                  Để sau
                </Button>
                <Button
                  type="button"
                  onClick={handleInstall}
                  className="flex-1 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Cập nhật ngay
                </Button>
              </>
            ) : (
              <Button disabled className="w-full gap-2">
                <Download className="h-4 w-4 animate-spin" />
                Đang cài đặt...
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function UpdateNotifier() {
  const { updateInfo } = useUpdater();
  const { settings, isLoaded } = useUpdateSettings();
  const [showDialog, setShowDialog] = React.useState(false);

  React.useEffect(() => {
    // Only show dialog if:
    // 1. Settings are loaded
    // 2. Auto-notification is enabled
    // 3. There's actually an update available
    if (isLoaded && settings.autoNotifyOnStartup && updateInfo.hasUpdate) {
      setShowDialog(true);
    }
  }, [updateInfo.hasUpdate, settings.autoNotifyOnStartup, isLoaded]);

  if (!showDialog || !updateInfo.hasUpdate) {
    return null;
  }

  return <UpdateDialog open={showDialog} onOpenChange={setShowDialog} />;
}
