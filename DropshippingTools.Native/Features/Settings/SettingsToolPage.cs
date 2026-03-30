using System.Globalization;
using DropshippingTools.Native.Formatting;
using DropshippingTools.Native.Models;
using DropshippingTools.Native.Services;
using DropshippingTools.Native.Shell;

namespace DropshippingTools.Native.Features.Settings;

internal sealed class SettingsToolPage : UserControl, IHostedToolView
{
    private readonly ToolHostContext _context;
    private readonly SettingsService _settingsService;
    private readonly UpdateService _updateService;

    private AppSettings _settings;
    private UpdateCheckResult? _lastUpdateCheck;
    private bool _isCheckingUpdates;
    private bool _isDownloadingUpdate;
    private bool _startupHandled;

    private CheckBox _autoNotifyCheckBox = null!;
    private Label _currentVersionValueLabel = null!;
    private Label _latestVersionValueLabel = null!;
    private Label _releaseDateValueLabel = null!;
    private Label _lastCheckedValueLabel = null!;
    private Label _updateStatusValueLabel = null!;
    private Button _checkUpdatesButton = null!;
    private Button _downloadUpdateButton = null!;
    private RichTextBox _releaseNotesBox = null!;

    public SettingsToolPage(ToolHostContext context, SettingsService settingsService, UpdateService updateService)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
        _updateService = updateService ?? throw new ArgumentNullException(nameof(updateService));
        _settings = _settingsService.Load();

