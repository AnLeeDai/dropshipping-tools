import { type ParsedEtsyRow } from "@/pages/etsy-pdf/etsy-result";

export function validatePdfFile(selectedFile: File | null): boolean {
  if (!selectedFile) {
    return false;
  }

  const isPdfType = selectedFile.type === "application/pdf";
  const isPdfExtension = selectedFile.name.toLowerCase().endsWith(".pdf");

  return isPdfType || isPdfExtension;
}

export function convertRowsToTabSeparated(rows: ParsedEtsyRow[]): string {
  return rows
    .map((row) =>
      [
        row.orderId,
        row.shipTo,
        row.title,
        row.sku,
        row.variation,
        row.personalization,
        String(row.quantity),
        row.unitPrice.toFixed(2),
      ].join("\t"),
    )
    .join("\n");
}

export async function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
