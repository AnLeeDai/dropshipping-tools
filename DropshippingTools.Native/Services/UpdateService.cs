using System.Diagnostics;
using System.Net.Http.Json;
using DropshippingTools.Native.Models;

namespace DropshippingTools.Native.Services;

internal sealed class UpdateService
{
    private static readonly HttpClient HttpClient = new()
    {
        Timeout = TimeSpan.FromSeconds(30),
    };

    public async Task<UpdateCheckResult> CheckForUpdatesAsync(CancellationToken cancellationToken = default)
    {
        var metadataUri = new Uri(AppInfo.UpdateMetadataUrl);
        using var response = await HttpClient.GetAsync(metadataUri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var metadata = await response.Content.ReadFromJsonAsync<ReleaseMetadata>(cancellationToken: cancellationToken);
        if (metadata is null)
        {
            throw new InvalidOperationException("Update metadata is empty.");
        }

        if (string.IsNullOrWhiteSpace(metadata.DownloadUrl))
        {
            throw new InvalidOperationException("Update metadata is missing downloadUrl.");
        }

        var currentVersion = AppInfo.CurrentVersionLabel;
        var hasUpdate = VersionComparer.Compare(metadata.Version, currentVersion) > 0;

        return new UpdateCheckResult
        {
            CurrentVersion = currentVersion,
            Metadata = metadata,
            MetadataUri = metadataUri,
            HasUpdate = hasUpdate,
        };
    }

    public async Task DownloadAndReplaceAsync(
        UpdateCheckResult update,
        IProgress<int>? progress = null,
        CancellationToken cancellationToken = default)
    {
        var downloadUri = update.DownloadUri;
        var tempFilePath = Path.Combine(
            Path.GetTempPath(),
            $"DropshippingTools-update-{Guid.NewGuid():N}{Path.GetExtension(downloadUri.AbsolutePath)}");

        using (var response = await HttpClient.GetAsync(downloadUri, HttpCompletionOption.ResponseHeadersRead, cancellationToken))
        {
            response.EnsureSuccessStatusCode();

            var contentLength = response.Content.Headers.ContentLength;
            await using var input = await response.Content.ReadAsStreamAsync(cancellationToken);
            await using var output = File.Create(tempFilePath);

            var buffer = new byte[81920];
            long totalRead = 0;
            int bytesRead;

            while ((bytesRead = await input.ReadAsync(buffer, cancellationToken)) > 0)
            {
                await output.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
                totalRead += bytesRead;

                if (contentLength.HasValue && contentLength.Value > 0 && progress is not null)
                {
                    var percent = (int)Math.Round((double)totalRead / contentLength.Value * 100, MidpointRounding.AwayFromZero);
                    progress.Report(Math.Clamp(percent, 0, 100));
                }
            }
        }

        progress?.Report(100);
        ScheduleExecutableReplacement(tempFilePath);
    }

    private static void ScheduleExecutableReplacement(string downloadedFilePath)
    {
        var currentExecutablePath = Application.ExecutablePath;
        var scriptPath = Path.Combine(Path.GetTempPath(), $"DropshippingTools-replace-{Guid.NewGuid():N}.cmd");
        var scriptContent = $"""
            @echo off
            setlocal
            set "TARGET={currentExecutablePath}"
            set "SOURCE={downloadedFilePath}"

            :wait_for_exit
            timeout /t 1 /nobreak > nul
            copy /y "%SOURCE%" "%TARGET%" > nul 2>&1
            if errorlevel 1 goto wait_for_exit

            start "" "%TARGET%"
            del /f /q "%SOURCE%" > nul 2>&1
            del /f /q "%~f0" > nul 2>&1
            """;

        File.WriteAllText(scriptPath, scriptContent);

        var startInfo = new ProcessStartInfo("cmd.exe", $"/c \"{scriptPath}\"")
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden,
        };

        Process.Start(startInfo);
    }
}
