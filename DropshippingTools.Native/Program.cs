using DropshippingTools.Native.Composition;

namespace DropshippingTools.Native;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(ApplicationBootstrapper.CreateMainForm());
    }
}
