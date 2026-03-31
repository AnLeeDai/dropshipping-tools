using System.Text.RegularExpressions;
using DropshippingTools.Native.Models;

namespace DropshippingTools.Native.Services;

internal static class ShippingAddressParser
{
    private static readonly Regex CityStatePostalRegex = new(
        @"^(?<city>.+?)\s*,?\s+(?<state>[A-Z]{2})\s*,?\s*(?<postal>\d{5}(?:-\d{4})?)$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex StatePostalRegex = new(
        @"^(?<state>[A-Z]{2})\s*,?\s*(?<postal>\d{5}(?:-\d{4})?)$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex StateCodeRegex = new(
        @"^[A-Z]{2}$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PostalCodeRegex = new(
        @"^\d{5}(?:-\d{4})?$|^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static ParsedShippingAddress Parse(IReadOnlyList<string> rawLines)
    {
        var lines = rawLines
            .Select(NormalizeSegment)
            .Where(static line => line.Length > 0)
            .ToList();

        if (lines.Count == 0)
        {
            return new ParsedShippingAddress();
        }

        var recipientName = lines[0];
        var displayValue = string.Join(", ", lines);
        if (lines.Count == 1)
        {
            return new ParsedShippingAddress
            {
                DisplayValue = displayValue,
                RecipientName = recipientName,
            };
        }

        var country = lines[^1];
        var coreSegments = lines
            .Skip(1)
            .Take(lines.Count - 2)
            .SelectMany(SplitSegments)
            .ToList();

        var addressLine1 = string.Empty;
        var addressLine2 = string.Empty;
        var city = string.Empty;
        var stateOrProvince = string.Empty;
        var postalCode = string.Empty;
        var locationSegmentCount = 0;

        if (coreSegments.Count > 0)
        {
            if (TryParseCityStatePostal(coreSegments[^1], out city, out stateOrProvince, out postalCode))
            {
                locationSegmentCount = 1;
            }
            else if (coreSegments.Count >= 2 && TryParseStatePostal(coreSegments[^1], out stateOrProvince, out postalCode))
            {
                city = coreSegments[^2];
                locationSegmentCount = 2;
            }
            else if (coreSegments.Count >= 3 &&
                LooksLikeStateCode(coreSegments[^2]) &&
                LooksLikePostalCode(coreSegments[^1]))
            {
                city = coreSegments[^3];
                stateOrProvince = coreSegments[^2];
                postalCode = coreSegments[^1];
                locationSegmentCount = 3;
            }
            else if (coreSegments.Count >= 2 && LooksLikePostalCode(coreSegments[^1]))
            {
                city = coreSegments[^2];
                postalCode = coreSegments[^1];
                locationSegmentCount = 2;
            }

            var streetSegments = coreSegments
                .Take(Math.Max(0, coreSegments.Count - locationSegmentCount))
                .ToList();

            if (streetSegments.Count > 0)
            {
                addressLine1 = streetSegments[0];
                addressLine2 = string.Join(", ", streetSegments.Skip(1));
            }
        }

        var fullAddressSegments = new List<string>();
        AddIfNotBlank(fullAddressSegments, addressLine1);
        AddIfNotBlank(fullAddressSegments, addressLine2);
        AddIfNotBlank(fullAddressSegments, city);
        AddIfNotBlank(fullAddressSegments, stateOrProvince);
        AddIfNotBlank(fullAddressSegments, postalCode);
        AddIfNotBlank(fullAddressSegments, country);

        var fullAddress = fullAddressSegments.Count > 0
            ? string.Join(", ", fullAddressSegments)
            : string.Join(", ", lines.Skip(1));

        return new ParsedShippingAddress
        {
            DisplayValue = displayValue,
            RecipientName = recipientName,
            FullAddress = fullAddress,
            AddressLine1 = addressLine1,
            AddressLine2 = addressLine2,
            City = city,
            StateOrProvince = stateOrProvince,
            PostalCode = postalCode,
            Country = country,
        };
    }

    private static IEnumerable<string> SplitSegments(string line)
    {
        return line
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(NormalizeSegment)
            .Where(static segment => segment.Length > 0);
    }

    private static bool TryParseCityStatePostal(string segment, out string city, out string stateOrProvince, out string postalCode)
    {
        var match = CityStatePostalRegex.Match(segment);
        if (match.Success)
        {
            city = NormalizeSegment(match.Groups["city"].Value);
            stateOrProvince = NormalizeSegment(match.Groups["state"].Value).ToUpperInvariant();
            postalCode = NormalizeSegment(match.Groups["postal"].Value);
            return true;
        }

        city = string.Empty;
        stateOrProvince = string.Empty;
        postalCode = string.Empty;
        return false;
    }

    private static bool TryParseStatePostal(string segment, out string stateOrProvince, out string postalCode)
    {
        var match = StatePostalRegex.Match(segment);
        if (match.Success)
        {
            stateOrProvince = NormalizeSegment(match.Groups["state"].Value).ToUpperInvariant();
            postalCode = NormalizeSegment(match.Groups["postal"].Value);
            return true;
        }

        stateOrProvince = string.Empty;
        postalCode = string.Empty;
        return false;
    }

    private static bool LooksLikeStateCode(string segment)
    {
        return StateCodeRegex.IsMatch(NormalizeSegment(segment));
    }

    private static bool LooksLikePostalCode(string segment)
    {
        return PostalCodeRegex.IsMatch(NormalizeSegment(segment));
    }

    private static string NormalizeSegment(string value)
    {
        return string.Join(' ', value.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
    }

    private static void AddIfNotBlank(ICollection<string> segments, string value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            segments.Add(value);
        }
    }
}
