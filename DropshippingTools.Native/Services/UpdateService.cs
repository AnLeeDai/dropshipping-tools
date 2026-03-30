using DropshippingTools.Native.Models;
using Velopack;

namespace DropshippingTools.Native.Services;

internal sealed class UpdateService
{
    public async Task<UpdateCheckResult> CheckForUpdatesAsync(CancellationToken cancellationToken = default)
    {
        var manager = CreateUpdateManager();
        var currentVersion = manager.CurrentVersion?.ToString() ?? AppInfo.CurrentVersionLabel;

        if (!manager.IsInstalled)
        {
            return new UpdateCheckResult
            {
                CurrentVersion = currentVersion,
                IsInstalled = false,
                HasUpdate = false,
                IsUpdateReadyToRestart = false,
            };
        }

        var pendingUpdate = manager.UpdatePendingRestart;
        if (pendingUpdate is not null)
        {
            return new UpdateCheckResult
            {
                CurrentVersion = currentVersion,
                AvailableVersion = pendingUpdate.Version.ToString(),
                ReleaseNotes = pendingUpdate.NotesMarkdown,
                IsInstalled = true,
                HasUpdate = true,
                IsUpdateReadyToRestart = true,
                PendingAsset = pendingUpdate,
            };
        }

        cancellationToken.ThrowIfCancellationRequested();
        var updateInfo = await manager.CheckForUpdatesAsync();
        if (updateInfo is null)
        {
            return new UpdateCheckResult
            {
                CurrentVersion = currentVersion,
                IsInstalled = true,
                HasUpdate = false,
                IsUpdateReadyToRestart = false,
            };
        }

        return new UpdateCheckResult
        {
            CurrentVersion = currentVersion,
            AvailableVersion = updateInfo.TargetFullRelease.Version.ToString(),
            ReleaseNotes = updateInfo.TargetFullRelease.NotesMarkdown,
            IsInstalled = true,
            HasUpdate = true,
            IsUpdateReadyToRestart = false,
            UpdateInfo = updateInfo,
        };
    }

    public async Task DownloadAndApplyAsync(
        UpdateCheckResult update,
        IProgress<int>? progress = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(update);

        var manager = CreateUpdateManager();
        if (!manager.IsInstalled)
        {
            throw new InvalidOperationException("Ứng dụng hiện không chạy từ bản cài đặt. Hãy cài bằng bộ cài một lần để dùng cập nhật tự động.");
        }

        var pendingUpdate = update.PendingAsset ?? manager.UpdatePendingRestart;
        if (pendingUpdate is not null)
        {
            manager.ApplyUpdatesAndRestart(pendingUpdate);
            return;
        }

        var updateInfo = update.UpdateInfo;
        if (updateInfo is null)
        {
            updateInfo = await manager.CheckForUpdatesAsync();
        }

        if (updateInfo is null)
        {
            throw new InvalidOperationException("Không tìm thấy bản cập nhật mới.");
        }

        await manager.DownloadUpdatesAsync(
            updateInfo,
            percent => progress?.Report(percent),
            cancellationToken);

        pendingUpdate = manager.UpdatePendingRestart ?? updateInfo.TargetFullRelease;
        manager.ApplyUpdatesAndRestart(pendingUpdate);
    }

    private static UpdateManager CreateUpdateManager()
    {
        return new UpdateManager(AppInfo.UpdateFeedUrl);
    }
}
