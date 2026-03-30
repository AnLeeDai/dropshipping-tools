namespace DropshippingTools.Native;

internal sealed partial class MainForm
{
    private void RefreshWindowState()
    {
        _addPdfButton.Enabled = !_isProcessingQueue;
        _removeSelectedButton.Enabled = !_isProcessingQueue && _queueListView.SelectedIndices.Count > 0;
        _clearQueueButton.Enabled = !_isProcessingQueue && HasQueuedFiles;
        _processQueueButton.Enabled = !IsBusy && HasQueuedFiles;
        _clearResultsButton.Enabled = !_isProcessingQueue && HasParsedRows;
        _copyResultsButton.Enabled = !_isProcessingQueue && HasParsedRows;
        _autoNotifyCheckBox.Enabled = !IsBusy;
        _checkUpdatesButton.Enabled = !_isProcessingQueue && !_isDownloadingUpdate;
        _downloadUpdateButton.Enabled = !_isProcessingQueue &&
                                        !_isCheckingUpdates &&
                                        HasPendingUpdate;
    }

    private void SetStatus(string message)
    {
        _statusLabel.Text = message;
    }

    private void ShowProgress(int maximum = 100, int value = 0, ProgressBarStyle style = ProgressBarStyle.Continuous)
    {
        _statusProgressBar.Style = style;
        _statusProgressBar.Visible = true;

        if (style == ProgressBarStyle.Marquee)
        {
            _statusProgressBar.MarqueeAnimationSpeed = 30;
            return;
        }

        _statusProgressBar.MarqueeAnimationSpeed = 0;
        _statusProgressBar.Maximum = Math.Max(1, maximum);
        _statusProgressBar.Value = Math.Clamp(value, 0, _statusProgressBar.Maximum);
    }

    private void SetProgressValue(int value)
    {
        if (_statusProgressBar.Style == ProgressBarStyle.Marquee)
        {
            return;
        }

        _statusProgressBar.Value = Math.Clamp(value, 0, _statusProgressBar.Maximum);
    }

    private void HideProgress()
    {
        _statusProgressBar.Visible = false;
        _statusProgressBar.Style = ProgressBarStyle.Continuous;
        _statusProgressBar.MarqueeAnimationSpeed = 0;
        _statusProgressBar.Value = 0;
    }
}
