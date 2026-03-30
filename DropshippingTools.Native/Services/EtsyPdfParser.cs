using System.Globalization;
using System.Text.RegularExpressions;
using DropshippingTools.Native.Models;

namespace DropshippingTools.Native.Services;

internal sealed class EtsyPdfParser
{
    private readonly PdfTextExtractor _textExtractor = new();

    public IReadOnlyList<ParsedEtsyRow> ParseFile(string filePath)
    {
        var lines = _textExtractor.ExtractLines(filePath);
        return ParseLines(lines);
    }

    private static IReadOnlyList<ParsedEtsyRow> ParseLines(IReadOnlyList<string> lines)
    {
        var rows = new List<ParsedEtsyRow>();
        var orderIndexes = lines
            .Select((line, index) => new { line, index })
            .Where(static entry => Regex.IsMatch(entry.line, @"Order\s*#\d+", RegexOptions.IgnoreCase))
            .Select(static entry => entry.index)
            .ToList();

        if (orderIndexes.Count == 0)
        {
            return rows;
        }

        for (var i = 0; i < orderIndexes.Count; i += 1)
        {
            var start = orderIndexes[i];
            var end = i + 1 < orderIndexes.Count ? orderIndexes[i + 1] : lines.Count;
            var block = lines.Skip(start).Take(end - start).ToList();

            var orderId = GetOrderId(block);
            var shipTo = GetShipTo(block);

            if (string.IsNullOrWhiteSpace(orderId) || string.IsNullOrWhiteSpace(shipTo))
            {
                continue;
            }

            rows.AddRange(ParseItems(block, orderId, shipTo));
        }

        return rows;
    }

    private static string GetOrderId(IEnumerable<string> lines)
    {
        foreach (var line in lines)
        {
            var match = Regex.Match(line, @"Order\s*#(\d+)", RegexOptions.IgnoreCase);
            if (match.Success)
            {
                return match.Groups[1].Value;
            }
        }

        return string.Empty;
    }

