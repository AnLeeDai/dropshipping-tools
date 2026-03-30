using DropshippingTools.Native.Shell;

namespace DropshippingTools.Native.Features.Home;

internal sealed class HomeToolPage : UserControl
{
    public HomeToolPage(ToolHostContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        Dock = DockStyle.Fill;

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(24),
            ColumnCount = 1,
            RowCount = 4,
        };
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

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
            MaximumSize = new Size(980, 0),
            Text = "Chọn công cụ để bắt đầu.",
            Margin = new Padding(0, 0, 0, 18),
        };

        var toolsLabel = new Label
        {
            AutoSize = true,
            Text = "Công cụ",
            Font = new Font(Font, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 12),
        };

        var toolsPanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoScroll = true,
            WrapContents = true,
            FlowDirection = FlowDirection.LeftToRight,
            Margin = new Padding(0),
        };

        foreach (var tool in context.Tools.Where(static tool => tool.ShowInLauncher))
        {
            toolsPanel.Controls.Add(CreateToolCard(tool, context));
        }

        layout.Controls.Add(titleLabel, 0, 0);
        layout.Controls.Add(descriptionLabel, 0, 1);
        layout.Controls.Add(toolsLabel, 0, 2);
        layout.Controls.Add(toolsPanel, 0, 3);

        Controls.Add(layout);
    }

    private static Control CreateToolCard(AppToolDescriptor tool, ToolHostContext context)
    {
        var card = new TableLayoutPanel
        {
            Width = 320,
            Height = 140,
            Padding = new Padding(14),
            Margin = new Padding(0, 0, 16, 16),
            ColumnCount = 1,
            RowCount = 3,
            BorderStyle = BorderStyle.FixedSingle,
        };
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        card.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize));

        var titleLabel = new Label
        {
            AutoSize = true,
            Text = tool.DisplayName,
            Font = new Font(Control.DefaultFont, FontStyle.Bold),
            Margin = new Padding(0, 0, 0, 8),
        };

        var descriptionLabel = new Label
        {
            AutoSize = true,
            MaximumSize = new Size(280, 0),
            Text = tool.Description,
            Margin = new Padding(0, 0, 0, 12),
        };

        var openButton = new Button
        {
            AutoSize = true,
            Text = $"Mở {tool.DisplayName}",
            Padding = new Padding(12, 6, 12, 6),
            Margin = new Padding(0),
        };
        openButton.Click += (_, _) => context.NavigateTo(tool.Id);

        card.Controls.Add(titleLabel, 0, 0);
        card.Controls.Add(descriptionLabel, 0, 1);
        card.Controls.Add(openButton, 0, 2);

        return card;
    }
}
