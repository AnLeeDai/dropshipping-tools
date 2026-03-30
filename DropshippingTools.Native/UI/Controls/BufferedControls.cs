using System.Drawing.Drawing2D;

namespace DropshippingTools.Native.UI.Controls;

internal sealed class AppTabPage
{
    public AppTabPage(string toolId, string title, bool isClosable, Control view)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(toolId);
        ArgumentNullException.ThrowIfNull(title);
        ArgumentNullException.ThrowIfNull(view);

        ToolId = toolId;
        Title = title;
        IsClosable = isClosable;
        View = view;
    }

    public string ToolId { get; }

    public string Title { get; }

    public bool IsClosable { get; }

    public Control View { get; }
}

internal sealed class TabCloseRequestedEventArgs : EventArgs
{
    public TabCloseRequestedEventArgs(AppTabPage tabPage)
    {
        TabPage = tabPage ?? throw new ArgumentNullException(nameof(tabPage));
    }

    public AppTabPage TabPage { get; }
}

internal sealed class TabSelectionChangedEventArgs : EventArgs
{
    public TabSelectionChangedEventArgs(AppTabPage? previousTab, AppTabPage? selectedTab)
    {
        PreviousTab = previousTab;
        SelectedTab = selectedTab;
    }

    public AppTabPage? PreviousTab { get; }

    public AppTabPage? SelectedTab { get; }
}

internal sealed class ChromeTabStrip : Control
{
    private const int StripHeight = 44;
    private const int TabOverlap = 30;
    private const int MaxTabWidth = 220;
    private const int MinTabWidth = 72;

    private static readonly Color StripBackgroundColor = Color.FromArgb(223, 227, 232);
    private static readonly Color SelectedTabColor = Color.White;
    private static readonly Color InactiveTabColor = Color.FromArgb(236, 239, 243);
    private static readonly Color HoverTabColor = Color.FromArgb(245, 247, 249);
    private static readonly Color BorderColor = Color.FromArgb(188, 193, 199);
    private static readonly Color SelectedTextColor = Color.FromArgb(32, 33, 36);
    private static readonly Color InactiveTextColor = Color.FromArgb(95, 99, 104);
    private static readonly Color CloseHoverColor = Color.FromArgb(36, 60, 64, 67);

    private readonly List<AppTabPage> _tabs = [];
    private readonly Dictionary<AppTabPage, Rectangle> _tabBounds = [];
    private readonly Dictionary<AppTabPage, Rectangle> _closeBounds = [];

    private AppTabPage? _selectedTab;
    private AppTabPage? _hoveredTab;
    private AppTabPage? _hoveredCloseTab;

    public ChromeTabStrip()
    {
        Dock = DockStyle.Top;
        Height = StripHeight;
        MinimumSize = new Size(0, StripHeight);
        Padding = new Padding(12, 7, 12, 0);
        BackColor = StripBackgroundColor;
        DoubleBuffered = true;
        SetStyle(
            ControlStyles.AllPaintingInWmPaint
            | ControlStyles.OptimizedDoubleBuffer
            | ControlStyles.ResizeRedraw
            | ControlStyles.UserPaint,
            true);
        UpdateStyles();
    }

    public event EventHandler<TabCloseRequestedEventArgs>? TabCloseRequested;

    public event EventHandler<TabSelectionChangedEventArgs>? SelectedTabChanged;

    public IReadOnlyList<AppTabPage> Tabs => _tabs;

    public AppTabPage? SelectedTab
    {
        get => _selectedTab;
        set => SelectTab(value);
    }

    public void AddTab(AppTabPage tabPage)
    {
        ArgumentNullException.ThrowIfNull(tabPage);
        if (_tabs.Contains(tabPage))
        {
            return;
        }

        _tabs.Add(tabPage);
        Invalidate();
    }

