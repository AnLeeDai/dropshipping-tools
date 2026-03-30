namespace DropshippingTools.Native.Models;

internal sealed class ParsedEtsyRow
{
    public string OrderId { get; init; } = string.Empty;
    public string ShipTo { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Sku { get; init; } = string.Empty;
    public string Variation { get; init; } = string.Empty;
    public string Personalization { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
}
