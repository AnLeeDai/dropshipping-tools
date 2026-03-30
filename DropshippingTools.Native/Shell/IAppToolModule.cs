namespace DropshippingTools.Native.Shell;

internal interface IAppToolModule
{
    AppToolDescriptor Descriptor { get; }

    Control CreateView(ToolHostContext context);
}