    public bool RemoveTab(AppTabPage tabPage)
    {
        ArgumentNullException.ThrowIfNull(tabPage);
        var index = _tabs.IndexOf(tabPage);
        if (index < 0)
        {
            return false;
        }

        var wasSelected = ReferenceEquals(_selectedTab, tabPage);
        _tabs.RemoveAt(index);
        _tabBounds.Remove(tabPage);
        _closeBounds.Remove(tabPage);
        _hoveredTab = ReferenceEquals(_hoveredTab, tabPage) ? null : _hoveredTab;
        _hoveredCloseTab = ReferenceEquals(_hoveredCloseTab, tabPage) ? null : _hoveredCloseTab;

        if (wasSelected)
        {
            var nextTab = _tabs.Count == 0
                ? null
                : _tabs[Math.Clamp(index - 1, 0, _tabs.Count - 1)];
            SelectTab(nextTab);
        }
        else
        {
            Invalidate();
        }

        return true;
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.Clear(StripBackgroundColor);

        var separatorY = Height - 1;
        using var separatorPen = new Pen(BorderColor);
        e.Graphics.DrawLine(separatorPen, 0, separatorY, Width, separatorY);

        _tabBounds.Clear();
        _closeBounds.Clear();

        if (_tabs.Count == 0)
        {
            return;
        }

        var tabWidth = GetTabWidth();
        var tabHeight = Height - Padding.Top - 1;
        var x = Padding.Left;
        var orderedTabs = _tabs
            .Where(tabPage => !ReferenceEquals(tabPage, _selectedTab))
            .Append(_selectedTab)
            .Where(static tabPage => tabPage is not null)
            .Cast<AppTabPage>()
            .ToArray();

        foreach (var tabPage in _tabs)
        {
            var bounds = new Rectangle(x, Padding.Top, tabWidth, tabHeight);
            _tabBounds[tabPage] = bounds;
            x += tabWidth - TabOverlap;
        }

        foreach (var tabPage in orderedTabs)
        {
            DrawTab(e.Graphics, tabPage, _tabBounds[tabPage], separatorY);
        }
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        if (e.Button != MouseButtons.Left)
        {
            base.OnMouseDown(e);
            return;
        }

        var tabPage = HitTestTab(e.Location);
        if (tabPage is null)
        {
            base.OnMouseDown(e);
            return;
        }

        if (tabPage.IsClosable && _closeBounds.TryGetValue(tabPage, out var closeBounds) && closeBounds.Contains(e.Location))
        {
            TabCloseRequested?.Invoke(this, new TabCloseRequestedEventArgs(tabPage));
            return;
        }

        SelectTab(tabPage);
        base.OnMouseDown(e);
    }

    protected override void OnMouseMove(MouseEventArgs e)
    {
        UpdateHoverState(e.Location);
        base.OnMouseMove(e);
    }

    protected override void OnMouseLeave(EventArgs e)
    {
        _hoveredTab = null;
        _hoveredCloseTab = null;
        Cursor = Cursors.Default;
        Invalidate();
        base.OnMouseLeave(e);
    }

    private void SelectTab(AppTabPage? tabPage)
    {
        if (ReferenceEquals(_selectedTab, tabPage))
        {
            return;
        }

        if (tabPage is not null && !_tabs.Contains(tabPage))
        {
            return;
        }

        var previousTab = _selectedTab;
        _selectedTab = tabPage;
        Invalidate();
        SelectedTabChanged?.Invoke(this, new TabSelectionChangedEventArgs(previousTab, _selectedTab));
    }

