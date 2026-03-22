import { Copy } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

function EllipsisCell({
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
      <TooltipContent className="max-w-xs wrap-break-word">
        <p>{value || "-"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function EtsyResult({ data }: EtsyResultProps) {
  const copyAll = async () => {
    try {
      const rows = data.map((r) =>
        [
          r.orderId,
          r.shipTo,
          r.title,
          r.sku,
          r.variation,
          r.personalization,
          r.quantity,
          r.unitPrice.toFixed(2),
        ].join("\t"),
      );

      await navigator.clipboard.writeText(rows.join("\n"));
      toast.success(`Đã copy ${data.length} dòng`);
    } catch {
      toast.error("Copy thất bại");
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Kết quả parse Etsy</CardTitle>
            <CardDescription>{data.length} dòng dữ liệu</CardDescription>
          </div>

          <Button size="sm" onClick={copyAll}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-30">Order ID</TableHead>
                  <TableHead className="w-65">Ship to</TableHead>
                  <TableHead className="w-65">Title</TableHead>
                  <TableHead className="w-35">SKU</TableHead>
                  <TableHead className="w-45">Variation</TableHead>
                  <TableHead className="w-55">Personalization</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-25 text-right">Price</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((r, i) => (
                    <TableRow
                      key={`${r.orderId}-${i}`}
                      className={`transition-colors ${
                        i % 2 === 0 ? "bg-muted/30" : ""
                      } hover:bg-muted`}
                    >
                      <TableCell>
                        <EllipsisCell value={r.orderId} />
                      </TableCell>

                      <TableCell>
                        <EllipsisCell value={r.shipTo} />
                      </TableCell>

                      <TableCell>
                        <EllipsisCell value={r.title} />
                      </TableCell>

                      <TableCell>
                        <EllipsisCell value={r.sku} />
                      </TableCell>

                      <TableCell>
                        <EllipsisCell value={r.variation} />
                      </TableCell>

                      <TableCell>
                        <EllipsisCell value={r.personalization} />
                      </TableCell>

                      <TableCell className="text-right">{r.quantity}</TableCell>

                      <TableCell className="text-right">
                        {r.unitPrice.toFixed(2)}
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
