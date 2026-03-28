import * as React from "react";

export interface FileUploadItem {
  file: File;
  progress: number;
  isUploading: boolean;
  isProcessing: boolean;
  isComplete: boolean;
  error?: string;
}

const PROGRESS_INCREMENT = 25;
const PROGRESS_INTERVAL = 120;
const PROCESSING_DELAY = 500;

export function useFileUpload() {
  const [files, setFiles] = React.useState<FileUploadItem[]>([]);
  const intervalsRef = React.useRef<
    Map<string, ReturnType<typeof setInterval>>
  >(new Map());

  const getFileKey = React.useCallback((file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }, []);

  const updateFileItem = React.useCallback(
    (fileKey: string, updates: Partial<FileUploadItem>) => {
      setFiles((prev) =>
        prev.map((item) =>
          getFileKey(item.file) === fileKey ? { ...item, ...updates } : item,
        ),
      );
    },
    [getFileKey],
  );

  const removeFile = React.useCallback(
    (fileKey: string) => {
      setFiles((prev) =>
        prev.filter((item) => getFileKey(item.file) !== fileKey),
      );

      const interval = intervalsRef.current.get(fileKey);
      if (interval) {
        clearInterval(interval);
        intervalsRef.current.delete(fileKey);
      }
    },
    [getFileKey],
  );

  const addFiles = React.useCallback(
    (newFiles: FileUploadItem[]) => {
      const existingKeys = new Set(files.map((f) => getFileKey(f.file)));
      const uniqueNewFiles = newFiles.filter(
        (item) => !existingKeys.has(getFileKey(item.file)),
      );

      setFiles((prev) => [...prev, ...uniqueNewFiles]);
      return {
        added: uniqueNewFiles.length,
        duplicates: newFiles.length - uniqueNewFiles.length,
      };
    },
    [files, getFileKey],
  );

  const startProgressSimulation = React.useCallback(
    (fileKey: string, onComplete: () => void) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += PROGRESS_INCREMENT;

        if (progress >= 100) {
          clearInterval(interval);
          intervalsRef.current.delete(fileKey);
          updateFileItem(fileKey, {
            isUploading: false,
            isProcessing: true,
            progress: 100,
          });

          setTimeout(() => {
            updateFileItem(fileKey, {
              isProcessing: false,
              isComplete: true,
            });
            onComplete();
          }, PROCESSING_DELAY);
        } else {
          updateFileItem(fileKey, { progress });
        }
      }, PROGRESS_INTERVAL);

      intervalsRef.current.set(fileKey, interval);
    },
    [updateFileItem],
  );

  const clearAll = React.useCallback(() => {
    intervalsRef.current.forEach((interval) => {
      clearInterval(interval);
    });
    intervalsRef.current.clear();
    setFiles([]);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      intervalsRef.current.forEach((interval) => {
        clearInterval(interval);
      });
      intervalsRef.current.clear();
    };
  }, []);

  return {
    files,
    setFiles,
    getFileKey,
    updateFileItem,
    removeFile,
    addFiles,
    startProgressSimulation,
    clearAll,
  };
}
