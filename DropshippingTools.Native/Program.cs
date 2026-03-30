using DropshippingTools.Native.Composition;
using DropshippingTools.Native.Services;
using Velopack;

namespace DropshippingTools.Native;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        VelopackApp.Build()
            .SetArgs(args)
            .SetAutoApplyOnStartup(false)
            .Run();
        ApplicationConfiguration.Initialize();
        UnhandledExceptionHandler.Register();
        Application.Run(ApplicationBootstrapper.CreateMainForm());
    }
}
