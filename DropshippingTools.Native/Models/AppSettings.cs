namespace DropshippingTools.Native.Models;

internal sealed class AppSettings
{
    public bool AutoNotifyOnStartup { get; set; } = true;
    public DateTimeOffset? LastCheckedAt { get; set; }
}
