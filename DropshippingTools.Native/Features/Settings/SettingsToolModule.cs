using DropshippingTools.Native.Services;
using DropshippingTools.Native.Shell;

namespace DropshippingTools.Native.Features.Settings;

internal sealed class SettingsToolModule : IAppToolModule
{
    private readonly SettingsService _settingsService;
    private readonly UpdateService _updateService;

    public SettingsToolModule(SettingsService settingsService, UpdateService updateService)
    {
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
        _updateService = updateService ?? throw new ArgumentNullException(nameof(updateService));
    }

    public AppToolDescriptor Descriptor { get; } = new(
        Id: "settings",
        DisplayName: "Cài đặt",
        Description: "Cập nhật và thông tin ứng dụng.");

    public Control CreateView(ToolHostContext context)
    {
        return new SettingsToolPage(context, _settingsService, _updateService);
    }
}
