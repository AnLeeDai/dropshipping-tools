namespace DropshippingTools.Native;

internal sealed partial class MainForm
{
    private void InitializeTabs()
    {
        _tabs.TabPages.Add(_homeTab);
        _tabs.TabPages.Add(_etsyTab);
        _tabs.TabPages.Add(_settingsTab);
        Controls.Add(_tabs);
    }

    private void InitializeHomeTab()
    {
        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(24),
            ColumnCount = 1,
            RowCount = 4,
        };

        var titleLabel = new Label
        {
            AutoSize = true,
            Text = AppInfo.ProductName,
            Font = new Font(Font, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 12),
        };

        var descriptionLabel = new Label
        {
            AutoSize = true,
            MaximumSize = new Size(900, 0),
            Text = "Ban native Windows nay thay the hoan toan Electron. Ung dung giu lai chuc nang doc PDF don hang Etsy, xem ket qua tren bang du lieu va cap nhat truc tiep tu link tai ve.",
            Margin = new Padding(0, 0, 0, 18),
        };

        var highlightsLabel = new Label
        {
            AutoSize = true,
            MaximumSize = new Size(900, 0),
            Text = "Dung nut Etsy PDF de them file .pdf hoac keo tha truc tiep vao cua so. Tab Settings cho phep bat thong bao cap nhat, kiem tra phien ban moi va tai ban .exe moi de khoi dong lai ngay.",
            Margin = new Padding(0, 0, 0, 24),
        };

        var actionPanel = new FlowLayoutPanel
        {
            AutoSize = true,
            WrapContents = true,
            FlowDirection = FlowDirection.LeftToRight,
            Margin = new Padding(0),
        };

        var openEtsyButton = new Button
        {
            AutoSize = true,
            Text = "Open Etsy PDF",
            Padding = new Padding(14, 6, 14, 6),
        };
        openEtsyButton.Click += (_, _) => _tabs.SelectedTab = _etsyTab;

        var openSettingsButton = new Button
        {
            AutoSize = true,
            Text = "Open Settings",
            Padding = new Padding(14, 6, 14, 6),
            Margin = new Padding(12, 0, 0, 0),
        };
        openSettingsButton.Click += (_, _) => _tabs.SelectedTab = _settingsTab;

        actionPanel.Controls.Add(openEtsyButton);
        actionPanel.Controls.Add(openSettingsButton);

        layout.Controls.Add(titleLabel, 0, 0);
        layout.Controls.Add(descriptionLabel, 0, 1);
        layout.Controls.Add(highlightsLabel, 0, 2);
        layout.Controls.Add(actionPanel, 0, 3);

