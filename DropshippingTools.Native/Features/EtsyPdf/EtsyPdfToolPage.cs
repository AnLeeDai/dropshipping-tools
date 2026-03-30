using System.Globalization;
using DropshippingTools.Native.Formatting;
using DropshippingTools.Native.Models;
using DropshippingTools.Native.Services;
using DropshippingTools.Native.Shell;
using DropshippingTools.Native.UI.Controls;

namespace DropshippingTools.Native.Features.EtsyPdf;

internal sealed class EtsyPdfToolPage : UserControl
{
    private readonly ToolHostContext _context;
    private readonly EtsyPdfParser _etsyPdfParser;
    private readonly BindingSource _resultsBindingSource = new();
    private readonly List<ParsedEtsyRow> _parsedRows = [];
    private readonly List<QueuedPdfFile> _queuedFiles = [];

    private bool _isProcessingQueue;

    private ListView _queueListView = null!;
    private DataGridView _resultsGrid = null!;
    private Button _addPdfButton = null!;
    private Button _removeSelectedButton = null!;
    private Button _clearQueueButton = null!;
    private Button _processQueueButton = null!;
    private Button _clearResultsButton = null!;
    private Button _copyResultsButton = null!;

    public EtsyPdfToolPage(ToolHostContext context, EtsyPdfParser etsyPdfParser)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _etsyPdfParser = etsyPdfParser ?? throw new ArgumentNullException(nameof(etsyPdfParser));
        _resultsBindingSource.DataSource = _parsedRows;

        Dock = DockStyle.Fill;
        AllowDrop = true;
        DragEnter += HandlePdfDragEnter;
        DragDrop += HandlePdfDragDrop;

