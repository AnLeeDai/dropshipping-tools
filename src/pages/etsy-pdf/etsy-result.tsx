"use client";

import * as React from "react";
import { Copy, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export type ParsedEtsyItem = {
  title: string;
  sku: string;
  personalization: string;
  quantity: number;
  price: number;
};

export type ParsedEtsyOrder = {
  orderId: string | null;
  shipTo: string | null;
  items: ParsedEtsyItem[];
  rawText: string;
};

type EtsyResultProps = {
  data: ParsedEtsyOrder | null;
};

type EllipsisCellProps = {
  value: string;
  className?: string;
};

function EllipsisCell({ value, className }: EllipsisCellProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`truncate ${className ?? ""}`}>{value}</div>
      </TooltipTrigger>
      <TooltipContent className="max-w-105 wrap-break-word">
        <p>{value}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function EtsyResult({ data }: EtsyResultProps) {
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(
    new Set(),
  );

  if (!data) {
    return null;
  }

  const handleToggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === data.items.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.items.map((_, i) => i)));
    }
  };

  const generateTabSeparatedData = (indices: number[]): string => {
    return indices
      .map((i) => {
        const item = data.items[i];
        return [
          item.title,
          item.sku,
          item.personalization,
          item.quantity,
          item.price,
        ].join("\t");
      })
      .join("\n");
  };

  const handleCopyAll = () => {
    const tsv = generateTabSeparatedData(data.items.map((_, i) => i));
    navigator.clipboard.writeText(tsv).then(() => {
      toast.success(`Đã copy ${data.items.length} dòng dữ liệu`);
    });
  };

  const handleCopySelected = () => {
    if (selectedRows.size === 0) {
      toast.error("Vui lòng chọn ít nhất một dòng");
      return;
    }

    const indices = Array.from(selectedRows).sort((a, b) => a - b);
    const tsv = generateTabSeparatedData(indices);
    navigator.clipboard.writeText(tsv).then(() => {
      toast.success(`Đã copy ${selectedRows.size} dòng dữ liệu`);
    });
  };

  const handleCopyFullContent = () => {
    const lines: string[] = [];

    // Add all items
    data.items.forEach((item) => {
      lines.push(
        [
          item.title,
          item.sku,
          item.personalization,
          item.quantity,
          item.price,
        ].join("\t"),
      );
    });

    const fullContent = lines.join("\n");
    navigator.clipboard.writeText(fullContent).then(() => {
      toast.success("Đã copy toàn bộ nội dung");
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Kết quả parse</CardTitle>
              <CardDescription>
                Dữ liệu đơn hàng Etsy đã được trích xuất từ PDF local.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyFullContent}
              className="gap-2 shrink-0"
            >
              <Copy className="h-4 w-4" />
              Sao chép tất cả
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="mt-1 text-sm font-medium">
                {data.orderId ?? "Không tìm thấy"}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Ship to</p>

              {data.shipTo ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="mt-1 line-clamp-2 text-sm font-medium wrap-break-word">
                      {data.shipTo}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-120 wrap-break-word">
                    <p>{data.shipTo}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <p className="mt-1 text-sm font-medium">Không tìm thấy</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="w-full overflow-x-auto">
              <div className="flex items-center justify-between border-b p-4 gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedRows.size > 0
                    ? `Đã chọn ${selectedRows.size} / ${data.items.length} dòng`
                    : `${data.items.length} dòng dữ liệu`}
                </span>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyAll}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Sao chép tất cả
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopySelected}
                    disabled={selectedRows.size === 0}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Sao chép đã chọn
                  </Button>
                </div>
              </div>

              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <button
                        onClick={handleSelectAll}
                        className="inline-flex items-center justify-center hover:text-foreground"
                        title={
                          selectedRows.size === data.items.length
                            ? "Bỏ chọn tất cả"
                            : "Chọn tất cả"
                        }
                      >
                        {selectedRows.size === data.items.length ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-[44%] min-w-70">Title</TableHead>
                    <TableHead className="w-[18%] min-w-35">SKU</TableHead>
                    <TableHead className="w-[22%] min-w-45">
                      Personalization
                    </TableHead>
                    <TableHead className="w-[8%] min-w-17.5 text-right">
                      Qty
                    </TableHead>
                    <TableHead className="w-[8%] min-w-27.5 text-right">
                      Price
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Không tìm thấy item nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.items.map((item, index) => (
                      <TableRow
                        key={`${item.sku}-${item.personalization}-${index}`}
                      >
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleToggleRow(index)}
                            className="inline-flex items-center justify-center hover:text-foreground"
                          >
                            {selectedRows.has(index) ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="font-medium">
                          <EllipsisCell value={item.title} />
                        </TableCell>

                        <TableCell>
                          <EllipsisCell value={item.sku} />
                        </TableCell>

                        <TableCell>
                          <EllipsisCell value={item.personalization} />
                        </TableCell>

                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>

                        <TableCell className="text-right">
                          {item.price}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