    private static string GetShipTo(IReadOnlyList<string> lines)
    {
        var startIndex = lines
            .Select((line, index) => new { line, index })
            .FirstOrDefault(static entry =>
                string.Equals(entry.line, "Ship to", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(entry.line, "Deliver to", StringComparison.OrdinalIgnoreCase))
            ?.index ?? -1;

        if (startIndex < 0)
        {
            return string.Empty;
        }

        var stopPatterns = new[]
        {
            "^Scheduled to ship by$",
            "^Scheduled to dispatch by$",
            "^Shop$",
            "^From$",
            "^Order date$",
            "^Payment method$",
            @"^\d+\s+items?$",
        };

        var addressLines = new List<string>();
        for (var index = startIndex + 1; index < lines.Count; index += 1)
        {
            var line = lines[index];
            if (stopPatterns.Any(pattern => Regex.IsMatch(line, pattern, RegexOptions.IgnoreCase)))
            {
                break;
            }

            addressLines.Add(line);
        }

        return string.Join(", ", addressLines);
    }

    private static IEnumerable<ParsedEtsyRow> ParseItems(IReadOnlyList<string> lines, string orderId, string shipTo)
    {
        var skuIndexes = lines
            .Select((line, index) => new { line, index })
            .Where(static entry => Regex.IsMatch(entry.line, @"^SKU:\s*", RegexOptions.IgnoreCase))
            .Select(static entry => entry.index)
            .ToList();

        foreach (var skuPosition in skuIndexes.Select((value, index) => new { value, index }))
        {
            var skuIndex = skuPosition.value;
            var nextSkuIndex = skuPosition.index + 1 < skuIndexes.Count ? skuIndexes[skuPosition.index + 1] : lines.Count;
            var titleLines = new List<string>();

            for (var index = skuIndex - 1; index >= 0; index -= 1)
            {
                var line = lines[index];
                if (Regex.IsMatch(line, @"^\d+\s+items?$", RegexOptions.IgnoreCase) ||
                    IsMetaLine(line) ||
                    Regex.IsMatch(line, @"\(\S+\)"))
                {
                    break;
                }

                if (Regex.IsMatch(line, @"^Personalization:", RegexOptions.IgnoreCase) ||
                    Regex.IsMatch(line, @"^\d+\s*x\s+[A-Z]{3}\s+\d+(\.\d{2})?$", RegexOptions.IgnoreCase))
                {
                    break;
                }

                titleLines.Insert(0, line);
            }

            var variationParts = new List<string>();
            var personalizationParts = new List<string>();
            var quantity = 0;
            var unitPrice = 0m;

            for (var index = skuIndex + 1; index < nextSkuIndex; index += 1)
            {
                var line = lines[index];

                if (IsVariationLine(line))
                {
                    variationParts.Add(line.Trim());
                    continue;
                }

                var personalizationMatch = Regex.Match(line, @"^Personalization:\s*(.*)$", RegexOptions.IgnoreCase);
                if (personalizationMatch.Success)
                {
                    if (!string.IsNullOrWhiteSpace(personalizationMatch.Groups[1].Value))
                    {
                        personalizationParts.Add(personalizationMatch.Groups[1].Value.Trim());
                    }

                    for (var nextIndex = index + 1; nextIndex < nextSkuIndex; nextIndex += 1)
                    {
                        var nextLine = lines[nextIndex];
                        if (Regex.IsMatch(nextLine, @"^SKU:", RegexOptions.IgnoreCase) ||
                            IsVariationLine(nextLine) ||
                            Regex.IsMatch(nextLine, @"^Personalization:", RegexOptions.IgnoreCase) ||
                            Regex.IsMatch(nextLine, @"^\d+\s*x\s+[A-Z]{3}\s+(\d+(?:\.\d{2})?)$", RegexOptions.IgnoreCase) ||
                            IsMetaLine(nextLine))
                        {
                            break;
                        }

                        personalizationParts.Add(nextLine.Trim());
                        index = nextIndex;
                    }

                    continue;
                }

                var quantityMatch = Regex.Match(line, @"^(\d+)\s*x\s+[A-Z]{3}\s+(\d+(?:\.\d{2})?)$", RegexOptions.IgnoreCase);
                if (quantityMatch.Success)
                {
                    quantity = int.Parse(quantityMatch.Groups[1].Value, CultureInfo.InvariantCulture);
                    unitPrice = decimal.Parse(quantityMatch.Groups[2].Value, CultureInfo.InvariantCulture);
                    break;
                }

                if (IsMetaLine(line))
                {
                    break;
                }
            }

            var row = new ParsedEtsyRow
            {
                OrderId = orderId,
                ShipTo = shipTo,
                Title = string.Join(" ", titleLines).Trim(),
                Sku = Regex.Replace(lines[skuIndex], @"^SKU:\s*", string.Empty, RegexOptions.IgnoreCase).Trim(),
                Variation = string.Join(" | ", variationParts),
                Personalization = string.Join(" | ", personalizationParts),
                Quantity = quantity,
                UnitPrice = unitPrice,
            };

            if (!string.IsNullOrWhiteSpace(row.OrderId) &&
                !string.IsNullOrWhiteSpace(row.ShipTo) &&
                !string.IsNullOrWhiteSpace(row.Title) &&
                !string.IsNullOrWhiteSpace(row.Sku) &&
                row.Quantity > 0)
            {
                yield return row;
            }
        }
    }

    private static bool IsMetaLine(string line)
    {
        var patterns = new[]
        {
            @"^Order\s*#\d+",
            "^Ship to$",
            "^Deliver to$",
            "^Scheduled to ship by$",
            "^Scheduled to dispatch by$",
            "^Shop$",
            "^From$",
            "^Order date$",
            "^Payment method$",
            "^Buyer$",
            @"^Item total\b",
            @"^Shop discount\b",
            @"^Shipping total\b",
            @"^Delivery total\b",
            @"^Subtotal\b",
            @"^Tax\b",
            @"^Order total\b",
            "^Do the green thing$",
            "^Climate Impact Plan$",
            @"^Love what you bought\?$",
        };

        return patterns.Any(pattern => Regex.IsMatch(line, pattern, RegexOptions.IgnoreCase));
    }

    private static bool IsVariationLine(string line)
    {
        return Regex.IsMatch(line, @"^(Type|Size|Style|Color|Material|Finish|Pattern):", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(line, @"^Option\b.*:", RegexOptions.IgnoreCase);
    }
}