        InitializeLayout();
        RefreshQueueView();
        RefreshPageState();
    }

    private bool HasQueuedFiles => _queuedFiles.Count > 0;
    private bool HasParsedRows => _parsedRows.Count > 0;

    private void InitializeLayout()
    {
        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(16),
            ColumnCount = 1,
            RowCount = 3,
        };
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

        var instructionsLabel = new Label
        {
            AutoSize = true,
            MaximumSize = new Size(980, 0),
            Text = "Thêm tệp PDF Etsy, xử lý và sao chép kết quả.",
            Margin = new Padding(0, 0, 0, 10),
        };

        var actionsPanel = new FlowLayoutPanel
        {
            AutoSize = true,
            WrapContents = true,
            FlowDirection = FlowDirection.LeftToRight,
            Margin = new Padding(0, 0, 0, 12),
        };

        _addPdfButton = CreateActionButton("Thêm PDF", HandleAddPdfFiles);
        _removeSelectedButton = CreateActionButton("Xóa mục đã chọn", HandleRemoveSelectedFiles);
        _clearQueueButton = CreateActionButton("Xóa hàng chờ", HandleClearQueue);
        _processQueueButton = CreateActionButton("Xử lý hàng chờ", HandleProcessQueueAsync);
        _clearResultsButton = CreateActionButton("Xóa kết quả", HandleClearResults);
        _copyResultsButton = CreateActionButton("Sao chép kết quả", HandleCopyResults);

        actionsPanel.Controls.AddRange(
        [
            _addPdfButton,
            _removeSelectedButton,
            _clearQueueButton,
            _processQueueButton,
            _clearResultsButton,
            _copyResultsButton,
        ]);

        var splitContainer = new SplitContainer
        {
            Dock = DockStyle.Fill,
            Orientation = Orientation.Horizontal,
            SplitterDistance = 250,
        };

        var queueLayout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
        };
        queueLayout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        queueLayout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

        var queueLabel = new Label
        {
            AutoSize = true,
            Text = "Tệp trong hàng chờ",
            Font = new Font(Font, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 8),
        };

        _queueListView = new BufferedListView
        {
            Dock = DockStyle.Fill,
            FullRowSelect = true,
            MultiSelect = true,
            View = View.Details,
            HideSelection = false,
            AllowDrop = true,
        };
        _queueListView.Columns.Add("Tệp", 360);
        _queueListView.Columns.Add("Kích thước", 100);
        _queueListView.Columns.Add("Trạng thái", 120);
        _queueListView.Columns.Add("Dòng", 70);
        _queueListView.Columns.Add("Thông báo", 460);
        _queueListView.DragEnter += HandlePdfDragEnter;
        _queueListView.DragDrop += HandlePdfDragDrop;
        _queueListView.SelectedIndexChanged += (_, _) => RefreshPageState();

        queueLayout.Controls.Add(queueLabel, 0, 0);
        queueLayout.Controls.Add(_queueListView, 0, 1);
        splitContainer.Panel1.Controls.Add(queueLayout);

        var resultsLayout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2,
        };
        resultsLayout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        resultsLayout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

        var resultsLabel = new Label
        {
            AutoSize = true,
            Text = "Dòng đã phân tích",
            Font = new Font(Font, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 8),
        };

        _resultsGrid = new BufferedDataGridView
        {
            Dock = DockStyle.Fill,
            ReadOnly = true,
            AllowUserToAddRows = false,
            AllowUserToDeleteRows = false,
            AllowUserToResizeRows = false,
            MultiSelect = true,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            AutoGenerateColumns = false,
            RowHeadersVisible = false,
            DataSource = _resultsBindingSource,
        };

        _resultsGrid.Columns.Add(CreateTextColumn("OrderId", "Order ID", 120));
        _resultsGrid.Columns.Add(CreateTextColumn("ShipTo", "Ship To", 240));
        _resultsGrid.Columns.Add(CreateTextColumn("Title", "Title", 220));
        _resultsGrid.Columns.Add(CreateTextColumn("Sku", "SKU", 120));
        _resultsGrid.Columns.Add(CreateTextColumn("Variation", "Variation", 180));
        _resultsGrid.Columns.Add(CreateTextColumn("Personalization", "Personalization", 220));
        _resultsGrid.Columns.Add(CreateTextColumn("Quantity", "Qty", 60));

        var priceColumn = CreateTextColumn("UnitPrice", "Unit Price", 90);
        priceColumn.DefaultCellStyle.Format = "0.00";
        _resultsGrid.Columns.Add(priceColumn);

        resultsLayout.Controls.Add(resultsLabel, 0, 0);
        resultsLayout.Controls.Add(_resultsGrid, 0, 1);
        splitContainer.Panel2.Controls.Add(resultsLayout);

        layout.Controls.Add(instructionsLabel, 0, 0);
        layout.Controls.Add(actionsPanel, 0, 1);
        layout.Controls.Add(splitContainer, 0, 2);

        Controls.Add(layout);
    }

    private void HandleAddPdfFiles(object? sender, EventArgs e)
    {
        using var dialog = new OpenFileDialog
        {
            Filter = "Tệp PDF (*.pdf)|*.pdf",
            Multiselect = true,
            Title = "Chọn tệp PDF Etsy",
        };

        if (dialog.ShowDialog(FindForm()) == DialogResult.OK)
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
        _context.SetStatus($"Đã xóa {selectedIndexes.Length} tệp khỏi hàng chờ.");
    }

    private void HandleClearQueue(object? sender, EventArgs e)
    {
        if (!HasQueuedFiles)
        {
            return;
        }

        _queuedFiles.Clear();
        RefreshQueueView();
        _context.SetStatus("Đã xóa toàn bộ hàng chờ.");
    }

    private async void HandleProcessQueueAsync(object? sender, EventArgs e)
    {
        await ProcessQueueAsync();
    }

    private void HandleClearResults(object? sender, EventArgs e)
    {
        ReplaceParsedRows([]);
        RefreshPageState();
        _context.SetStatus("Đã xóa kết quả.");
    }

    private void HandleCopyResults(object? sender, EventArgs e)
    {
        if (!HasParsedRows)
        {
            MessageBox.Show(FindForm(), "Chưa có dữ liệu để sao chép.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        Clipboard.SetText(DisplayTextFormatter.BuildClipboardPayload(_parsedRows));
        _context.SetStatus($"Đã sao chép {_parsedRows.Count} dòng vào clipboard.");
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
        _context.SetStatus(addedCount > 0
            ? $"Đã thêm {addedCount} tệp PDF vào hàng chờ."
            : "Không có tệp PDF mới nào được thêm.");
    }

    private async Task ProcessQueueAsync()
    {
        if (_isProcessingQueue)
        {
            return;
        }

        if (!HasQueuedFiles)
        {
            MessageBox.Show(FindForm(), "Hàng chờ đang trống. Hãy thêm ít nhất một tệp PDF.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        _isProcessingQueue = true;
        ReplaceParsedRows([]);
        ResetQueuedFilesForProcessing();

        _context.ShowProgress(maximum: _queuedFiles.Count, value: 0, style: ProgressBarStyle.Continuous);
        RefreshQueueView();
        RefreshPageState();

        var parallelism = GetRecommendedParallelism();
        _context.SetStatus($"Đang xử lý hàng chờ PDF với {parallelism} luồng...");

        var processedCount = 0;
        var processingResults = new FileProcessingResult?[_queuedFiles.Count];

        try
        {
            var parallelOptions = new ParallelOptions
            {
                MaxDegreeOfParallelism = parallelism,
            };

            await Parallel.ForEachAsync(Enumerable.Range(0, _queuedFiles.Count), parallelOptions, (index, _) =>
            {
                ReportQueueProcessingUpdate(QueueProcessingUpdate.Started(index));

                var result = ProcessQueuedFile(_queuedFiles[index]);
                processingResults[index] = result;

                var completedCount = Interlocked.Increment(ref processedCount);
                ReportQueueProcessingUpdate(QueueProcessingUpdate.Completed(index, completedCount, result));

                return ValueTask.CompletedTask;
            });

            var mergedRows = new List<ParsedEtsyRow>();
            foreach (var result in processingResults)
            {
                if (result is not null && result.Rows.Count > 0)
                {
                    mergedRows.AddRange(result.Rows);
                }
            }

            ReplaceParsedRows(mergedRows);
            _context.SetStatus($"Đã xử lý xong {_queuedFiles.Count} tệp bằng {parallelism} luồng. Đã phân tích {_parsedRows.Count} dòng.");
        }
        finally
        {
            _isProcessingQueue = false;
            _context.HideProgress();
            RefreshPageState();
        }
    }

    private FileProcessingResult ProcessQueuedFile(QueuedPdfFile queuedFile)
    {
        try
        {
            var rows = _etsyPdfParser.ParseFile(queuedFile.FilePath);
            return FileProcessingResult.Success(rows);
        }
        catch (Exception ex)
        {
            return FileProcessingResult.Failure(FriendlyErrorFormatter.Format(ex));
        }
    }

    private void ResetQueuedFilesForProcessing()
    {
        foreach (var queuedFile in _queuedFiles)
        {
            queuedFile.StatusText = "Chờ xử lý";
            queuedFile.RowCount = 0;
            queuedFile.ErrorMessage = string.Empty;
        }
    }

    private void RefreshQueueView()
    {
        _queueListView.BeginUpdate();
        try
        {
            _queueListView.Items.Clear();
            foreach (var queuedFile in _queuedFiles)
            {
                _queueListView.Items.Add(CreateQueueItem(queuedFile));
            }
        }
        finally
        {
            _queueListView.EndUpdate();
        }

        RefreshPageState();
    }

    private void RefreshQueueItem(int index)
    {
        if (index < 0 || index >= _queuedFiles.Count || index >= _queueListView.Items.Count)
        {
            return;
        }

        ApplyQueueItemState(_queueListView.Items[index], _queuedFiles[index]);
    }

    private void HandleQueueProcessingUpdate(QueueProcessingUpdate update)
    {
        if (update.FileIndex < 0 || update.FileIndex >= _queuedFiles.Count)
        {
            return;
        }

        var queuedFile = _queuedFiles[update.FileIndex];
        if (update.IsStarted)
        {
            queuedFile.StatusText = "Đang xử lý";
            queuedFile.RowCount = 0;
            queuedFile.ErrorMessage = string.Empty;
            RefreshQueueItem(update.FileIndex);
            return;
        }

        if (update.Result is null)
        {
            return;
        }

        queuedFile.RowCount = update.Result.Rows.Count;
        queuedFile.StatusText = update.Result.IsSuccessful
            ? update.Result.Rows.Count > 0 ? "Hoàn tất" : "Không có dữ liệu"
            : "Thất bại";
        queuedFile.ErrorMessage = update.Result.IsSuccessful
            ? update.Result.Rows.Count > 0 ? string.Empty : "Không tìm thấy dòng Etsy hợp lệ trong tệp."
            : update.Result.ErrorMessage;

        RefreshQueueItem(update.FileIndex);
        _context.SetProgressValue(update.CompletedCount);
        _context.SetStatus($"Đã xử lý {update.CompletedCount}/{_queuedFiles.Count} tệp...");
    }

    private void ReportQueueProcessingUpdate(QueueProcessingUpdate update)
    {
        if (IsDisposed)
        {
            return;
        }

        if (!InvokeRequired)
        {
            HandleQueueProcessingUpdate(update);
            return;
        }

        try
        {
            Invoke(new Action<QueueProcessingUpdate>(HandleQueueProcessingUpdate), update);
        }
        catch (ObjectDisposedException)
        {
        }
        catch (InvalidOperationException)
        {
        }
    }

    private void RefreshPageState()
    {
        _addPdfButton.Enabled = !_isProcessingQueue;
        _removeSelectedButton.Enabled = !_isProcessingQueue && _queueListView.SelectedIndices.Count > 0;
        _clearQueueButton.Enabled = !_isProcessingQueue && HasQueuedFiles;
        _processQueueButton.Enabled = !_isProcessingQueue && HasQueuedFiles;
        _clearResultsButton.Enabled = !_isProcessingQueue && HasParsedRows;
        _copyResultsButton.Enabled = !_isProcessingQueue && HasParsedRows;
    }

    private void ReplaceParsedRows(IEnumerable<ParsedEtsyRow> rows)
    {
        _parsedRows.Clear();
        _parsedRows.AddRange(rows);
        _resultsBindingSource.ResetBindings(metadataChanged: false);
    }

    private int GetRecommendedParallelism()
    {
        var workerSlots = Environment.ProcessorCount <= 2
            ? 1
            : Environment.ProcessorCount - 1;

        return Math.Min(Math.Max(1, workerSlots), _queuedFiles.Count);
    }

    private static Button CreateActionButton(string text, EventHandler onClick)
    {
        var button = new Button
        {
            AutoSize = true,
            Text = text,
            Padding = new Padding(12, 6, 12, 6),
            Margin = new Padding(0, 0, 10, 0),
        };
        button.Click += onClick;
        return button;
    }

    private static DataGridViewTextBoxColumn CreateTextColumn(string propertyName, string headerText, int width)
    {
        return new DataGridViewTextBoxColumn
        {
            DataPropertyName = propertyName,
            HeaderText = headerText,
            Width = width,
            SortMode = DataGridViewColumnSortMode.NotSortable,
        };
    }

    private static ListViewItem CreateQueueItem(QueuedPdfFile queuedFile)
    {
        var item = new ListViewItem(queuedFile.FileName);
        item.SubItems.Add(string.Empty);
        item.SubItems.Add(string.Empty);
        item.SubItems.Add(string.Empty);
        item.SubItems.Add(string.Empty);
        ApplyQueueItemState(item, queuedFile);
        return item;
    }

    private static void ApplyQueueItemState(ListViewItem item, QueuedPdfFile queuedFile)
    {
        item.Text = queuedFile.FileName;
        item.SubItems[1].Text = DisplayTextFormatter.FormatFileSize(queuedFile.FileSizeBytes);
        item.SubItems[2].Text = queuedFile.StatusText;
        item.SubItems[3].Text = queuedFile.RowCount.ToString(CultureInfo.InvariantCulture);
        item.SubItems[4].Text = queuedFile.ErrorMessage ?? string.Empty;
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

    private sealed record FileProcessingResult(IReadOnlyList<ParsedEtsyRow> Rows, bool IsSuccessful, string ErrorMessage)
    {
        public static FileProcessingResult Success(IReadOnlyList<ParsedEtsyRow> rows)
        {
            return new FileProcessingResult(rows, IsSuccessful: true, ErrorMessage: string.Empty);
        }

        public static FileProcessingResult Failure(string errorMessage)
        {
            return new FileProcessingResult([], IsSuccessful: false, ErrorMessage: errorMessage);
        }
    }

    private sealed record QueueProcessingUpdate(int FileIndex, bool IsStarted, int CompletedCount, FileProcessingResult? Result)
    {
        public static QueueProcessingUpdate Started(int fileIndex)
        {
            return new QueueProcessingUpdate(fileIndex, IsStarted: true, CompletedCount: 0, Result: null);
        }

        public static QueueProcessingUpdate Completed(int fileIndex, int completedCount, FileProcessingResult result)
        {
            return new QueueProcessingUpdate(fileIndex, IsStarted: false, CompletedCount: completedCount, Result: result);
        }
    }
}
