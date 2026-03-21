import { Copy } from "lucide-react";
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
  if (!data) {
    return null;
  }

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error("Không thể sao chép dữ liệu");
    }
  };

  const handleCopyAll = async () => {
    const orderId = data.orderId ?? "";
    const shipTo = data.shipTo ?? "";

    const rows = data.items.map((item) =>
      [
        orderId,
        shipTo,
        item.title,
        item.sku,
        item.personalization,
        String(item.quantity),
        item.price.toFixed(2),
      ].join("\t"),
    );

    const tsv = rows.join("\n");

    await copyToClipboard(tsv, `Đã sao chép ${data.items.length} dòng dữ liệu`);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Kết quả parse</CardTitle>
          <CardDescription>
            Dữ liệu đơn hàng Etsy đã được trích xuất từ PDF local.
          </CardDescription>
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
              <div className="flex items-center justify-between border-b p-4">
                <span className="text-sm text-muted-foreground">
                  {data.items.length} dòng dữ liệu
                </span>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyAll}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Sao chép tất cả
                </Button>
              </div>

              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
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
                        colSpan={5}
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
                          {item.price.toFixed(2)}
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
