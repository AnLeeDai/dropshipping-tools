import * as React from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

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

type EtsyConvertProps = {
  file: File | null;
  onParsed?: (data: ParsedEtsyRow[]) => void;
};

type PdfTextItem = { str: string };

function isTextItem(item: unknown): item is PdfTextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof (item as { str: unknown }).str === "string"
  );
}

function normalizeLine(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function cleanLines(lines: string[]): string[] {
  return lines.map(normalizeLine).filter(Boolean);
}

function extractPageLines(textContent): string[] {
  return cleanLines(
    textContent.items.map((item: unknown) =>
      isTextItem(item) ? item.str : "",
    ),
  );
}

function getOrderId(lines: string[]): string {
  for (const line of lines) {
    const match = line.match(/Order\s*#(\d+)/i);
    if (match) return match[1];
  }
  return "";
}

function getShipTo(lines: string[]): string {
  const startIndex = lines.findIndex(
    (line) => /^Ship to$/i.test(line) || /^Deliver to$/i.test(line),
  );
  if (startIndex === -1) return "";

  const stopPatterns = [
    /^Scheduled to ship by$/i,
    /^Scheduled to dispatch by$/i,
    /^Shop$/i,
    /^From$/i,
    /^Order date$/i,
    /^Payment method$/i,
    /^\d+\s+items?$/i,
  ];

  const addressLines: string[] = [];

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (stopPatterns.some((pattern) => pattern.test(line))) break;
    addressLines.push(line);
  }

  return addressLines.join(", ");
}

function isMetaLine(line: string): boolean {
  return (
    /^Order\s*#\d+/i.test(line) ||
    /^Ship to$/i.test(line) ||
    /^Deliver to$/i.test(line) ||
    /^Scheduled to ship by$/i.test(line) ||
    /^Scheduled to dispatch by$/i.test(line) ||
    /^Shop$/i.test(line) ||
    /^Order date$/i.test(line) ||
    /^Payment method$/i.test(line) ||
    /^Item total\b/i.test(line) ||
    /^Shop discount\b/i.test(line) ||
    /^Shipping total\b/i.test(line) ||
    /^Delivery total\b/i.test(line) ||
    /^Subtotal\b/i.test(line) ||
    /^Tax\b/i.test(line) ||
    /^Order total\b/i.test(line) ||
    /^Do the green thing$/i.test(line)
  );
}

function parseItems(
  lines: string[],
  orderId: string,
  shipTo: string,
): ParsedEtsyRow[] {
  const skuIndexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^SKU:\s*/i.test(line))
    .map(({ index }) => index);

  if (skuIndexes.length === 0) return [];

  return skuIndexes
    .map((skuIndex, idx) => {
      const nextSkuIndex =
        idx < skuIndexes.length - 1 ? skuIndexes[idx + 1] : lines.length;

      // ===== TITLE =====
      const titleLines: string[] = [];

      for (let i = skuIndex - 1; i >= 0; i -= 1) {
        const line = lines[i];

        if (
          /^\d+\s+items?$/i.test(line) ||
          isMetaLine(line) ||
          /\(\S+\)/.test(line)
        ) {
          break;
        }

        if (
          /^Personalization:/i.test(line) ||
          /^\d+\s*x\s+[A-Z]{3}\s+\d+(\.\d{2})?$/i.test(line)
        ) {
          break;
        }

        titleLines.unshift(line);
      }

      // ===== DETAILS =====
      let variationParts: string[] = [];
      let personalization = "";
      let quantity = 0;
      let unitPrice = 0;

      for (let i = skuIndex + 1; i < nextSkuIndex; i += 1) {
        const line = lines[i];

        if (/^(Type|Size|Style):/i.test(line)) {
          variationParts.push(
            line.replace(/^(Type|Size|Style):\s*/i, "").trim(),
          );
          continue;
        }

        const p = line.match(/^Personalization:\s*(.*)$/i);
        if (p) {
          personalization = p[1].trim();
          continue;
        }

        const q = line.match(/^(\d+)\s*x\s+[A-Z]{3}\s+(\d+(?:\.\d{2})?)$/i);
        if (q) {
          quantity = Number(q[1]);
          unitPrice = Number(q[2]);
          break;
        }

        if (isMetaLine(line)) break;
      }

      return {
        orderId,
        shipTo,
        title: titleLines.join(" ").trim(),
        sku: lines[skuIndex].replace(/^SKU:\s*/i, "").trim(),
        variation: variationParts.join(" | "),
        personalization,
        quantity,
        unitPrice,
      };
    })
    .filter(
      (row) =>
        row.orderId && row.shipTo && row.title && row.sku && row.quantity > 0,
    );
}

async function extractOrdersFromPdf(file: File): Promise<ParsedEtsyRow[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  const rows: ParsedEtsyRow[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines = extractPageLines(textContent);

    // 👉 chỉ lấy trang có SKU
    if (!lines.some((line) => /^SKU:/i.test(line))) continue;

    const orderId = getOrderId(lines);
    const shipTo = getShipTo(lines);

    if (!orderId || !shipTo) continue;

    rows.push(...parseItems(lines, orderId, shipTo));
  }

  return rows;
}

export default function EtsyConvert({ file, onParsed }: EtsyConvertProps) {
  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!file) {
        onParsed?.([]);
        return;
      }

      try {
        const parsed = await extractOrdersFromPdf(file);

        if (!cancelled) {
          onParsed?.(parsed);
        }
      } catch {
        if (!cancelled) {
          onParsed?.([]);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [file, onParsed]);

  return null;
}
