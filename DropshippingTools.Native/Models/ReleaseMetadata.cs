namespace DropshippingTools.Native.Models;

internal sealed class ReleaseMetadata
{
    public string Version { get; init; } = string.Empty;
    public string ReleaseName { get; init; } = string.Empty;
    public string ReleaseNotes { get; init; } = string.Empty;
    public string? ReleaseDate { get; init; }
    public string DownloadUrl { get; init; } = string.Empty;
}
