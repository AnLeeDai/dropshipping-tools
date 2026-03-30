namespace DropshippingTools.Native;

internal static class AppInfo
{
    public const string ProductName = "Bộ công cụ Dropshipping";
    public const string UpdateFeedUrl = "https://anleedai.github.io/dropshipping-tools/updates/win/x64";
    public const string SettingsFileName = "settings.json";
    public static readonly Version CurrentVersion = typeof(AppInfo).Assembly.GetName().Version ?? new Version(0, 0, 4, 0);

    public static string CurrentVersionLabel => $"{CurrentVersion.Major}.{CurrentVersion.Minor}.{CurrentVersion.Build}";
}
