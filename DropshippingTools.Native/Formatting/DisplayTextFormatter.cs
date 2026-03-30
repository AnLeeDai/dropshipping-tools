using System.Globalization;
using System.Text;
using DropshippingTools.Native.Models;

namespace DropshippingTools.Native.Formatting;

internal static class DisplayTextFormatter
{
    public static string BuildClipboardPayload(IEnumerable<ParsedEtsyRow> rows)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Order ID\tShip To\tTitle\tSKU\tVariation\tPersonalization\tQty\tUnit Price");

        foreach (var row in rows)
        {
            builder.AppendLine(string.Join(
                '\t',
                SanitizeClipboardCell(row.OrderId),
                SanitizeClipboardCell(row.ShipTo),
                SanitizeClipboardCell(row.Title),
                SanitizeClipboardCell(row.Sku),
                SanitizeClipboardCell(row.Variation),
                SanitizeClipboardCell(row.Personalization),
                row.Quantity.ToString(CultureInfo.InvariantCulture),
                row.UnitPrice.ToString("0.00", CultureInfo.InvariantCulture)));
        }

        return builder.ToString();
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

    public static string FormatReleaseDate(string? releaseDate)
    {
        if (string.IsNullOrWhiteSpace(releaseDate))
        {
            return "--";
        }

        return DateTimeOffset.TryParse(releaseDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsedDate)
            ? parsedDate.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)
            : releaseDate;
    }

    private static string SanitizeClipboardCell(string value)
    {
        return value.Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal)
            .Replace("\t", " ", StringComparison.Ordinal)
            .Trim();
    }
}
