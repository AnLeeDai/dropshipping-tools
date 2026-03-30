using DropshippingTools.Native.Features.EtsyPdf;
using DropshippingTools.Native.Features.Home;
using DropshippingTools.Native.Features.Settings;
using DropshippingTools.Native.Services;
using DropshippingTools.Native.Shell;

namespace DropshippingTools.Native.Composition;

internal static class ApplicationBootstrapper
{
    public static MainForm CreateMainForm()
    {
        var settingsService = new SettingsService();
        var updateService = new UpdateService();
        var etsyPdfParser = new EtsyPdfParser();

        IReadOnlyList<IAppToolModule> modules =
        [
            new HomeToolModule(),
            new EtsyPdfToolModule(etsyPdfParser),
            new SettingsToolModule(settingsService, updateService),
        ];

        return new MainForm(modules);
    }
}
