namespace DropshippingTools.Native.Services;

internal static class VersionComparer
{
    public static int Compare(string left, string right)
    {
        var leftVersion = Normalize(left);
        var rightVersion = Normalize(right);
        return leftVersion.CompareTo(rightVersion);
    }

    public static Version Normalize(string version)
    {
        var cleaned = version.Trim().TrimStart('v', 'V');
        return Version.TryParse(cleaned, out var parsed)
            ? parsed
            : new Version(0, 0, 0, 0);
    }
}
