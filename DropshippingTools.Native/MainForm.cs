using DropshippingTools.Native.Shell;
using DropshippingTools.Native.UI.Controls;

namespace DropshippingTools.Native;

internal sealed class MainForm : Form
{
    private const string HomeToolId = "home";

    private readonly IReadOnlyList<IAppToolModule> _modules;
    private readonly IReadOnlyList<AppToolDescriptor> _toolDescriptors;
    private readonly Dictionary<string, IAppToolModule> _modulesById;
    private readonly Dictionary<string, Control> _viewsById;
    private readonly Dictionary<string, AppTabPage> _tabsById;

    private readonly ChromeTabStrip _tabs = new();
    private readonly Panel _contentHost = new()
    {
        Dock = DockStyle.Fill,
        BackColor = SystemColors.Window,
    };
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
        EnsureUniqueToolIds(_toolDescriptors);
        _modulesById = modules.ToDictionary(module => module.Descriptor.Id, StringComparer.OrdinalIgnoreCase);
        _viewsById = new Dictionary<string, Control>(StringComparer.OrdinalIgnoreCase);
        _tabsById = new Dictionary<string, AppTabPage>(StringComparer.OrdinalIgnoreCase);

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
        WindowState = FormWindowState.Maximized;
        BackColor = SystemColors.ControlLight;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
        UpdateStyles();

        _tabs.TabCloseRequested += HandleTabCloseRequested;
        _tabs.SelectedTabChanged += HandleSelectedTabChanged;

        SuspendLayout();
        InitializeViews();
        InitializeTabs();
        InitializeStatusStrip();
        ResumeLayout(performLayout: true);
        Shown += HandleFormShownAsync;
    }

    private void InitializeViews()
    {
        foreach (var module in _modules)
        {
            var view = module.CreateView(_toolHostContext)
                ?? throw new InvalidOperationException($"Công cụ '{module.Descriptor.Id}' đã trả về giao diện rỗng.");

            view.Dock = DockStyle.Fill;
            _viewsById.Add(module.Descriptor.Id, view);
        }
    }

    private void InitializeTabs()
    {
        Controls.Add(_contentHost);
        Controls.Add(_tabs);

        if (!OpenToolTab(HomeToolId, selectTab: true))
        {
            throw new InvalidOperationException("Không thể khởi tạo tab Trang chủ.");
        }
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
        foreach (var view in _viewsById.Values.OfType<IHostedToolView>())
        {
            await view.OnHostShownAsync();
        }
    }

    private void NavigateTo(string toolId)
    {
        if (!OpenToolTab(toolId, selectTab: true))
        {
            SetStatus($"Không tìm thấy công cụ '{toolId}'.");
        }
    }

    private bool OpenToolTab(string toolId, bool selectTab)
    {
        if (_tabsById.TryGetValue(toolId, out var existingTab))
        {
            if (selectTab)
            {
                _tabs.SelectedTab = existingTab;
            }

            return true;
        }

        if (!_modulesById.TryGetValue(toolId, out var module) || !_viewsById.TryGetValue(toolId, out var view))
        {
            return false;
        }

        var tabPage = new AppTabPage(
            toolId: module.Descriptor.Id,
            title: module.Descriptor.DisplayName,
            isClosable: !string.Equals(toolId, HomeToolId, StringComparison.OrdinalIgnoreCase),
            view: view);

        if (view.Parent is not null)
        {
            view.Parent.Controls.Remove(view);
        }

        _tabs.AddTab(tabPage);
        _tabsById.Add(toolId, tabPage);

        if (selectTab)
        {
            _tabs.SelectedTab = tabPage;
        }

        return true;
    }

    private void HandleTabCloseRequested(object? sender, TabCloseRequestedEventArgs e)
    {
        if (!e.TabPage.IsClosable)
        {
            return;
        }

        CloseToolTab(e.TabPage.ToolId);
    }

    private void HandleSelectedTabChanged(object? sender, TabSelectionChangedEventArgs e)
    {
        ShowTabView(e.SelectedTab);
    }

    private void CloseToolTab(string toolId)
    {
        if (!_tabsById.TryGetValue(toolId, out var tabPage))
        {
            return;
        }

        if (ReferenceEquals(_contentHost.Controls.Count > 0 ? _contentHost.Controls[0] : null, tabPage.View))
        {
            _contentHost.Controls.Remove(tabPage.View);
        }

        _tabsById.Remove(toolId);
        _tabs.RemoveTab(tabPage);

        if (_tabs.SelectedTab is null && _tabsById.TryGetValue(HomeToolId, out var homeTab))
        {
            _tabs.SelectedTab = homeTab;
        }
    }

    private void ShowTabView(AppTabPage? tabPage)
    {
        if (_contentHost.Controls.Count > 0)
        {
            _contentHost.Controls.RemoveAt(0);
        }

        if (tabPage is null)
        {
            return;
        }

        if (tabPage.View.Parent is not null)
        {
            tabPage.View.Parent.Controls.Remove(tabPage.View);
        }

        _contentHost.Controls.Add(tabPage.View);
        tabPage.View.Dock = DockStyle.Fill;
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
