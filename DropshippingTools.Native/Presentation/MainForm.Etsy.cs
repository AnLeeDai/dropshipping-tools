using System.Globalization;
using DropshippingTools.Native.Formatting;
using DropshippingTools.Native.Models;

namespace DropshippingTools.Native;

internal sealed partial class MainForm
{
    private void HandleAddPdfFiles(object? sender, EventArgs e)
    {
        using var dialog = new OpenFileDialog
        {
            Filter = "PDF files (*.pdf)|*.pdf",
            Multiselect = true,
            Title = "Select Etsy PDF files",
        };

        if (dialog.ShowDialog(this) == DialogResult.OK)
        {
            QueueFiles(dialog.FileNames);
        }
    }

    private void HandleRemoveSelectedFiles(object? sender, EventArgs e)
    {
        if (_queueListView.SelectedIndices.Count == 0)
        {
            return;
        }

        var selectedIndexes = _queueListView.SelectedIndices.Cast<int>().OrderDescending().ToArray();
        foreach (var index in selectedIndexes)
        {
            _queuedFiles.RemoveAt(index);
        }

        RefreshQueueView();
        SetStatus($"Removed {selectedIndexes.Length} file(s) from queue.");
    }

    private void HandleClearQueue(object? sender, EventArgs e)
    {
        if (!HasQueuedFiles)
        {
            return;
        }

        _queuedFiles.Clear();
        RefreshQueueView();
        SetStatus("Queue cleared.");
    }

    private async void HandleProcessQueueAsync(object? sender, EventArgs e)
    {
        await ProcessQueueAsync();
    }

    private void HandleClearResults(object? sender, EventArgs e)
    {
        _parsedRows.Clear();
        RefreshWindowState();
        SetStatus("Results cleared.");
    }

    private void HandleCopyResults(object? sender, EventArgs e)
    {
        if (!HasParsedRows)
        {
            MessageBox.Show(this, "Chua co du lieu de copy.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        Clipboard.SetText(DisplayTextFormatter.BuildClipboardPayload(_parsedRows));
        SetStatus($"Copied {_parsedRows.Count} row(s) to clipboard.");
    }

    private void HandlePdfDragEnter(object? sender, DragEventArgs e)
    {
        var filePaths = e.Data?.GetData(DataFormats.FileDrop) as string[];
        e.Effect = filePaths is not null && filePaths.Any(IsPdfFile) ? DragDropEffects.Copy : DragDropEffects.None;
    }

    private void HandlePdfDragDrop(object? sender, DragEventArgs e)
    {
        var filePaths = e.Data?.GetData(DataFormats.FileDrop) as string[];
        if (filePaths is null || filePaths.Length == 0)
        {
            return;
        }

        _tabs.SelectedTab = _etsyTab;
        QueueFiles(filePaths);
    }

    private void QueueFiles(IEnumerable<string> filePaths)
    {
        var addedCount = 0;
        var knownPaths = _queuedFiles
            .Select(item => item.FilePath)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var filePath in filePaths)
        {
            if (!TryCreateQueuedFile(filePath, out var queuedFile) || !knownPaths.Add(queuedFile.FilePath))
            {
                continue;
            }

            _queuedFiles.Add(queuedFile);
            addedCount += 1;
        }

        RefreshQueueView();
        SetStatus(addedCount > 0
            ? $"Added {addedCount} PDF file(s) to queue."
            : "No new PDF file was added.");
    }

    private async Task ProcessQueueAsync()
    {
        if (_isProcessingQueue)
        {
            return;
        }

        if (!HasQueuedFiles)
        {
            MessageBox.Show(this, "Queue dang trong. Hay them it nhat mot file PDF.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        _tabs.SelectedTab = _etsyTab;
        _isProcessingQueue = true;
        _parsedRows.Clear();
        ResetQueuedFilesForProcessing();

        ShowProgress(maximum: _queuedFiles.Count, value: 0, style: ProgressBarStyle.Continuous);
        RefreshQueueView();
        RefreshWindowState();
        SetStatus("Processing PDF queue...");

        var processedCount = 0;

        try
        {
            foreach (var queuedFile in _queuedFiles)
            {
                await ProcessQueuedFileAsync(queuedFile);
                processedCount += 1;
                SetProgressValue(processedCount);
                RefreshQueueView();
            }

            SetStatus($"Finished processing {_queuedFiles.Count} file(s). Parsed {_parsedRows.Count} row(s).");
        }
        finally
        {
            _isProcessingQueue = false;
            HideProgress();
            RefreshWindowState();
        }
    }

    private void RefreshQueueView()
    {
        _queueListView.BeginUpdate();
        _queueListView.Items.Clear();

        foreach (var queuedFile in _queuedFiles)
        {
            var item = new ListViewItem(queuedFile.FileName);
            item.SubItems.Add(DisplayTextFormatter.FormatFileSize(queuedFile.FileSizeBytes));
            item.SubItems.Add(queuedFile.StatusText);
            item.SubItems.Add(queuedFile.RowCount.ToString(CultureInfo.InvariantCulture));
            item.SubItems.Add(queuedFile.ErrorMessage ?? string.Empty);
            _queueListView.Items.Add(item);
        }

        _queueListView.EndUpdate();
        RefreshWindowState();
    }

    private async Task ProcessQueuedFileAsync(QueuedPdfFile queuedFile)
    {
        queuedFile.StatusText = "Processing";
        queuedFile.ErrorMessage = string.Empty;
        RefreshQueueView();
        SetStatus($"Processing {queuedFile.FileName}...");

        try
        {
            var rows = await Task.Run(() => _etsyPdfParser.ParseFile(queuedFile.FilePath));
            AddParsedRows(rows);

            queuedFile.RowCount = rows.Count;
            queuedFile.StatusText = rows.Count > 0 ? "Done" : "No data";
            queuedFile.ErrorMessage = rows.Count > 0 ? string.Empty : "Khong tim thay dong Etsy hop le trong file.";
        }
        catch (Exception ex)
        {
            queuedFile.StatusText = "Failed";
            queuedFile.ErrorMessage = FriendlyErrorFormatter.Format(ex);
        }
    }

    private void ResetQueuedFilesForProcessing()
    {
        foreach (var queuedFile in _queuedFiles)
        {
            queuedFile.StatusText = "Queued";
            queuedFile.RowCount = 0;
            queuedFile.ErrorMessage = string.Empty;
        }
    }

    private void AddParsedRows(IReadOnlyList<ParsedEtsyRow> rows)
    {
        foreach (var row in rows)
        {
            _parsedRows.Add(row);
        }
    }

    private static bool TryCreateQueuedFile(string filePath, out QueuedPdfFile queuedFile)
    {
        queuedFile = null!;

        if (!IsPdfFile(filePath))
        {
            return false;
        }

        try
        {
            var fullPath = Path.GetFullPath(filePath);
            var fileInfo = new FileInfo(fullPath);
            if (!fileInfo.Exists)
            {
                return false;
            }

            queuedFile = new QueuedPdfFile
            {
                FilePath = fileInfo.FullName,
                FileName = fileInfo.Name,
                FileSizeBytes = fileInfo.Length,
            };

            return true;
        }
        catch
        {
            return false;
        }
    }

    private static bool IsPdfFile(string path)
    {
        return path.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);
    }
}
