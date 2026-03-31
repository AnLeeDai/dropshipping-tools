namespace DropshippingTools.Native.Models;

internal sealed class ParsedEtsyRow
{
    public string OrderId { get; init; } = string.Empty;
    public string ShipTo { get; init; } = string.Empty;
    public string ShipToName { get; init; } = string.Empty;
    public string ShipToFullAddress { get; init; } = string.Empty;
    public string ShipToAddressLine1 { get; init; } = string.Empty;
    public string ShipToAddressLine2 { get; init; } = string.Empty;
    public string ShipToCity { get; init; } = string.Empty;
    public string ShipToState { get; init; } = string.Empty;
    public string ShipToPostalCode { get; init; } = string.Empty;
    public string ShipToCountry { get; init; } = string.Empty;
    public string ShipToPhone { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Sku { get; init; } = string.Empty;
    public string Variation { get; init; } = string.Empty;
    public string Personalization { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
}
