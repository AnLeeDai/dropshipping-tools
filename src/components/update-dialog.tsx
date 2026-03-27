import * as React from "react";
import { ArrowUpCircle, CheckCircle2, Download, FileText, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useUpdateSettings } from "@/hooks/use-update-settings";
import { useUpdater } from "@/hooks/use-updater";

interface UpdateDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function formatReleaseDate(date: string | null | undefined) {
  if (!date) {
    return "Không xác định";
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Không xác định";
  }

  return parsedDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function UpdateDialog({ open, onOpenChange }: UpdateDialogProps) {
  const { updateInfo, isDownloading, error, isUpdateReady, quitAndInstall } = useUpdater();
  const [isOpen, setIsOpen] = React.useState(open ?? updateInfo.hasUpdate);
  const [isInstalling, setIsInstalling] = React.useState(false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
      return;
    }

    setIsOpen(updateInfo.hasUpdate);
  }, [open, updateInfo.hasUpdate]);

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      await quitAndInstall();
    } catch (installError) {
      console.error("Failed to install update:", installError);
      setIsInstalling(false);
    }
  };

  if (!updateInfo.hasUpdate) {
    return null;
  }

  const statusLabel = isUpdateReady ? "Sẵn sàng cài" : isDownloading ? "Đang tải" : "Có bản mới";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isUpdateReady ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : isDownloading ? (
              <Download className="h-5 w-5" />
            ) : (
              <ArrowUpCircle className="h-5 w-5" />
            )}
            <Badge>{statusLabel}</Badge>
          </div>
          <DialogTitle>Có bản cập nhật mới</DialogTitle>
          <DialogDescription>
            {updateInfo.newVersion
              ? `Phiên bản ${updateInfo.newVersion} có thể thay cho bản ${updateInfo.currentVersion}.`
              : "Ứng dụng vừa tìm thấy một bản cập nhật mới."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Phiên bản hiện tại</p>
              <p className="mt-1 font-medium">{updateInfo.currentVersion}</p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Phiên bản mới</p>
              <p className="mt-1 font-medium">{updateInfo.newVersion || "Đang xác nhận"}</p>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Ngày phát hành</p>
            <p className="mt-1 font-medium">{formatReleaseDate(updateInfo.releaseDate)}</p>
          </div>

          {isDownloading && (
            <Alert>
              <Download className="h-4 w-4" />
              <AlertTitle>Đang tải bản cập nhật</AlertTitle>
              <AlertDescription>
                Ứng dụng đang tải bản mới ở nền. Khi tải xong bạn có thể cài đặt ngay.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Có lỗi xảy ra</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {updateInfo.releaseNotes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Thay đổi</p>
                </div>
                <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
                  {updateInfo.releaseNotes}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Để sau
          </Button>

          {isUpdateReady ? (
            <Button type="button" onClick={handleInstall} disabled={isInstalling}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isInstalling ? "Đang cài đặt..." : "Cài đặt"}
            </Button>
          ) : (
            <Button type="button" disabled>
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Đang tải..." : "Đang chuẩn bị..."}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UpdateNotifier() {
  const { updateInfo } = useUpdater();
  const { settings, isLoaded } = useUpdateSettings();
  const [showDialog, setShowDialog] = React.useState(false);

  React.useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (settings.autoNotifyOnStartup && updateInfo.hasUpdate) {
      setShowDialog(true);
    }
  }, [isLoaded, settings.autoNotifyOnStartup, updateInfo.hasUpdate]);

  if (!showDialog || !updateInfo.hasUpdate) {
    return null;
  }

  return <UpdateDialog open={showDialog} onOpenChange={setShowDialog} />;
}
