import * as React from "react";
import { Upload, FileText, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import EtsyConvert from "./etsy-convert";
import EtsyResult, { type ParsedEtsyOrder } from "./etsy-result";

interface FileUploadItem {
  file: File;
  progress: number;
  isUploading: boolean;
  isProcessing: boolean;
  isComplete: boolean;
  error?: string;
}

export default function EtsyUpload() {
  const [files, setFiles] = React.useState<FileUploadItem[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const [parsedDataList, setParsedDataList] = React.useState<ParsedEtsyOrder[]>(
    [],
  );

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const intervalsRef = React.useRef<
    Map<string, ReturnType<typeof setInterval>>
  >(new Map());

  const resetStatus = React.useCallback((): void => {
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  const validatePdfFile = React.useCallback(
    (selectedFile: File | null): boolean => {
      if (!selectedFile) {
        return false;
      }

      const isPdfType = selectedFile.type === "application/pdf";
      const isPdfExtension = selectedFile.name.toLowerCase().endsWith(".pdf");

      if (!isPdfType && !isPdfExtension) {
        return false;
      }

      return true;
    },
    [],
  );

  const getFileKey = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  const handleSetFiles = React.useCallback(
    (selectedFiles: File[] | null): void => {
      resetStatus();

      if (!selectedFiles || selectedFiles.length === 0) {
        return;
      }

      const validFiles = selectedFiles.filter((f) => validatePdfFile(f));

      if (validFiles.length === 0) {
        setErrorMessage("Vui lòng chọn một hoặc nhiều tệp PDF hợp lệ.");
        setSuccessMessage("");
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        return;
      }

      if (validFiles.length < selectedFiles.length) {
        setErrorMessage(
          `${selectedFiles.length - validFiles.length} tệp không hợp lệ (chỉ PDF được hỗ trợ).`,
        );
      }

      const newFileItems: FileUploadItem[] = validFiles.map((file) => ({
        file,
        progress: 0,
        isUploading: false,
        isProcessing: false,
        isComplete: false,
      }));

      // Check for duplicates
      const existingKeys = new Set(files.map((f) => getFileKey(f.file)));
      const uniqueNewFiles = newFileItems.filter(
        (item) => !existingKeys.has(getFileKey(item.file)),
      );

      if (uniqueNewFiles.length < newFileItems.length) {
        toast.warning("Một số tệp đã tồn tại trong danh sách.");
      }

      setFiles((prev) => [...prev, ...uniqueNewFiles]);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [files, resetStatus, validatePdfFile],
  );

  const handleChangeFile = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const selectedFiles = event.target.files
        ? Array.from(event.target.files)
        : null;
      handleSetFiles(selectedFiles);
    },
    [handleSetFiles],
  );

  const handleRemoveFile = React.useCallback(
    (fileKey: string): void => {
      setFiles((prev) =>
        prev.filter((item) => getFileKey(item.file) !== fileKey),
      );
      resetStatus();

      // Clear interval if exists
      const interval = intervalsRef.current.get(fileKey);
      if (interval) {
        clearInterval(interval);
        intervalsRef.current.delete(fileKey);
      }
    },
    [resetStatus],
  );

  const handleOpenFileDialog = React.useCallback((): void => {
    inputRef.current?.click();
  }, []);

  const handleDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      setIsDragging(true);
    },
    [],
  );

  const handleDragLeave = React.useCallback((): void => {
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      setIsDragging(false);

      const droppedFiles = event.dataTransfer.files
        ? Array.from(event.dataTransfer.files)
        : null;
      handleSetFiles(droppedFiles);
    },
    [handleSetFiles],
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (files.length === 0) {
        setErrorMessage(
          "Vui lòng chọn một hoặc nhiều tệp PDF trước khi tải lên.",
        );
        setSuccessMessage("");
        return;
      }

      resetStatus();

      // Process files sequentially
      const processFile = (index: number) => {
        if (index >= files.length) {
          setSuccessMessage(`Đã xử lý ${files.length} tệp thành công.`);
          return;
        }

        const fileItem = files[index];
        const fileKey = getFileKey(fileItem.file);

        // Update file status - uploading
        setFiles((prev) =>
          prev.map((item) =>
            getFileKey(item.file) === fileKey
              ? {
                  ...item,
                  isUploading: true,
                  progress: 0,
                  isProcessing: false,
                }
              : item,
          ),
        );

        let progress = 0;
        const interval = setInterval(() => {
          progress += 25;

          if (progress >= 100) {
            clearInterval(interval);
            intervalsRef.current.delete(fileKey);

            // Update file status - processing
            setFiles((prev) =>
              prev.map((item) =>
                getFileKey(item.file) === fileKey
                  ? {
                      ...item,
                      isUploading: false,
                      isProcessing: true,
                      progress: 100,
                    }
                  : item,
              ),
            );

            // Simulate processing delay
            setTimeout(() => {
              setFiles((prev) =>
                prev.map((item) =>
                  getFileKey(item.file) === fileKey
                    ? {
                        ...item,
                        isProcessing: false,
                        isComplete: true,
                      }
                    : item,
                ),
              );

              // Process next file
              processFile(index + 1);
            }, 500);
          } else {
            setFiles((prev) =>
              prev.map((item) =>
                getFileKey(item.file) === fileKey
                  ? { ...item, progress }
                  : item,
              ),
            );
          }
        }, 120);

        intervalsRef.current.set(fileKey, interval);
      };

      processFile(0);
    },
    [files, resetStatus],
  );

  const handleParsed = React.useCallback(
    (data: ParsedEtsyOrder | null): void => {
      if (data) {
        setParsedDataList((prev) => [...prev, data]);
      }
    },
    [],
  );

  const handleClearAll = React.useCallback((): void => {
    files.forEach((item) => {
      const interval = intervalsRef.current.get(getFileKey(item.file));
      if (interval) {
        clearInterval(interval);
        intervalsRef.current.delete(getFileKey(item.file));
      }
    });

    setFiles([]);
    setParsedDataList([]);
    resetStatus();
  }, [files, resetStatus]);

  const handleCopyAllContent = React.useCallback((): void => {
    if (parsedDataList.length === 0) {
      toast.error("Không có dữ liệu để copy");
      return;
    }

    const lines: string[] = [];

    parsedDataList.forEach((data) => {
      data.items.forEach((item) => {
        lines.push(
          [
            item.title,
            item.sku,
            item.personalization,
            item.quantity,
            item.price,
          ].join("\t")
        );
      });
    });

    const fullContent = lines.join("\n");
    navigator.clipboard.writeText(fullContent).then(() => {
      toast.success(`Đã copy toàn bộ nội dung từ ${parsedDataList.length} file`);
    });
  }, [parsedDataList]);

  React.useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage]);

  React.useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
    }
  }, [successMessage]);

  React.useEffect(() => {
    return () => {
      intervalsRef.current.forEach((interval) => {
        clearInterval(interval);
      });
      intervalsRef.current.clear();
    };
  }, []);

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} className="w-full">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Tải lên tệp Etsy</CardTitle>
            <CardDescription>
              Tải lên tệp PDF để chuyển đổi dữ liệu đơn hàng Etsy.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="etsy-upload-file">Tệp đầu vào</Label>

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
                className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition ${
                  isDragging ? "border-primary bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-5 w-5" />
                </div>

                <p className="text-sm font-medium">
                  Kéo và thả tệp vào đây hoặc bấm để chọn
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chỉ hỗ trợ tệp PDF
                </p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="mb-3">
                  <h3 className="font-medium text-sm">
                    Danh sách tệp ({files.length})
                  </h3>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {files.map((item) => {
                    const fileKey = getFileKey(item.file);
                    const isProcessing = item.isUploading || item.isProcessing;

                    return (
                      <div
                        key={fileKey}
                        className="flex flex-col gap-3 rounded-lg border p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <FileText className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {item.file.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {(item.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.isComplete && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                                Hoàn thành
                              </span>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveFile(fileKey)}
                              disabled={isProcessing}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {isProcessing && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>
                                {item.isUploading ? "Tải lên" : "Xử lý"}
                              </span>
                              <span>{item.progress}%</span>
                            </div>
                            <Progress value={item.progress} />
                          </div>
                        )}

                        {item.error && (
                          <p className="text-sm text-red-600">{item.error}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={
                  files.length === 0 ||
                  files.some((f) => f.isUploading || f.isProcessing)
                }
                onClick={handleClearAll}
              >
                Xóa tất cả
              </Button>

              <Button
                type="submit"
                disabled={
                  files.length === 0 ||
                  files.some((f) => f.isUploading || f.isProcessing)
                }
              >
                {files.some((f) => f.isUploading)
                  ? "Đang tải lên..."
                  : files.some((f) => f.isProcessing)
                    ? "Đang xử lý..."
                    : "Tải lên"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {files.map((item) => {
        if (item.isComplete && item.file) {
          return (
            <EtsyConvert
              key={getFileKey(item.file)}
              file={item.file}
              onParsed={handleParsed}
            />
          );
        }
        return null;
      })}

      {parsedDataList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Kết quả xử lý</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyAllContent}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Sao chép tất cả file
            </Button>
          </div>
          {parsedDataList.map((data, index) => (
            <EtsyResult key={index} data={data} />
          ))}
        </div>
      )}
    </div>
  );
}
