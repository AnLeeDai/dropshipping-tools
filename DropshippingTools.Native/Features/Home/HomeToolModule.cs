using DropshippingTools.Native.Shell;

namespace DropshippingTools.Native.Features.Home;

internal sealed class HomeToolModule : IAppToolModule
{
    public AppToolDescriptor Descriptor { get; } = new(
        Id: "home",
        DisplayName: "Trang chủ",
        Description: "Trang bắt đầu.",
        ShowInLauncher: false);

    public Control CreateView(ToolHostContext context)
    {
        return new HomeToolPage(context);
    }
}
