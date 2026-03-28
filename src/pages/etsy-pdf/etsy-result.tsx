import { Copy, Database } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { convertRowsToTabSeparated, copyToClipboard } from "@/lib/file-utils";

export type ParsedEtsyRow = {
  orderId: string;
  shipTo: string;
  title: string;
  sku: string;
  variation: string;
  personalization: string;
  quantity: number;
  unitPrice: number;
};

type EtsyResultProps = {
  data: ParsedEtsyRow[];
};

function TruncateCell({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`truncate ${className ?? ""}`}>{value || "-"}</div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-normal break-words">
        <p>{value || "-"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function WrapCell({ value, className }: { value: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`whitespace-normal break-words leading-5 ${className ?? ""}`}
        >
          {value || "-"}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-normal break-words">
        <p>{value || "-"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function EtsyResult({ data }: EtsyResultProps) {
  const copyAll = async () => {
    try {
      const content = convertRowsToTabSeparated(data);
      await copyToClipboard(content);
      toast.success(`Đã sao chép ${data.length} dòng.`);
    } catch {
      toast.error("Sao chép thất bại.");
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Dữ liệu đã tách</CardTitle>
              <Badge variant="outline">{data.length} dòng</Badge>
            </div>
            <CardDescription>
              Kiểm tra lại trước khi dán sang spreadsheet hoặc công cụ khác.
            </CardDescription>
          </div>

          <Button size="sm" onClick={copyAll}>
            <Copy className="mr-2 h-4 w-4" />
            Sao chép
          </Button>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table className="w-full table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Order ID</TableHead>
                  <TableHead className="min-w-[180px]">Ship to</TableHead>
                  <TableHead className="min-w-[220px]">Title</TableHead>
                  <TableHead className="w-[140px]">SKU</TableHead>
                  <TableHead className="min-w-[220px]">Variation</TableHead>
                  <TableHead className="min-w-[240px]">
                    Personalization
                  </TableHead>
                  <TableHead className="w-[70px] text-right">Qty</TableHead>
                  <TableHead className="w-[90px] text-right">Price</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Không có dữ liệu.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, index) => (
                    <TableRow
                      key={`${row.orderId}-${index}`}
                      className="align-top"
                    >
                      <TableCell className="max-w-[110px]">
                        <TruncateCell value={row.orderId} />
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <WrapCell value={row.shipTo} />
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <WrapCell value={row.title} />
                      </TableCell>
                      <TableCell className="max-w-[140px]">
                        <TruncateCell value={row.sku} />
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <WrapCell value={row.variation} />
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <WrapCell value={row.personalization} />
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        {row.quantity}
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        {row.unitPrice.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
