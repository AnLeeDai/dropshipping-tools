namespace DropshippingTools.Native.Models;

internal sealed class UpdateCheckResult
{
    public required string CurrentVersion { get; init; }
    public required ReleaseMetadata Metadata { get; init; }
    public required Uri MetadataUri { get; init; }
    public required bool HasUpdate { get; init; }

    public Uri DownloadUri => new(MetadataUri, Metadata.DownloadUrl);
}
