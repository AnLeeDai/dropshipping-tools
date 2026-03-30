using DropshippingTools.Native.Shell;

namespace DropshippingTools.Native;

internal sealed class MainForm : Form
{
    private readonly IReadOnlyList<IAppToolModule> _modules;
    private readonly IReadOnlyList<AppToolDescriptor> _toolDescriptors;
    private readonly Dictionary<string, TabPage> _tabsById;
    private readonly List<Control> _hostedViews = [];

    private readonly TabControl _tabs = new() { Dock = DockStyle.Fill };
    private readonly StatusStrip _statusStrip = new();
    private readonly ToolStripStatusLabel _statusLabel = new() { Text = "Sẵn sàng" };
    private readonly ToolStripProgressBar _statusProgressBar = new()
    {
        Visible = false,
        Size = new Size(200, 16),
        Style = ProgressBarStyle.Continuous,
    };

    private readonly ToolHostContext _toolHostContext;

    public MainForm(IReadOnlyList<IAppToolModule> modules)
    {
        ArgumentNullException.ThrowIfNull(modules);
        if (modules.Count == 0)
        {
            throw new ArgumentException("Phải đăng ký ít nhất một mô-đun công cụ.", nameof(modules));
        }

        _modules = modules;
        _toolDescriptors = modules.Select(static module => module.Descriptor).ToList().AsReadOnly();
        _tabsById = new Dictionary<string, TabPage>(StringComparer.OrdinalIgnoreCase);
        EnsureUniqueToolIds(_toolDescriptors);

        _toolHostContext = new ToolHostContext(
            getTools: () => _toolDescriptors,
            navigateTo: NavigateTo,
            setStatus: SetStatus,
            showProgress: ShowProgress,
            setProgressValue: SetProgressValue,
            hideProgress: HideProgress);

        Text = $"{AppInfo.ProductName} {AppInfo.CurrentVersionLabel}";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(1100, 720);
        Size = new Size(1280, 820);

        SuspendLayout();
        InitializeTabs();
        InitializeStatusStrip();
        ResumeLayout(performLayout: true);

        Shown += HandleFormShownAsync;
    }

    private void InitializeTabs()
    {
        foreach (var module in _modules)
        {
            var view = module.CreateView(_toolHostContext) ?? throw new InvalidOperationException($"Công cụ '{module.Descriptor.Id}' đã trả về giao diện rỗng.");
            view.Dock = DockStyle.Fill;
            _hostedViews.Add(view);

            var tabPage = new TabPage(module.Descriptor.DisplayName);
            tabPage.Controls.Add(view);
            _tabs.TabPages.Add(tabPage);
            _tabsById.Add(module.Descriptor.Id, tabPage);
        }

        Controls.Add(_tabs);
    }

    private void InitializeStatusStrip()
    {
        _statusStrip.Items.Add(_statusLabel);
        _statusStrip.Items.Add(new ToolStripStatusLabel { Spring = true });
        _statusStrip.Items.Add(_statusProgressBar);
        Controls.Add(_statusStrip);
    }

    private async void HandleFormShownAsync(object? sender, EventArgs e)
    {
        foreach (var view in _hostedViews.OfType<IHostedToolView>())
        {
            await view.OnHostShownAsync();
        }
    }

    private void NavigateTo(string toolId)
    {
        if (_tabsById.TryGetValue(toolId, out var tabPage))
        {
            _tabs.SelectedTab = tabPage;
        }
    }

    private void SetStatus(string message)
    {
        _statusLabel.Text = string.IsNullOrWhiteSpace(message) ? "Sẵn sàng" : message;
    }

    private void ShowProgress(int maximum, int value, ProgressBarStyle style)
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

    private static void EnsureUniqueToolIds(IEnumerable<AppToolDescriptor> descriptors)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var descriptor in descriptors)
        {
            if (!seen.Add(descriptor.Id))
            {
                throw new InvalidOperationException($"Phát hiện mã công cụ bị trùng: '{descriptor.Id}'.");
            }
        }
    }
}