    private void DrawTab(Graphics graphics, AppTabPage tabPage, Rectangle bounds, int separatorY)
    {
        var isSelected = ReferenceEquals(tabPage, _selectedTab);
        var isHovered = ReferenceEquals(tabPage, _hoveredTab);
        var fillColor = isSelected
            ? SelectedTabColor
            : isHovered ? HoverTabColor : InactiveTabColor;
        var textColor = isSelected ? SelectedTextColor : InactiveTextColor;

        using var path = CreateTabPath(bounds);
        using var fillBrush = new SolidBrush(fillColor);
        using var borderPen = new Pen(BorderColor);
        graphics.FillPath(fillBrush, path);
        graphics.DrawPath(borderPen, path);

        if (isSelected)
        {
            using var blendPen = new Pen(fillColor, 2f);
            graphics.DrawLine(blendPen, bounds.Left + 14, separatorY, bounds.Right - 14, separatorY);
        }

        var textBounds = Rectangle.FromLTRB(
            bounds.Left + 18,
            bounds.Top + 6,
            bounds.Right - 18,
            bounds.Bottom - 8);

        if (tabPage.IsClosable)
        {
            var closeBounds = GetCloseButtonBounds(bounds);
            _closeBounds[tabPage] = closeBounds;
            textBounds = Rectangle.FromLTRB(textBounds.Left, textBounds.Top, closeBounds.Left - 6, textBounds.Bottom);
            DrawCloseGlyph(graphics, closeBounds, ReferenceEquals(tabPage, _hoveredCloseTab), textColor);
        }

        TextRenderer.DrawText(
            graphics,
            tabPage.Title,
            Font,
            textBounds,
            textColor,
            TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
    }

    private void UpdateHoverState(Point location)
    {
        var hoveredTab = HitTestTab(location);
        AppTabPage? hoveredCloseTab = null;

        if (hoveredTab is not null
            && hoveredTab.IsClosable
            && _closeBounds.TryGetValue(hoveredTab, out var closeBounds)
            && closeBounds.Contains(location))
        {
            hoveredCloseTab = hoveredTab;
        }

        if (ReferenceEquals(_hoveredTab, hoveredTab) && ReferenceEquals(_hoveredCloseTab, hoveredCloseTab))
        {
            return;
        }

        _hoveredTab = hoveredTab;
        _hoveredCloseTab = hoveredCloseTab;
        Cursor = hoveredTab is null ? Cursors.Default : Cursors.Hand;
        Invalidate();
    }

    private AppTabPage? HitTestTab(Point location)
    {
        foreach (var tabPage in _tabs)
        {
            if (_tabBounds.TryGetValue(tabPage, out var bounds) && bounds.Contains(location))
            {
                return tabPage;
            }
        }

        return null;
    }

    private int GetTabWidth()
    {
        var availableWidth = Math.Max(0, ClientSize.Width - Padding.Left - Padding.Right);
        if (availableWidth == 0)
        {
            return MaxTabWidth;
        }

        var rawWidth = (availableWidth + (Math.Max(0, _tabs.Count - 1) * TabOverlap)) / Math.Max(1, _tabs.Count);
        return Math.Clamp(rawWidth, MinTabWidth, MaxTabWidth);
    }

    private static Rectangle GetCloseButtonBounds(Rectangle tabBounds)
    {
        return new Rectangle(
            x: tabBounds.Right - 28,
            y: tabBounds.Top + (tabBounds.Height - 16) / 2,
            width: 16,
            height: 16);
    }

    private static GraphicsPath CreateTabPath(Rectangle bounds)
    {
        var path = new GraphicsPath();

        path.StartFigure();
        path.AddLine(bounds.Left + 15, bounds.Bottom, bounds.Left + 7, bounds.Top + 12);
        path.AddArc(bounds.Left + 6, bounds.Top + 1, 16, 16, 180, 85);
        path.AddLine(bounds.Left + 14, bounds.Top + 1, bounds.Right - 14, bounds.Top + 1);
        path.AddArc(bounds.Right - 22, bounds.Top + 1, 16, 16, 275, 85);
        path.AddLine(bounds.Right - 7, bounds.Top + 12, bounds.Right - 15, bounds.Bottom);
        path.CloseFigure();

        return path;
    }

    private static void DrawCloseGlyph(Graphics graphics, Rectangle bounds, bool isHovered, Color glyphColor)
    {
        if (isHovered)
        {
            using var hoverBrush = new SolidBrush(CloseHoverColor);
            graphics.FillEllipse(hoverBrush, bounds);
        }

        using var pen = new Pen(glyphColor, 1.7f);
        graphics.DrawLine(pen, bounds.Left + 4, bounds.Top + 4, bounds.Right - 4, bounds.Bottom - 4);
        graphics.DrawLine(pen, bounds.Right - 4, bounds.Top + 4, bounds.Left + 4, bounds.Bottom - 4);
    }
}

internal sealed class BufferedListView : ListView
{
    public BufferedListView()
    {
        DoubleBuffered = true;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
        UpdateStyles();
    }
}

internal sealed class BufferedDataGridView : DataGridView
{
    public BufferedDataGridView()
    {
        DoubleBuffered = true;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
        UpdateStyles();
    }
}
