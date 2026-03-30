namespace DropshippingTools.Native.Models;

internal sealed class QueuedPdfFile
{
    public required string FilePath { get; init; }
    public required string FileName { get; init; }
    public required long FileSizeBytes { get; init; }
    public string StatusText { get; set; } = "Queued";
    public int RowCount { get; set; }
    public string? ErrorMessage { get; set; }
}
