using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using DropshippingTools.Native.Models;

namespace DropshippingTools.Native.Services;

internal sealed class EtsyPdfParser
{
    private static readonly Regex OrderNumberRegex = new(@"Order\s*#(\d+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ItemCountRegex = new(@"^\d+\s+items?$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex SkuRegex = new(@"^SKU:\s*(.*)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex PersonalizationRegex = new(@"^Personalization:\s*(.*)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex QuantityPriceRegex = new(@"^(\d+)\s*x\s+[A-Z]{3}\s+(\d+(?:\.\d{2})?)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ParenthesizedTokenRegex = new(@"\(\S+\)", RegexOptions.Compiled);

    private readonly PdfTextExtractor _textExtractor = new();

    public IReadOnlyList<ParsedEtsyRow> ParseFile(string filePath)
    {
        var lines = _textExtractor.ExtractLines(filePath);
        if (lines.Count == 0)
        {
            return [];
        }

        var rows = new List<ParsedEtsyRow>();
        var blockStart = -1;

        for (var index = 0; index < lines.Count; index += 1)
        {
            if (!TryGetOrderId(lines[index], out _))
            {
                continue;
            }

            if (blockStart >= 0)
            {
                ParseOrderBlock(lines, blockStart, index, rows);
            }

            blockStart = index;
        }

        if (blockStart >= 0)
        {
            ParseOrderBlock(lines, blockStart, lines.Count, rows);
        }

        return rows;
    }

    private static void ParseOrderBlock(IReadOnlyList<string> lines, int startIndex, int endIndex, List<ParsedEtsyRow> rows)
    {
        var orderId = GetOrderId(lines, startIndex, endIndex);
        var shipTo = GetShipTo(lines, startIndex, endIndex);

        if (string.IsNullOrWhiteSpace(orderId) || string.IsNullOrWhiteSpace(shipTo))
        {
            return;
        }

        ParseItems(lines, startIndex, endIndex, orderId, shipTo, rows);
    }

    private static string GetOrderId(IReadOnlyList<string> lines, int startIndex, int endIndex)
    {
        for (var index = startIndex; index < endIndex; index += 1)
        {
            if (TryGetOrderId(lines[index], out var orderId))
            {
                return orderId;
            }
        }

        return string.Empty;
    }

    private static bool TryGetOrderId(string line, out string orderId)
    {
        var match = OrderNumberRegex.Match(line);
        if (match.Success)
        {
            orderId = match.Groups[1].Value;
            return true;
        }

        orderId = string.Empty;
        return false;
    }

    private static string GetShipTo(IReadOnlyList<string> lines, int startIndex, int endIndex)
    {
        var addressStartIndex = -1;
        for (var index = startIndex; index < endIndex; index += 1)
        {
            if (IsShipToHeader(lines[index]))
            {
                addressStartIndex = index + 1;
                break;
            }
        }

        if (addressStartIndex < 0)
        {
            return string.Empty;
        }

        var addressLines = new List<string>();
        for (var index = addressStartIndex; index < endIndex; index += 1)
        {
            var line = lines[index];
            if (IsShipToStopLine(line))
            {
                break;
            }

            if (!string.IsNullOrWhiteSpace(line))
            {
                addressLines.Add(line);
            }
        }

        return string.Join(", ", addressLines);
    }

    private static void ParseItems(
        IReadOnlyList<string> lines,
        int startIndex,
        int endIndex,
        string orderId,
        string shipTo,
        List<ParsedEtsyRow> rows)
    {
        var skuIndex = FindNextSkuIndex(lines, startIndex, endIndex, startIndex);
        while (skuIndex >= 0)
        {
            var nextSkuIndex = FindNextSkuIndex(lines, startIndex, endIndex, skuIndex + 1);
            var itemEndIndex = nextSkuIndex >= 0 ? nextSkuIndex : endIndex;

            var row = ParseItem(lines, startIndex, skuIndex, itemEndIndex, orderId, shipTo);
            if (row is not null)
            {
                rows.Add(row);
            }

            skuIndex = nextSkuIndex;
        }
    }

    private static ParsedEtsyRow? ParseItem(
        IReadOnlyList<string> lines,
        int blockStartIndex,
        int skuIndex,
        int itemEndIndex,
        string orderId,
        string shipTo)
    {
        var sku = GetSku(lines[skuIndex]);
        if (string.IsNullOrWhiteSpace(sku))
        {
            return null;
        }

        var titleStartIndex = skuIndex;
        for (var index = skuIndex - 1; index >= blockStartIndex; index -= 1)
        {
            if (ShouldStopTitleScan(lines[index]))
            {
                break;
            }

            titleStartIndex = index;
        }

        var title = JoinLines(lines, titleStartIndex, skuIndex, " ");
        if (string.IsNullOrWhiteSpace(title))
        {
            return null;
        }

        var variationParts = new List<string>();
        var personalizationParts = new List<string>();
        var quantity = 0;
        var unitPrice = 0m;

        for (var index = skuIndex + 1; index < itemEndIndex; index += 1)
        {
            var line = lines[index];

            if (IsVariationLine(line))
            {
                variationParts.Add(line.Trim());
                continue;
            }

            var personalizationMatch = PersonalizationRegex.Match(line);
            if (personalizationMatch.Success)
            {
                var firstLine = personalizationMatch.Groups[1].Value.Trim();
                if (firstLine.Length > 0)
                {
                    personalizationParts.Add(firstLine);
                }

                for (var nextIndex = index + 1; nextIndex < itemEndIndex; nextIndex += 1)
                {
                    var nextLine = lines[nextIndex];
                    if (SkuRegex.IsMatch(nextLine) ||
                        IsVariationLine(nextLine) ||
                        PersonalizationRegex.IsMatch(nextLine) ||
                        TryParseQuantityPrice(nextLine, out _, out _) ||
                        IsMetaLine(nextLine))
                    {
                        break;
                    }

                    personalizationParts.Add(nextLine.Trim());
                    index = nextIndex;
                }

                continue;
            }

            if (TryParseQuantityPrice(line, out quantity, out unitPrice))
            {
                break;
            }

            if (IsMetaLine(line))
            {
                break;
            }
        }

        if (quantity <= 0)
        {
            return null;
        }

        return new ParsedEtsyRow
        {
            OrderId = orderId,
            ShipTo = shipTo,
            Title = title,
            Sku = sku,
            Variation = string.Join(" | ", variationParts),
            Personalization = string.Join(" | ", personalizationParts),
            Quantity = quantity,
            UnitPrice = unitPrice,
        };
    }

    private static int FindNextSkuIndex(IReadOnlyList<string> lines, int startIndex, int endIndex, int searchStartIndex)
    {
        for (var index = Math.Max(startIndex, searchStartIndex); index < endIndex; index += 1)
        {
            if (SkuRegex.IsMatch(lines[index]))
            {
                return index;
            }
        }

        return -1;
    }

    private static string GetSku(string line)
    {
        var match = SkuRegex.Match(line);
        return match.Success ? match.Groups[1].Value.Trim() : string.Empty;
    }

    private static bool ShouldStopTitleScan(string line)
    {
        return ItemCountRegex.IsMatch(line) ||
               SkuRegex.IsMatch(line) ||
               IsMetaLine(line) ||
               ParenthesizedTokenRegex.IsMatch(line) ||
               PersonalizationRegex.IsMatch(line) ||
               TryParseQuantityPrice(line, out _, out _);
    }

    private static bool TryParseQuantityPrice(string line, out int quantity, out decimal unitPrice)
    {
        var match = QuantityPriceRegex.Match(line);
        if (match.Success)
        {
            quantity = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
            unitPrice = decimal.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
            return true;
        }

        quantity = 0;
        unitPrice = 0m;
        return false;
    }

    private static bool IsMetaLine(string line)
    {
        if (TryGetOrderId(line, out _) ||
            IsShipToHeader(line))
        {
            return true;
        }

        if (line.Equals("Scheduled to ship by", StringComparison.OrdinalIgnoreCase) ||
            line.Equals("Scheduled to dispatch by", StringComparison.OrdinalIgnoreCase) ||
            line.Equals("Shop", StringComparison.OrdinalIgnoreCase) ||
            line.Equals("From", StringComparison.OrdinalIgnoreCase) ||
            line.Equals("Order date", StringComparison.OrdinalIgnoreCase) ||
            line.Equals("Payment method", StringComparison.OrdinalIgnoreCase) ||
            line.Equals("Buyer", StringComparison.OrdinalIgnoreCase) ||
            line.Equals("Do the green thing", StringComparison.OrdinalIgnoreCase) ||
            line.Equals("Climate Impact Plan", StringComparison.OrdinalIgnoreCase) ||
            line.Equals("Love what you bought?", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return line.StartsWith("Item total", StringComparison.OrdinalIgnoreCase) ||
               line.StartsWith("Shop discount", StringComparison.OrdinalIgnoreCase) ||
               line.StartsWith("Shipping total", StringComparison.OrdinalIgnoreCase) ||
               line.StartsWith("Delivery total", StringComparison.OrdinalIgnoreCase) ||
               line.StartsWith("Subtotal", StringComparison.OrdinalIgnoreCase) ||
               line.StartsWith("Tax", StringComparison.OrdinalIgnoreCase) ||
               line.StartsWith("Order total", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsShipToHeader(string line)
    {
        return line.Equals("Ship to", StringComparison.OrdinalIgnoreCase) ||
               line.Equals("Deliver to", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsShipToStopLine(string line)
    {
        return line.Equals("Scheduled to ship by", StringComparison.OrdinalIgnoreCase) ||
               line.Equals("Scheduled to dispatch by", StringComparison.OrdinalIgnoreCase) ||
               line.Equals("Shop", StringComparison.OrdinalIgnoreCase) ||
               line.Equals("From", StringComparison.OrdinalIgnoreCase) ||
               line.Equals("Order date", StringComparison.OrdinalIgnoreCase) ||
               line.Equals("Payment method", StringComparison.OrdinalIgnoreCase) ||
               ItemCountRegex.IsMatch(line);
    }

    private static bool IsVariationLine(string line)
    {
        var separatorIndex = line.IndexOf(':');
        if (separatorIndex <= 0)
        {
            return false;
        }

        var prefix = line[..separatorIndex].Trim();
        return prefix.Equals("Type", StringComparison.OrdinalIgnoreCase) ||
               prefix.Equals("Size", StringComparison.OrdinalIgnoreCase) ||
               prefix.Equals("Style", StringComparison.OrdinalIgnoreCase) ||
               prefix.Equals("Color", StringComparison.OrdinalIgnoreCase) ||
               prefix.Equals("Material", StringComparison.OrdinalIgnoreCase) ||
               prefix.Equals("Finish", StringComparison.OrdinalIgnoreCase) ||
               prefix.Equals("Pattern", StringComparison.OrdinalIgnoreCase) ||
               prefix.StartsWith("Option", StringComparison.OrdinalIgnoreCase);
    }

    private static string JoinLines(IReadOnlyList<string> lines, int startIndex, int endIndex, string separator)
    {
        var builder = new StringBuilder();

        for (var index = startIndex; index < endIndex; index += 1)
        {
            var line = lines[index].Trim();
            if (line.Length == 0)
            {
                continue;
            }

            if (builder.Length > 0)
            {
                builder.Append(separator);
            }

            builder.Append(line);
        }

        return builder.ToString();
    }
}
