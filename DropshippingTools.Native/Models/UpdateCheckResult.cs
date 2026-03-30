using Velopack;

namespace DropshippingTools.Native.Models;

internal sealed class UpdateCheckResult
{
    public required string CurrentVersion { get; init; }
    public string? AvailableVersion { get; init; }
    public string? ReleaseNotes { get; init; }
    public required bool IsInstalled { get; init; }
    public required bool HasUpdate { get; init; }
    public required bool IsUpdateReadyToRestart { get; init; }

    internal UpdateInfo? UpdateInfo { get; init; }
    internal VelopackAsset? PendingAsset { get; init; }
}
