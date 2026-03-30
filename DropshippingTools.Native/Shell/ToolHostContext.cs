namespace DropshippingTools.Native.Shell;

internal sealed class ToolHostContext
{
    private readonly Func<IReadOnlyList<AppToolDescriptor>> _getTools;
    private readonly Action<string> _navigateTo;
    private readonly Action<string> _setStatus;
    private readonly Action<int, int, ProgressBarStyle> _showProgress;
    private readonly Action<int> _setProgressValue;
    private readonly Action _hideProgress;

    public ToolHostContext(
        Func<IReadOnlyList<AppToolDescriptor>> getTools,
        Action<string> navigateTo,
        Action<string> setStatus,
        Action<int, int, ProgressBarStyle> showProgress,
        Action<int> setProgressValue,
        Action hideProgress)
    {
        _getTools = getTools ?? throw new ArgumentNullException(nameof(getTools));
        _navigateTo = navigateTo ?? throw new ArgumentNullException(nameof(navigateTo));
        _setStatus = setStatus ?? throw new ArgumentNullException(nameof(setStatus));
        _showProgress = showProgress ?? throw new ArgumentNullException(nameof(showProgress));
        _setProgressValue = setProgressValue ?? throw new ArgumentNullException(nameof(setProgressValue));
        _hideProgress = hideProgress ?? throw new ArgumentNullException(nameof(hideProgress));
    }

    public IReadOnlyList<AppToolDescriptor> Tools => _getTools();

    public void NavigateTo(string toolId)
    {
        _navigateTo(toolId);
    }

    public void SetStatus(string message)
    {
        _setStatus(message);
    }

    public void ShowProgress(int maximum = 100, int value = 0, ProgressBarStyle style = ProgressBarStyle.Continuous)
    {
        _showProgress(maximum, value, style);
    }

    public void SetProgressValue(int value)
    {
        _setProgressValue(value);
    }

    public void HideProgress()
    {
        _hideProgress();
    }
}