        Dock = DockStyle.Fill;
        InitializeLayout();
        LoadSettingsIntoUi();
        RefreshPageState();
    }

    public async Task OnHostShownAsync()
    {
        if (_startupHandled)
        {
            return;
        }

        _startupHandled = true;

        if (_settings.AutoNotifyOnStartup)
        {
            await CheckForUpdatesAsync(showDialogs: false, notifyWhenUpdateAvailable: true);
        }
    }

    private bool IsBusy => _isCheckingUpdates || _isDownloadingUpdate;
    private bool HasPendingUpdate => _lastUpdateCheck is { HasUpdate: true };

    private void InitializeLayout()
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
            Text = "Kiểm tra cập nhật và tải phiên bản mới khi cần.",
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

        AddInfoRow(detailsTable, 0, "Phiên bản hiện tại", _currentVersionValueLabel);
        AddInfoRow(detailsTable, 1, "Phiên bản mới nhất", _latestVersionValueLabel);
        AddInfoRow(detailsTable, 2, "Ngày phát hành", _releaseDateValueLabel);
        AddInfoRow(detailsTable, 3, "Lần kiểm tra gần nhất", _lastCheckedValueLabel);
        AddInfoRow(detailsTable, 4, "Trạng thái cập nhật", _updateStatusValueLabel);
        AddInfoRow(detailsTable, 5, "Nguồn cập nhật", updateSourceValueLabel);

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
            Text = "Hiển thị thông báo cập nhật khi khởi động",
            Margin = new Padding(0, 6, 18, 0),
        };
        _autoNotifyCheckBox.CheckedChanged += HandleAutoNotifyChanged;

        _checkUpdatesButton = CreateActionButton("Kiểm tra cập nhật", HandleCheckForUpdatesAsync);
        _downloadUpdateButton = CreateActionButton("Tải xuống và khởi động lại", HandleDownloadUpdateAsync);

        actionsPanel.Controls.Add(_autoNotifyCheckBox);
        actionsPanel.Controls.Add(_checkUpdatesButton);
        actionsPanel.Controls.Add(_downloadUpdateButton);

        var notesLabel = new Label
        {
            AutoSize = true,
            Text = "Ghi chú phát hành",
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

        Controls.Add(layout);
    }

    private void HandleAutoNotifyChanged(object? sender, EventArgs e)
    {
        _settings.AutoNotifyOnStartup = _autoNotifyCheckBox.Checked;
        SaveSettings();
    }

    private async void HandleCheckForUpdatesAsync(object? sender, EventArgs e)
    {
        await CheckForUpdatesAsync(showDialogs: true);
    }

    private async void HandleDownloadUpdateAsync(object? sender, EventArgs e)
    {
        await DownloadUpdateAsync();
    }

    private async Task CheckForUpdatesAsync(bool showDialogs, bool notifyWhenUpdateAvailable = false)
    {
        if (IsBusy)
        {
            return;
        }

        _isCheckingUpdates = true;
        RefreshPageState();
        _context.ShowProgress(style: ProgressBarStyle.Marquee);
        _context.SetStatus("Đang kiểm tra cập nhật...");

        try
        {
            var result = await _updateService.CheckForUpdatesAsync();
            _lastUpdateCheck = result;
            _settings.LastCheckedAt = DateTimeOffset.Now;
            SaveSettings();
            ApplyUpdateSummary(result);

            if (result.HasUpdate)
            {
                _context.SetStatus($"Đã có bản cập nhật {result.Metadata.Version}.");

                if (showDialogs || notifyWhenUpdateAvailable)
                {
                    MessageBox.Show(
                        FindForm(),
                        $"Đã tìm thấy bản mới {result.Metadata.Version}. Nhấn Tải xuống và khởi động lại để tải tệp .exe mới và khởi động lại ứng dụng.",
                        AppInfo.ProductName,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                }
            }
            else
            {
                _context.SetStatus("Bạn đang dùng phiên bản mới nhất.");

                if (showDialogs)
                {
                    MessageBox.Show(FindForm(), "Bạn đang dùng phiên bản mới nhất.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
        }
        catch (Exception ex)
        {
            var friendlyError = FriendlyErrorFormatter.Format(ex);
            ApplyUpdateFailure(friendlyError);
            _context.SetStatus("Kiểm tra cập nhật thất bại.");

            if (showDialogs)
            {
                MessageBox.Show(FindForm(), friendlyError, AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }
        finally
        {
            _isCheckingUpdates = false;
            _context.HideProgress();
            RefreshPageState();
        }
    }

    private async Task DownloadUpdateAsync()
    {
        if (_isDownloadingUpdate)
        {
            return;
        }

        if (_lastUpdateCheck is null)
        {
            await CheckForUpdatesAsync(showDialogs: false);
        }

        if (!HasPendingUpdate)
        {
            MessageBox.Show(FindForm(), "Chưa có bản cập nhật mới để tải xuống.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var confirmation = MessageBox.Show(
            FindForm(),
            $"Ứng dụng sẽ tải bản {_lastUpdateCheck!.Metadata.Version}, thay tệp .exe hiện tại và khởi động lại ngay sau khi tải xong. Tiếp tục?",
            AppInfo.ProductName,
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question);

        if (confirmation != DialogResult.Yes)
        {
            return;
        }

        _isDownloadingUpdate = true;
        RefreshPageState();
        _context.ShowProgress(maximum: 100, value: 0, style: ProgressBarStyle.Continuous);
        _context.SetStatus("Đang tải bản cập nhật...");

        try
        {
            var progress = new Progress<int>(percent =>
            {
                _context.SetProgressValue(percent);
                _context.SetStatus($"Đang tải bản cập nhật... {percent}%");
            });

            await _updateService.DownloadAndReplaceAsync(_lastUpdateCheck!, progress);

            MessageBox.Show(
                FindForm(),
                "Đã tải xong bản cập nhật mới. Ứng dụng sẽ đóng để thay tệp .exe và mở lại phiên bản mới.",
                AppInfo.ProductName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);

            FindForm()?.Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show(FindForm(), FriendlyErrorFormatter.Format(ex), AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            _context.SetStatus("Tải bản cập nhật thất bại.");
        }
        finally
        {
            _isDownloadingUpdate = false;
            _context.HideProgress();
            RefreshPageState();
        }
    }

    private void LoadSettingsIntoUi()
    {
        _currentVersionValueLabel.Text = AppInfo.CurrentVersionLabel;
        _latestVersionValueLabel.Text = "Chưa kiểm tra";
        _releaseDateValueLabel.Text = "--";
        _updateStatusValueLabel.Text = "Sẵn sàng";
        _releaseNotesBox.Text = "Chưa tải thông tin cập nhật.";
        _autoNotifyCheckBox.Checked = _settings.AutoNotifyOnStartup;
        UpdateLastCheckedLabel();
    }

    private void SaveSettings()
    {
        _settingsService.Save(_settings);
        UpdateLastCheckedLabel();
    }

    private void ApplyUpdateSummary(UpdateCheckResult result)
    {
        _latestVersionValueLabel.Text = result.Metadata.Version;
        _releaseDateValueLabel.Text = DisplayTextFormatter.FormatReleaseDate(result.Metadata.ReleaseDate);
        _updateStatusValueLabel.Text = result.HasUpdate ? "Có bản cập nhật" : "Đã là mới nhất";
        _releaseNotesBox.Text = string.IsNullOrWhiteSpace(result.Metadata.ReleaseNotes)
            ? "Không có ghi chú phát hành."
            : result.Metadata.ReleaseNotes.Replace("\n", Environment.NewLine, StringComparison.Ordinal);
        UpdateLastCheckedLabel();
    }

    private void ApplyUpdateFailure(string message)
    {
        _updateStatusValueLabel.Text = "Kiểm tra thất bại";
        _releaseNotesBox.Text = message;
        UpdateLastCheckedLabel();
    }

    private void UpdateLastCheckedLabel()
    {
        _lastCheckedValueLabel.Text = _settings.LastCheckedAt?.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) ?? "Chưa từng";
    }

    private void RefreshPageState()
    {
        _autoNotifyCheckBox.Enabled = !IsBusy;
        _checkUpdatesButton.Enabled = !_isDownloadingUpdate;
        _downloadUpdateButton.Enabled = !_isCheckingUpdates && HasPendingUpdate;
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
