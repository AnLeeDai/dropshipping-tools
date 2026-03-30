using DropshippingTools.Native.Services;

namespace DropshippingTools.Native.Composition;

internal static class ApplicationBootstrapper
{
    public static MainForm CreateMainForm()
    {
        return new MainForm(
            new SettingsService(),
            new UpdateService(),
            new EtsyPdfParser());
    }
}
