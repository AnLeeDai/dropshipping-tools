using System.ComponentModel;
using DropshippingTools.Native.Models;
using DropshippingTools.Native.Services;

namespace DropshippingTools.Native;

internal sealed partial class MainForm : Form
{
    private readonly SettingsService _settingsService;
    private readonly UpdateService _updateService;
    private readonly EtsyPdfParser _etsyPdfParser;
    private readonly BindingList<ParsedEtsyRow> _parsedRows = [];
    private readonly List<QueuedPdfFile> _queuedFiles = [];

    private readonly TabControl _tabs = new() { Dock = DockStyle.Fill };
    private readonly TabPage _homeTab = new("Home");
    private readonly TabPage _etsyTab = new("Etsy PDF");
    private readonly TabPage _settingsTab = new("Settings");
    private readonly StatusStrip _statusStrip = new();
    private readonly ToolStripStatusLabel _statusLabel = new() { Text = "Ready" };
    private readonly ToolStripProgressBar _statusProgressBar = new()
    {
        Visible = false,
        Size = new Size(200, 16),
        Style = ProgressBarStyle.Continuous,
    };

    private AppSettings _settings;
    private UpdateCheckResult? _lastUpdateCheck;
    private bool _isProcessingQueue;
    private bool _isCheckingUpdates;
    private bool _isDownloadingUpdate;

    private ListView _queueListView = null!;
    private DataGridView _resultsGrid = null!;
    private Button _addPdfButton = null!;
    private Button _removeSelectedButton = null!;
    private Button _clearQueueButton = null!;
    private Button _processQueueButton = null!;
    private Button _clearResultsButton = null!;
    private Button _copyResultsButton = null!;
    private CheckBox _autoNotifyCheckBox = null!;
    private Label _currentVersionValueLabel = null!;
    private Label _latestVersionValueLabel = null!;
    private Label _releaseDateValueLabel = null!;
    private Label _lastCheckedValueLabel = null!;
    private Label _updateStatusValueLabel = null!;
    private Button _checkUpdatesButton = null!;
    private Button _downloadUpdateButton = null!;
    private RichTextBox _releaseNotesBox = null!;

    private bool IsBusy => _isProcessingQueue || _isCheckingUpdates || _isDownloadingUpdate;
    private bool HasQueuedFiles => _queuedFiles.Count > 0;
    private bool HasParsedRows => _parsedRows.Count > 0;
    private bool HasPendingUpdate => _lastUpdateCheck is { HasUpdate: true };

    public MainForm(SettingsService settingsService, UpdateService updateService, EtsyPdfParser etsyPdfParser)
    {
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
        _updateService = updateService ?? throw new ArgumentNullException(nameof(updateService));
        _etsyPdfParser = etsyPdfParser ?? throw new ArgumentNullException(nameof(etsyPdfParser));
        _settings = _settingsService.Load();

        Text = $"{AppInfo.ProductName} {AppInfo.CurrentVersionLabel}";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(1100, 720);
        Size = new Size(1280, 820);

        SuspendLayout();
        InitializeTabs();
        InitializeHomeTab();
        InitializeEtsyTab();
        InitializeSettingsTab();
        InitializeStatusStrip();
        LoadSettingsIntoUi();
        RefreshQueueView();
        RefreshWindowState();
        ResumeLayout(performLayout: true);

        AllowDrop = true;
        DragEnter += HandlePdfDragEnter;
        DragDrop += HandlePdfDragDrop;
        Shown += HandleFormShownAsync;
    }
}
