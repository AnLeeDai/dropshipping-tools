import * as React from "react";
import * as pdfjsLib from "pdfjs-dist";

import type { ParsedEtsyItem, ParsedEtsyOrder } from "./etsy-result";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type EtsyConvertProps = {
  file: File | null;
  onParsed?: (data: ParsedEtsyOrder | null) => void;
};

type PdfTextItem = {
  str: string;
};

function isTextItem(item: unknown): item is PdfTextItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "str" in item &&
    typeof (item as { str: unknown }).str === "string"
  );
}

function normalizeText(value: string): string {
  return value
    .replace(/\r/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function parseOrderId(text: string): string | null {
  const match = text.match(/Order\s*#(\d+)/i);
  return match?.[1] ?? null;
}

function parseShipTo(text: string): string | null {
  const patterns = [
    /Ship to\s*([\s\S]*?)\s*Scheduled to ship by/i,
    /Ship to\s*([\s\S]*?)\s*Shop\s/i,
    /Ship to\s*([\s\S]*?)\s*Order date/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }

  return null;
}

function cleanTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^Order\s*#\d+\s*/i, "")
    .replace(/^\d+\s*items?\s*/i, "")
    .trim();
}

function parseItemBlock(block: string): ParsedEtsyItem | null {
  const cleaned = normalizeText(block).replace(/\s+/g, " ").trim();

  const sku = cleaned.match(/SKU:\s*([A-Z0-9]+)/i)?.[1]?.trim() ?? "";

  let title = cleaned.split(/SKU:/i)[0]?.trim() ?? "";
  title = cleanTitle(title);

  const productTitleMatch = title.match(/(Personalized[\s\S]*?Cup)/i);
  if (productTitleMatch?.[1]) {
    title = productTitleMatch[1].trim();
  }

  const personalization =
    cleaned
      .match(/Personalization:\s*(.*?)(?=\s+\d+\s*x\s*USD\s*\d+\.\d{2})/i)?.[1]
      ?.trim() ?? "";

  const quantity = Number(cleaned.match(/(\d+)\s*x\s*USD/i)?.[1] ?? 0);

  const price = Number(cleaned.match(/USD\s*(\d+\.\d{2})/i)?.[1] ?? 0);

  if (!title || !sku || !personalization || quantity <= 0 || price <= 0) {
    return null;
  }

  return {
    title,
    sku,
    personalization,
    quantity,
    price,
  };
}

function parseItems(text: string): ParsedEtsyItem[] {
  const normalizedText = normalizeText(text);

  const skuMatches = [...normalizedText.matchAll(/SKU:\s*[A-Z0-9]+/gi)];

  if (skuMatches.length === 0) {
    return [];
  }

  const blocks = skuMatches.map((match, index) => {
    const skuIndex = match.index ?? 0;

    let start = normalizedText.lastIndexOf("Personalized", skuIndex);
    if (start === -1) {
      start = normalizedText.lastIndexOf("\n", skuIndex);
    }
    if (start === -1) {
      start = Math.max(0, skuIndex - 120);
    }

    const end =
      index < skuMatches.length - 1
        ? (skuMatches[index + 1].index ?? normalizedText.length)
        : normalizedText.length;

    return normalizedText.slice(start, end).trim();
  });

  const parsedItems: ParsedEtsyItem[] = [];

  for (const block of blocks) {
    const parsed = parseItemBlock(block);
    if (parsed) {
      parsedItems.push(parsed);
    }
  }

  return parsedItems;
}

function parseEtsyPdfText(fullText: string): ParsedEtsyOrder {
  const normalizedText = normalizeText(fullText);

  return {
    orderId: parseOrderId(normalizedText),
    shipTo: parseShipTo(normalizedText),
    items: parseItems(normalizedText),
    rawText: normalizedText,
  };
}

async function extractTextFromPdf(selectedFile: File): Promise<string> {
  const arrayBuffer = await selectedFile.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
  const pagesText: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => (isTextItem(item) ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pagesText.push(pageText);
  }

  return pagesText.join("\n");
}

export default function EtsyConvert({ file, onParsed }: EtsyConvertProps) {
  React.useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      if (!file) {
        onParsed?.(null);
        return;
      }

      try {
        const fullText = await extractTextFromPdf(file);

        if (cancelled) {
          return;
        }

        const parsed = parseEtsyPdfText(fullText);

        if (cancelled) {
          return;
        }

        onParsed?.(parsed);
      } catch {
        if (cancelled) {
          return;
        }

        onParsed?.(null);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [file, onParsed]);

  return null;
}
