using System.Text;
using System.Runtime.InteropServices;
using DropshippingTools.Native.Formatting;

namespace DropshippingTools.Native.Services;

internal static class UnhandledExceptionHandler
{
    private static int _isReporting;

    public static void Register()
    {
        Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
        Application.ThreadException += (_, eventArgs) => Report(eventArgs.Exception, isTerminal: false);
        AppDomain.CurrentDomain.UnhandledException += (_, eventArgs) =>
        {
            var exception = eventArgs.ExceptionObject as Exception
                ?? new InvalidOperationException("Ứng dụng gặp lỗi không xác định.");

            Report(exception, isTerminal: true);
        };
        TaskScheduler.UnobservedTaskException += (_, eventArgs) =>
        {
            Report(eventArgs.Exception, isTerminal: false);
            eventArgs.SetObserved();
        };
    }

    private static void Report(Exception exception, bool isTerminal)
    {
        if (Interlocked.Exchange(ref _isReporting, 1) != 0)
        {
            return;
        }

        try
        {
            var logFilePath = TryWriteCrashLog(exception);
            var messageBuilder = new StringBuilder();
            messageBuilder.AppendLine(FriendlyErrorFormatter.Format(exception));

            if (!string.IsNullOrWhiteSpace(logFilePath))
            {
                messageBuilder.AppendLine();
                messageBuilder.Append("Chi tiết đã được ghi vào: ");
                messageBuilder.Append(logFilePath);
            }

            MessageBox.Show(
                messageBuilder.ToString(),
                AppInfo.ProductName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
        finally
        {
            if (!isTerminal)
            {
                Volatile.Write(ref _isReporting, 0);
            }
        }
    }

    private static string? TryWriteCrashLog(Exception exception)
    {
        try
        {
            var logDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "DropshippingTools",
                "logs");

            Directory.CreateDirectory(logDirectory);

            var logFilePath = Path.Combine(
                logDirectory,
                $"crash-{DateTimeOffset.Now:yyyyMMdd-HHmmssfff}.log");

            var content = $"""
                Timestamp: {DateTimeOffset.Now:O}
                Version: {AppInfo.CurrentVersionLabel}
                OS: {Environment.OSVersion}
                ProcessArchitecture: {RuntimeInformation.ProcessArchitecture}
                CLR: {Environment.Version}

                {exception}
                """;

            File.WriteAllText(logFilePath, content);
            return logFilePath;
        }
        catch
        {
            return null;
        }
    }
}
