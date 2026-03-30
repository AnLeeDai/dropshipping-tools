using System.Globalization;
using DropshippingTools.Native.Models;

namespace DropshippingTools.Native.Formatting;

internal static class DisplayTextFormatter
{
    public static string BuildClipboardPayload(IEnumerable<ParsedEtsyRow> rows)
    {
        return string.Join(
            Environment.NewLine,
            rows.Select(row => string.Join(
                '\t',
                SanitizeClipboardCell(row.OrderId),
                SanitizeClipboardCell(row.ShipTo),
                SanitizeClipboardCell(row.Title),
                SanitizeClipboardCell(row.Sku),
                SanitizeClipboardCell(row.Variation),
                SanitizeClipboardCell(row.Personalization),
                row.Quantity.ToString(CultureInfo.InvariantCulture),
                row.UnitPrice.ToString("0.00", CultureInfo.InvariantCulture))));
    }

    public static string FormatFileSize(long sizeInBytes)
    {
        const double oneKilobyte = 1024;
        const double oneMegabyte = oneKilobyte * 1024;

        if (sizeInBytes >= oneMegabyte)
        {
            return $"{sizeInBytes / oneMegabyte:0.0} MB";
        }

        if (sizeInBytes >= oneKilobyte)
        {
            return $"{sizeInBytes / oneKilobyte:0.0} KB";
        }

        return $"{sizeInBytes} B";
    }

    private static string SanitizeClipboardCell(string value)
    {
        return value.Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal)
            .Replace("\t", " ", StringComparison.Ordinal)
            .Trim();
    }
}
