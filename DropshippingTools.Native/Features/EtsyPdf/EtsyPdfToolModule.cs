using DropshippingTools.Native.Shell;
using DropshippingTools.Native.Services;

namespace DropshippingTools.Native.Features.EtsyPdf;

internal sealed class EtsyPdfToolModule : IAppToolModule
{
    private readonly EtsyPdfParser _etsyPdfParser;

    public EtsyPdfToolModule(EtsyPdfParser etsyPdfParser)
    {
        _etsyPdfParser = etsyPdfParser ?? throw new ArgumentNullException(nameof(etsyPdfParser));
    }

    public AppToolDescriptor Descriptor { get; } = new(
        Id: "etsy-pdf",
        DisplayName: "PDF Etsy",
        Description: "Xử lý PDF đơn Etsy.");

    public Control CreateView(ToolHostContext context)
    {
        return new EtsyPdfToolPage(context, _etsyPdfParser);
    }
}
