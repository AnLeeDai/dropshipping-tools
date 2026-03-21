import * as React from "react";
import { Upload, FileText, X } from "lucide-react";
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

export default function EtsyUpload() {
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const [isReadyToProcess, setIsReadyToProcess] = React.useState(false);
  const [parsedData, setParsedData] = React.useState<ParsedEtsyOrder | null>(
    null,
  );

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const resetStatus = React.useCallback((): void => {
    setErrorMessage("");
    setSuccessMessage("");
    setProgress(0);
    setIsReadyToProcess(false);
    setParsedData(null);
    setIsProcessing(false);
  }, []);

  const validatePdfFile = React.useCallback(
    (selectedFile: File | null): boolean => {
      if (!selectedFile) {
        return false;
      }

      const isPdfType = selectedFile.type === "application/pdf";
      const isPdfExtension = selectedFile.name.toLowerCase().endsWith(".pdf");

      if (!isPdfType && !isPdfExtension) {
        setErrorMessage("Chỉ hỗ trợ tải lên tệp PDF.");
        setSuccessMessage("");
        setFile(null);
        setIsReadyToProcess(false);

        if (inputRef.current) {
          inputRef.current.value = "";
        }

        return false;
      }

      return true;
    },
    [],
  );

  const handleSetFile = React.useCallback(
    (selectedFile: File | null): void => {
      resetStatus();

      if (!selectedFile) {
        setFile(null);
        return;
      }

      if (!validatePdfFile(selectedFile)) {
        return;
      }

      setParsedData(null);
      setFile(selectedFile);
    },
    [resetStatus, validatePdfFile],
  );

  const handleChangeFile = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const selectedFile = event.target.files?.[0] ?? null;
      handleSetFile(selectedFile);
    },
    [handleSetFile],
  );

  const handleRemoveFile = React.useCallback((): void => {
    setFile(null);
    resetStatus();
    setIsUploading(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [resetStatus]);

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

      const droppedFile = event.dataTransfer.files?.[0] ?? null;
      handleSetFile(droppedFile);
    },
    [handleSetFile],
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (!file) {
        setErrorMessage("Vui lòng chọn một tệp PDF trước khi tải lên.");
        setSuccessMessage("");
        return;
      }

      if (!validatePdfFile(file)) {
        return;
      }

      setIsUploading(true);
      setIsProcessing(false);
      setErrorMessage("");
      setSuccessMessage("");
      setProgress(0);
      setIsReadyToProcess(false);
      setParsedData(null);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }

            setIsUploading(false);
            setIsProcessing(true);
            setIsReadyToProcess(true);
            return 100;
          }

          return prev + 25;
        });
      }, 120);
    },
    [file, validatePdfFile],
  );

  const handleParsed = React.useCallback(
    (data: ParsedEtsyOrder | null): void => {
      setParsedData(data);
      setIsProcessing(false);
      setIsReadyToProcess(false);

      if (data) {
        setSuccessMessage("Đã xử lý PDF thành công.");
        setErrorMessage("");
      } else {
        setErrorMessage("Không thể trích xuất dữ liệu từ PDF.");
        setSuccessMessage("");
      }
    },
    [],
  );

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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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

            {file && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    disabled={isUploading || isProcessing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {(isUploading || progress > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Tiến trình tải lên</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                {isProcessing && (
                  <p className="text-sm text-muted-foreground">
                    Đang đọc và trích xuất dữ liệu từ PDF...
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={!file || isUploading || isProcessing}
                onClick={handleRemoveFile}
              >
                Xóa tệp
              </Button>

              <Button
                type="submit"
                disabled={!file || isUploading || isProcessing}
              >
                {isUploading
                  ? "Đang tải lên..."
                  : isProcessing
                    ? "Đang xử lý..."
                    : "Tải lên"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {isReadyToProcess && file && (
        <EtsyConvert file={file} onParsed={handleParsed} />
      )}

      <EtsyResult data={parsedData} />
    </div>
  );
}
