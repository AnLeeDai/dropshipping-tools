using System.Globalization;
using DropshippingTools.Native.Formatting;
using DropshippingTools.Native.Models;

namespace DropshippingTools.Native;

internal sealed partial class MainForm
{
    private async void HandleFormShownAsync(object? sender, EventArgs e)
    {
        if (_settings.AutoNotifyOnStartup)
        {
            await CheckForUpdatesAsync(showDialogs: false, notifyWhenUpdateAvailable: true);
        }
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
        if (_isCheckingUpdates || _isDownloadingUpdate)
        {
            return;
        }

        _isCheckingUpdates = true;
        RefreshWindowState();
        ShowProgress(style: ProgressBarStyle.Marquee);
        SetStatus("Checking for updates...");

        try
        {
            var result = await _updateService.CheckForUpdatesAsync();
            _lastUpdateCheck = result;
            _settings.LastCheckedAt = DateTimeOffset.Now;
            SaveSettings();
            ApplyUpdateSummary(result);

            if (result.HasUpdate)
            {
                SetStatus($"Update {result.Metadata.Version} is available.");

                if (showDialogs || notifyWhenUpdateAvailable)
                {
                    MessageBox.Show(
                        this,
                        $"Da tim thay ban moi {result.Metadata.Version}. Nhan Download && Restart de tai file .exe moi va khoi dong lai ung dung.",
                        AppInfo.ProductName,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                }
            }
            else
            {
                SetStatus("You are already on the latest version.");

                if (showDialogs)
                {
                    MessageBox.Show(this, "Ban dang dung phien ban moi nhat.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
        }
        catch (Exception ex)
        {
            var friendlyError = FriendlyErrorFormatter.Format(ex);
            ApplyUpdateFailure(friendlyError);
            SetStatus("Update check failed.");

            if (showDialogs)
            {
                MessageBox.Show(this, friendlyError, AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }
        finally
        {
            _isCheckingUpdates = false;
            HideProgress();
            RefreshWindowState();
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
            MessageBox.Show(this, "Chua co ban cap nhat moi de tai xuong.", AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        var confirmation = MessageBox.Show(
            this,
            $"Ung dung se tai ban {_lastUpdateCheck!.Metadata.Version}, thay file .exe hien tai va khoi dong lai ngay sau khi tai xong. Tiep tuc?",
            AppInfo.ProductName,
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question);

        if (confirmation != DialogResult.Yes)
        {
            return;
        }

        _isDownloadingUpdate = true;
        RefreshWindowState();
        ShowProgress(maximum: 100, value: 0, style: ProgressBarStyle.Continuous);
        SetStatus("Downloading update...");

        try
        {
            var progress = new Progress<int>(percent =>
            {
                SetProgressValue(percent);
                _statusLabel.Text = $"Downloading update... {percent}%";
            });

            await _updateService.DownloadAndReplaceAsync(_lastUpdateCheck!, progress);

            MessageBox.Show(
                this,
                "Da tai xong ban cap nhat moi. Ung dung se dong de thay file .exe va mo lai phien ban moi.",
                AppInfo.ProductName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);

            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, FriendlyErrorFormatter.Format(ex), AppInfo.ProductName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            SetStatus("Download update failed.");
        }
        finally
        {
            _isDownloadingUpdate = false;
            HideProgress();
            RefreshWindowState();
        }
    }

    private void LoadSettingsIntoUi()
    {
        _currentVersionValueLabel.Text = AppInfo.CurrentVersionLabel;
        _latestVersionValueLabel.Text = "Not checked yet";
        _releaseDateValueLabel.Text = "--";
        _updateStatusValueLabel.Text = "Idle";
        _releaseNotesBox.Text = "No update metadata loaded yet.";
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
        _updateStatusValueLabel.Text = result.HasUpdate ? "Update available" : "Up to date";
        _releaseNotesBox.Text = string.IsNullOrWhiteSpace(result.Metadata.ReleaseNotes)
            ? "No release notes."
            : result.Metadata.ReleaseNotes.Replace("\n", Environment.NewLine, StringComparison.Ordinal);
        UpdateLastCheckedLabel();
    }

    private void ApplyUpdateFailure(string message)
    {
        _updateStatusValueLabel.Text = "Check failed";
        _releaseNotesBox.Text = message;
        UpdateLastCheckedLabel();
    }

    private void UpdateLastCheckedLabel()
    {
        _lastCheckedValueLabel.Text = _settings.LastCheckedAt?.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) ?? "Never";
    }
}
