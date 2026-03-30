namespace DropshippingTools.Native.Shell;

internal sealed record AppToolDescriptor(
    string Id,
    string DisplayName,
    string Description,
    bool ShowInLauncher = true);
