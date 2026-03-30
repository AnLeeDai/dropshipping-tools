using DropshippingTools.Native.Composition;
using DropshippingTools.Native.Services;

namespace DropshippingTools.Native;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        UnhandledExceptionHandler.Register();
        Application.Run(ApplicationBootstrapper.CreateMainForm());
    }
}
