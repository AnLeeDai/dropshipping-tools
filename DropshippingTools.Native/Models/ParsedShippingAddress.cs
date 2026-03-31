namespace DropshippingTools.Native.Models;

internal sealed class ParsedShippingAddress
{
    public string DisplayValue { get; init; } = string.Empty;
    public string RecipientName { get; init; } = string.Empty;
    public string FullAddress { get; init; } = string.Empty;
    public string AddressLine1 { get; init; } = string.Empty;
    public string AddressLine2 { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public string StateOrProvince { get; init; } = string.Empty;
    public string PostalCode { get; init; } = string.Empty;
    public string Country { get; init; } = string.Empty;
}
