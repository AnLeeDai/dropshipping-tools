import * as React from "react";
import {
  CheckCircle2,
  Copy,
  Database,
  FileText,
  List,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useStatusMessage } from "@/hooks/use-status-message";
import {
  convertRowsToTabSeparated,
  copyToClipboard,
  validatePdfFile,
} from "@/lib/file-utils";
import EtsyConvert from "./etsy-convert";
import EtsyResult, { type ParsedEtsyRow } from "./etsy-result";

function formatFileSize(fileSize: number) {
  return `${(fileSize / 1024 / 1024).toFixed(2)} MB`;
}

export default function EtsyUpload() {
  const [isDragging, setIsDragging] = React.useState(false);
  const [parsedDataList, setParsedDataList] = React.useState<ParsedEtsyRow[][]>([]);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const {
    files,
    getFileKey,
    updateFileItem,
    removeFile,
    addFiles,
    startProgressSimulation,
    clearAll: clearAllFiles,
  } = useFileUpload();
  const { errorMessage, successMessage, reset, setError, setSuccess } = useStatusMessage();

  const totalRows = parsedDataList.reduce((total, rows) => total + rows.length, 0);
  const completedFiles = files.filter((file) => file.isComplete).length;
  const processingFiles = files.filter((file) => file.isUploading || file.isProcessing).length;

  const handleSetFiles = React.useCallback(
    (selectedFiles: File[] | null): void => {
      reset();

      if (!selectedFiles || selectedFiles.length === 0) {
        return;
      }

      const validFiles = selectedFiles.filter((file) => validatePdfFile(file));

      if (validFiles.length === 0) {
        setError("Vui lòng chọn một hoặc nhiều file PDF hợp lệ.");
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        return;
      }

      if (validFiles.length < selectedFiles.length) {
        setError(`${selectedFiles.length - validFiles.length} file không hợp lệ đã bị bỏ qua.`);
      }

      const newFileItems = validFiles.map((file) => ({
        file,
        progress: 0,
        isUploading: false,
        isProcessing: false,
        isComplete: false,
      }));

      const { duplicates } = addFiles(newFileItems);

      if (duplicates > 0) {
        toast.warning("Một số file đã có trong danh sách.");
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [addFiles, reset, setError],
  );

  const handleChangeFile = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const selectedFiles = event.target.files ? Array.from(event.target.files) : null;
      handleSetFiles(selectedFiles);
    },
    [handleSetFiles],
  );

  const handleRemoveFile = React.useCallback(
    (fileKey: string): void => {
      removeFile(fileKey);
      reset();
    },
    [removeFile, reset],
  );

  const handleOpenFileDialog = React.useCallback((): void => {
    inputRef.current?.click();
  }, []);

  const handleDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((): void => {
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      setIsDragging(false);

      const droppedFiles = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : null;
      handleSetFiles(droppedFiles);
    },
    [handleSetFiles],
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (files.length === 0) {
        setError("Vui lòng chọn ít nhất một file PDF trước khi xử lý.");
        return;
      }

      reset();
      setParsedDataList([]);

      let completedCount = 0;

      files.forEach((fileItem) => {
        const fileKey = getFileKey(fileItem.file);

        updateFileItem(fileKey, {
          isUploading: true,
          progress: 0,
          isProcessing: false,
          isComplete: false,
          error: undefined,
        });

        startProgressSimulation(fileKey, () => {
          completedCount += 1;
          if (completedCount === files.length) {
            setSuccess(`Đã xử lý ${files.length} file.`);
          }
        });
      });
    },
    [files, getFileKey, reset, setError, setSuccess, startProgressSimulation, updateFileItem],
  );

  const handleParsed = React.useCallback((data: ParsedEtsyRow[]): void => {
    if (data.length > 0) {
      setParsedDataList((prev) => [...prev, data]);
    }
  }, []);

  const handleClearAll = React.useCallback((): void => {
    clearAllFiles();
    setParsedDataList([]);
    reset();
  }, [clearAllFiles, reset]);

  const handleCopyAllContent = React.useCallback((): void => {
    if (parsedDataList.length === 0) {
      toast.error("Chưa có dữ liệu để sao chép.");
      return;
    }

    const fullContent = parsedDataList
      .map((rows) => convertRowsToTabSeparated(rows))
      .join("\n");

    copyToClipboard(fullContent)
      .then(() => {
        toast.success(`Đã sao chép dữ liệu từ ${parsedDataList.length} file.`);
      })
      .catch(() => {
        toast.error("Không thể sao chép dữ liệu.");
      });
  }, [parsedDataList]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">File đã thêm</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{files.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Số file đang có trong hàng đợi.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Đã xong</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{completedFiles}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              File đã đọc xong và có dữ liệu.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Dòng dữ liệu</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalRows}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tổng số dòng lấy được từ các file.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Thêm file PDF</CardTitle>
              </div>
              <CardDescription>
                Kéo thả file vào đây hoặc bấm chọn để đưa vào hàng đợi.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="etsy-upload-file">File đầu vào</Label>

                <Input
                  ref={inputRef}
                  id="etsy-upload-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden"
                  onChange={handleChangeFile}
                />

                <div
                  onClick={handleOpenFileDialog}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
                    isDragging ? "border-primary bg-muted/70" : "bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-background">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">
                    Kéo thả file vào đây hoặc bấm để chọn
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Có thể chọn nhiều file PDF cùng lúc
                  </p>
                </div>
              </div>

              {(errorMessage || successMessage) && (
                <Alert variant={errorMessage ? "destructive" : "default"}>
                  {errorMessage ? <X className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  <AlertTitle>{errorMessage ? "Cần xử lý" : "Đã xong"}</AlertTitle>
                  <AlertDescription>{errorMessage || successMessage}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={files.length === 0 || files.some((file) => file.isUploading || file.isProcessing)}
                  onClick={handleClearAll}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa hết
                </Button>

                <Button
                  type="submit"
                  disabled={files.length === 0 || files.some((file) => file.isUploading || file.isProcessing)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {files.some((file) => file.isUploading)
                    ? "Đang tải lên..."
                    : files.some((file) => file.isProcessing)
                      ? "Đang đọc..."
                      : "Bắt đầu"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Hàng đợi</CardTitle>
            </div>
            <CardDescription>Theo dõi trạng thái từng file.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Đang xử lý</span>
              <Badge variant="outline">{processingFiles}</Badge>
            </div>

            {files.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Chưa có file nào trong hàng đợi.
              </div>
            ) : (
              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {files.map((item) => {
                  const fileKey = getFileKey(item.file);
                  const isProcessing = item.isUploading || item.isProcessing;

                  return (
                    <div key={fileKey} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(item.file.size)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.isComplete && <Badge variant="secondary">Xong</Badge>}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveFile(fileKey)}
                            disabled={isProcessing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isProcessing && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.isUploading ? "Đang tải lên" : "Đang đọc"}</span>
                            <span>{item.progress}%</span>
                          </div>
                          <Progress value={item.progress} />
                        </div>
                      )}

                      {item.error && <p className="mt-3 text-sm text-destructive">{item.error}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {files.map((item) => {
        if (!item.isComplete || !item.file) {
          return null;
        }

        return (
          <EtsyConvert
            key={getFileKey(item.file)}
            file={item.file}
            onParsed={handleParsed}
          />
        );
      })}

      {parsedDataList.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Kết quả</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Dữ liệu được tách theo từng file để kiểm tra hoặc sao chép.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={handleCopyAllContent}>
              <Copy className="mr-2 h-4 w-4" />
              Sao chép tất cả
            </Button>
          </div>

          <div className="space-y-4">
            {parsedDataList.map((data, index) => (
              <EtsyResult key={`${index}-${data.length}`} data={data} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