        _homeTab.Controls.Add(layout);
    }

    private void InitializeEtsyTab()
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
            Text = "Them nhieu file PDF hoa don Etsy, xu ly hang loat va sao chep ket qua dang bang. Ban co the keo tha file truc tiep vao cua so hoac vao danh sach queue ben duoi.",
            Margin = new Padding(0, 0, 0, 10),
        };

        var actionsPanel = new FlowLayoutPanel
        {
            AutoSize = true,
            WrapContents = true,
            FlowDirection = FlowDirection.LeftToRight,
            Margin = new Padding(0, 0, 0, 12),
        };

        _addPdfButton = CreateActionButton("Add PDF", HandleAddPdfFiles);
        _removeSelectedButton = CreateActionButton("Remove Selected", HandleRemoveSelectedFiles);
        _clearQueueButton = CreateActionButton("Clear Queue", HandleClearQueue);
        _processQueueButton = CreateActionButton("Process Queue", HandleProcessQueueAsync);
        _clearResultsButton = CreateActionButton("Clear Results", HandleClearResults);
        _copyResultsButton = CreateActionButton("Copy Results", HandleCopyResults);

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

        var queueHintLabel = new Label
        {
            AutoSize = true,
            Text = "Queue files",
            Font = new Font(Font, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 8),
        };

        _queueListView = new ListView
        {
            Dock = DockStyle.Fill,
            FullRowSelect = true,
            MultiSelect = true,
            View = View.Details,
            HideSelection = false,
            AllowDrop = true,
        };
        _queueListView.Columns.Add("File", 360);
        _queueListView.Columns.Add("Size", 100);
        _queueListView.Columns.Add("Status", 120);
        _queueListView.Columns.Add("Rows", 70);
        _queueListView.Columns.Add("Message", 460);
        _queueListView.DragEnter += HandlePdfDragEnter;
        _queueListView.DragDrop += HandlePdfDragDrop;
        _queueListView.SelectedIndexChanged += (_, _) => RefreshWindowState();

        queueLayout.Controls.Add(queueHintLabel, 0, 0);
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
            Text = "Parsed rows",
            Font = new Font(Font, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 8),
        };

        _resultsGrid = new DataGridView
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
            DataSource = _parsedRows,
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

        _etsyTab.Controls.Add(layout);
    }

    private void InitializeSettingsTab()
    {
        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(16),
            ColumnCount = 1,
            RowCount = 5,
        };
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

        var descriptionLabel = new Label
        {
            AutoSize = true,
            MaximumSize = new Size(980, 0),
            Text = "Feed cap nhat duoc doc tu release.json tren GitHub Pages. Khi co ban moi, ung dung tai file .exe moi va khoi dong lai, khong can dung installer rieng.",
            Margin = new Padding(0, 0, 0, 12),
        };

        var detailsTable = new TableLayoutPanel
        {
            AutoSize = true,
            ColumnCount = 2,
            RowCount = 6,
            Margin = new Padding(0, 0, 0, 12),
        };
        detailsTable.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 150));
        detailsTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        _currentVersionValueLabel = CreateValueLabel();
        _latestVersionValueLabel = CreateValueLabel();
        _releaseDateValueLabel = CreateValueLabel();
        _lastCheckedValueLabel = CreateValueLabel();
        _updateStatusValueLabel = CreateValueLabel();
        var updateSourceValueLabel = CreateValueLabel();
        updateSourceValueLabel.Text = AppInfo.UpdateMetadataUrl;

        AddInfoRow(detailsTable, 0, "Current version", _currentVersionValueLabel);
        AddInfoRow(detailsTable, 1, "Latest version", _latestVersionValueLabel);
        AddInfoRow(detailsTable, 2, "Release date", _releaseDateValueLabel);
        AddInfoRow(detailsTable, 3, "Last checked", _lastCheckedValueLabel);
        AddInfoRow(detailsTable, 4, "Update status", _updateStatusValueLabel);
        AddInfoRow(detailsTable, 5, "Update source", updateSourceValueLabel);

        var actionsPanel = new FlowLayoutPanel
        {
            AutoSize = true,
            WrapContents = true,
            FlowDirection = FlowDirection.LeftToRight,
            Margin = new Padding(0, 0, 0, 12),
        };

        _autoNotifyCheckBox = new CheckBox
        {
            AutoSize = true,
            Text = "Show update notice on startup",
            Margin = new Padding(0, 6, 18, 0),
        };
        _autoNotifyCheckBox.CheckedChanged += HandleAutoNotifyChanged;

        _checkUpdatesButton = CreateActionButton("Check Updates", HandleCheckForUpdatesAsync);
        _downloadUpdateButton = CreateActionButton("Download && Restart", HandleDownloadUpdateAsync);
        _downloadUpdateButton.Enabled = false;

        actionsPanel.Controls.Add(_autoNotifyCheckBox);
        actionsPanel.Controls.Add(_checkUpdatesButton);
        actionsPanel.Controls.Add(_downloadUpdateButton);

        var notesLabel = new Label
        {
            AutoSize = true,
            Text = "Release notes",
            Font = new Font(Font, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 8),
        };

        _releaseNotesBox = new RichTextBox
        {
            Dock = DockStyle.Fill,
            ReadOnly = true,
            DetectUrls = true,
            BackColor = SystemColors.Window,
            BorderStyle = BorderStyle.FixedSingle,
        };

        layout.Controls.Add(descriptionLabel, 0, 0);
        layout.Controls.Add(detailsTable, 0, 1);
        layout.Controls.Add(actionsPanel, 0, 2);
        layout.Controls.Add(notesLabel, 0, 3);
        layout.Controls.Add(_releaseNotesBox, 0, 4);

        _settingsTab.Controls.Add(layout);
    }

    private void InitializeStatusStrip()
    {
        _statusStrip.Items.Add(_statusLabel);
        _statusStrip.Items.Add(new ToolStripStatusLabel { Spring = true });
        _statusStrip.Items.Add(_statusProgressBar);
        Controls.Add(_statusStrip);
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

    private static Label CreateValueLabel()
    {
        return new Label
        {
            AutoSize = true,
            MaximumSize = new Size(880, 0),
            Margin = new Padding(0, 6, 0, 6),
        };
    }

    private static void AddInfoRow(TableLayoutPanel table, int rowIndex, string caption, Control valueControl)
    {
        var captionLabel = new Label
        {
            AutoSize = true,
            Text = caption,
            Font = new Font(Control.DefaultFont, FontStyle.Bold),
            Margin = new Padding(0, 6, 12, 6),
        };

        table.Controls.Add(captionLabel, 0, rowIndex);
        table.Controls.Add(valueControl, 1, rowIndex);
    }
}
