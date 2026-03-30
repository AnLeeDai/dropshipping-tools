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
    private bool _isApplyingUpdate;
    private bool _startupHandled;

    private CheckBox _autoNotifyCheckBox = null!;
    private Label _currentVersionValueLabel = null!;
    private Label _updateStatusValueLabel = null!;
    private Label _updateHintValueLabel = null!;
    private Button _updateButton = null!;

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

    private bool IsBusy => _isCheckingUpdates || _isApplyingUpdate;
    private bool HasActionableUpdate => _lastUpdateCheck is { IsInstalled: true, HasUpdate: true };

    private void InitializeLayout()
    {
        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(24),
            ColumnCount = 1,
            RowCount = 3,
            AutoScroll = true,
        };
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

        var titleLabel = new Label
        {
            AutoSize = true,
            Text = "Cập nhật ứng dụng",
            Font = new Font(Font, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 10),
        };

        var descriptionLabel = new Label
        {
            AutoSize = true,
            MaximumSize = new Size(720, 0),
            Text = "Cài bằng setup một lần. Các bản sau chỉ cần bấm cập nhật để tải, cài và mở lại ứng dụng.",
            Margin = new Padding(0, 0, 0, 18),
        };

        var card = new TableLayoutPanel
        {
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            Padding = new Padding(18),
            Margin = new Padding(0),
            ColumnCount = 1,
            RowCount = 6,
            BorderStyle = BorderStyle.FixedSingle,
            MaximumSize = new Size(500, 0),
        };
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize));

        var cardTitleLabel = new Label
        {
            AutoSize = true,
            Text = "Tự động cập nhật",
            Font = new Font(Font, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 10),
        };

        _currentVersionValueLabel = CreateBodyLabel();
        _currentVersionValueLabel.Margin = new Padding(0, 0, 0, 8);

        _updateStatusValueLabel = CreateBodyLabel(FontStyle.Bold);
        _updateStatusValueLabel.Margin = new Padding(0, 0, 0, 8);

        _updateHintValueLabel = CreateBodyLabel();
        _updateHintValueLabel.MaximumSize = new Size(430, 0);
        _updateHintValueLabel.Margin = new Padding(0, 0, 0, 14);

        _updateButton = CreateActionButton("Kiểm tra và cập nhật", HandleUpdateAsync);
        _updateButton.Margin = new Padding(0, 0, 0, 12);

        _autoNotifyCheckBox = new CheckBox
        {
            AutoSize = true,
            Text = "Thông báo khi có bản mới lúc mở ứng dụng",
            Margin = new Padding(0),
        };
        _autoNotifyCheckBox.CheckedChanged += HandleAutoNotifyChanged;

        card.Controls.Add(cardTitleLabel, 0, 0);
        card.Controls.Add(_currentVersionValueLabel, 0, 1);
        card.Controls.Add(_updateStatusValueLabel, 0, 2);
        card.Controls.Add(_updateHintValueLabel, 0, 3);
        card.Controls.Add(_updateButton, 0, 4);
        card.Controls.Add(_autoNotifyCheckBox, 0, 5);

        layout.Controls.Add(titleLabel, 0, 0);
        layout.Controls.Add(descriptionLabel, 0, 1);
        layout.Controls.Add(card, 0, 2);

        Controls.Add(layout);
    }

    private void HandleAutoNotifyChanged(object? sender, EventArgs e)
    {
        _settings.AutoNotifyOnStartup = _autoNotifyCheckBox.Checked;
        SaveSettings();
    }

    private async void HandleUpdateAsync(object? sender, EventArgs e)
    {
        await StartUpdateFlowAsync();
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

            if (!result.IsInstalled)
            {
                _context.SetStatus("Bản hiện tại chưa hỗ trợ cập nhật tự động.");

                if (showDialogs)
                {
                    MessageBox.Show(
                        FindForm(),
                        "Bản hiện tại không chạy từ setup. Hãy cài bằng file setup một lần để các lần sau chỉ cần bấm cập nhật trong app.",
                        AppInfo.ProductName,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                }

                return;
            }

            if (result.IsUpdateReadyToRestart)
            {
                _context.SetStatus($"Bản {result.AvailableVersion} đã sẵn sàng để áp dụng.");

                if (showDialogs)
                {
                    MessageBox.Show(
                        FindForm(),
                        $"Bản {result.AvailableVersion} đã tải xong. Nhấn cập nhật để khởi động lại và áp dụng bản mới.",
                        AppInfo.ProductName,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                }

                return;
            }

            if (result.HasUpdate)
            {
                _context.SetStatus($"Đã có bản cập nhật {result.AvailableVersion}.");

                if (showDialogs || notifyWhenUpdateAvailable)
                {
                    MessageBox.Show(
                        FindForm(),
                        $"Đã tìm thấy bản mới {result.AvailableVersion}. Nhấn cập nhật để tải về và khởi động lại ứng dụng.",
                        AppInfo.ProductName,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                }

                return;
            }

            _context.SetStatus("Bạn đang dùng phiên bản mới nhất.");
            if (showDialogs)
            {
                MessageBox.Show(FindForm(), "Bạn đang dùng phiên bản mới nhất.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
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

    private async Task StartUpdateFlowAsync()
    {
        if (_isApplyingUpdate)
        {
            return;
        }

        if (_lastUpdateCheck is null || (!_lastUpdateCheck.HasUpdate && _lastUpdateCheck.IsInstalled))
        {
            await CheckForUpdatesAsync(showDialogs: false);
        }

        if (_lastUpdateCheck is null)
        {
            return;
        }

        if (!_lastUpdateCheck.IsInstalled)
        {
            MessageBox.Show(
                FindForm(),
                "Bản hiện tại không chạy từ setup. Hãy cài bằng file setup một lần để dùng cập nhật một chạm trong app.",
                AppInfo.ProductName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
            return;
        }

        if (!HasActionableUpdate)
        {
            MessageBox.Show(FindForm(), "Bạn đang dùng phiên bản mới nhất.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var confirmationMessage = _lastUpdateCheck.IsUpdateReadyToRestart
            ? $"Bản {_lastUpdateCheck.AvailableVersion} đã tải xong. Khởi động lại để áp dụng ngay?"
            : $"Ứng dụng sẽ tải bản {_lastUpdateCheck.AvailableVersion}, tự thay bản cũ và khởi động lại sau khi xong. Tiếp tục?";

        var confirmation = MessageBox.Show(
            FindForm(),
            confirmationMessage,
            AppInfo.ProductName,
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question);

        if (confirmation != DialogResult.Yes)
        {
            return;
        }

        _isApplyingUpdate = true;
        RefreshPageState();

        if (_lastUpdateCheck.IsUpdateReadyToRestart)
        {
            _context.ShowProgress(style: ProgressBarStyle.Marquee);
            _context.SetStatus("Đang áp dụng bản cập nhật...");
        }
        else
        {
            _context.ShowProgress(maximum: 100, value: 0, style: ProgressBarStyle.Continuous);
            _context.SetStatus("Đang tải bản cập nhật...");
        }

        try
        {
            var progress = new Progress<int>(percent =>
            {
                _context.SetProgressValue(percent);
                _context.SetStatus($"Đang tải bản cập nhật... {percent}%");
            });

            await _updateService.DownloadAndApplyAsync(_lastUpdateCheck, progress);
        }
        catch (Exception ex)
        {
            var friendlyError = FriendlyErrorFormatter.Format(ex);
            MessageBox.Show(FindForm(), friendlyError, AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            ApplyUpdateFailure(friendlyError);
            _context.SetStatus("Cập nhật ứng dụng thất bại.");
        }
        finally
        {
            _isApplyingUpdate = false;
            _context.HideProgress();
            RefreshPageState();
        }
    }

    private void LoadSettingsIntoUi()
    {
        _currentVersionValueLabel.Text = $"Phiên bản hiện tại: {AppInfo.CurrentVersionLabel}";
        _updateStatusValueLabel.Text = "Sẵn sàng kiểm tra cập nhật.";
        _updateHintValueLabel.Text = "Nhấn cập nhật để kiểm tra bản mới. Nếu có, app sẽ tự tải và khởi động lại để áp dụng.";
        _autoNotifyCheckBox.Checked = _settings.AutoNotifyOnStartup;
    }

    private void SaveSettings()
    {
        _settingsService.Save(_settings);
    }

    private void ApplyUpdateSummary(UpdateCheckResult result)
    {
        if (!result.IsInstalled)
        {
            _updateStatusValueLabel.Text = "Chưa chạy từ bản cài đặt.";
            _updateHintValueLabel.Text = "Hãy cài bằng setup một lần. Sau đó mỗi lần có bản mới chỉ cần bấm cập nhật trong app.";
            return;
        }

        if (result.IsUpdateReadyToRestart)
        {
            _updateStatusValueLabel.Text = $"Bản {result.AvailableVersion} đã sẵn sàng.";
            _updateHintValueLabel.Text = "Nhấn cập nhật để đóng app, áp dụng bản mới và mở lại ngay.";
            return;
        }

        if (result.HasUpdate)
        {
            _updateStatusValueLabel.Text = $"Có bản cập nhật {result.AvailableVersion}.";
            _updateHintValueLabel.Text = "Nhấn cập nhật để tải gói mới và khởi động lại ứng dụng.";
            return;
        }

        _updateStatusValueLabel.Text = "Bạn đang dùng phiên bản mới nhất.";
        _updateHintValueLabel.Text = "Khi có bản mới, app có thể nhắc bạn ngay lúc mở nếu tùy chọn bên dưới được bật.";
    }

    private void ApplyUpdateFailure(string message)
    {
        _updateStatusValueLabel.Text = "Không thể cập nhật ứng dụng.";
        _updateHintValueLabel.Text = message;
    }

    private void RefreshPageState()
    {
        _autoNotifyCheckBox.Enabled = !IsBusy;
        _updateButton.Enabled = !IsBusy;
        _updateButton.Text = GetUpdateButtonText();
    }

    private string GetUpdateButtonText()
    {
        if (_isApplyingUpdate)
        {
            return _lastUpdateCheck?.IsUpdateReadyToRestart == true
                ? "Đang áp dụng..."
                : "Đang tải cập nhật...";
        }

        if (_isCheckingUpdates)
        {
            return "Đang kiểm tra...";
        }

        if (_lastUpdateCheck is { IsInstalled: false })
        {
            return "Cài bằng setup";
        }

        if (_lastUpdateCheck?.IsUpdateReadyToRestart == true)
        {
            return "Khởi động lại để cập nhật";
        }

        if (_lastUpdateCheck?.HasUpdate == true && !string.IsNullOrWhiteSpace(_lastUpdateCheck.AvailableVersion))
        {
            return $"Cập nhật lên {_lastUpdateCheck.AvailableVersion}";
        }

        return "Kiểm tra và cập nhật";
    }

    private static Button CreateActionButton(string text, EventHandler onClick)
    {
        var button = new Button
        {
            AutoSize = true,
            Text = text,
            Padding = new Padding(12, 6, 12, 6),
            Margin = new Padding(0),
        };
        button.Click += onClick;
        return button;
    }

    private static Label CreateBodyLabel(FontStyle fontStyle = FontStyle.Regular)
    {
        return new Label
        {
            AutoSize = true,
            Font = new Font(Control.DefaultFont, fontStyle),
            Margin = new Padding(0),
        };
    }
}
