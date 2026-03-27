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
      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="min-w-0">
            <CardTitle>Kết quả parse Etsy</CardTitle>
            <CardDescription>{data.length} dòng dữ liệu</CardDescription>
          </div>

          <Button size="sm" onClick={copyAll} className="shrink-0">
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        </CardHeader>

        <CardContent className="max-w-full overflow-hidden">
          <div className="w-full overflow-x-auto rounded-md border">
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
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((r, i) => (
                    <TableRow
                      key={`${r.orderId}-${i}`}
                      className={`align-top transition-colors ${
                        i % 2 === 0 ? "bg-muted/30" : ""
                      } hover:bg-muted`}
                    >
                      <TableCell className="max-w-[110px]">
                        <TruncateCell value={r.orderId} />
                      </TableCell>

                      <TableCell className="max-w-[220px]">
                        <WrapCell value={r.shipTo} />
                      </TableCell>

                      <TableCell className="max-w-[260px]">
                        <WrapCell value={r.title} />
                      </TableCell>

                      <TableCell className="max-w-[140px]">
                        <TruncateCell value={r.sku} />
                      </TableCell>

                      <TableCell className="max-w-[260px]">
                        <WrapCell value={r.variation} />
                      </TableCell>

                      <TableCell className="max-w-[300px]">
                        <WrapCell value={r.personalization} />
                      </TableCell>

                      <TableCell className="text-right align-middle">
                        {r.quantity}
                      </TableCell>

                      <TableCell className="text-right align-middle">
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
