namespace DropshippingTools.Native.Formatting;

internal static class FriendlyErrorFormatter
{
    public static string Format(Exception exception)
    {
        if (exception is HttpRequestException httpException)
        {
            if (httpException.StatusCode.HasValue)
            {
                return $"Khong the tai du lieu cap nhat. May chu tra ve ma loi {(int)httpException.StatusCode.Value}.";
            }

            var message = httpException.Message;
            if (message.Contains("No such host", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("Name or service not known", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("remote name could not be resolved", StringComparison.OrdinalIgnoreCase))
            {
                return "Khong tim thay may chu cap nhat. Hay kiem tra ket noi mang va URL feed.";
            }

            if (message.Contains("actively refused", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("forcibly closed", StringComparison.OrdinalIgnoreCase))
            {
                return "Ket noi toi may chu cap nhat bi tu choi hoac bi ngat giua chung.";
            }

            return "Khong the ket noi toi may chu cap nhat. Hay kiem tra mang roi thu lai.";
        }

        if (exception is TaskCanceledException)
        {
            return "Yeu cau cap nhat bi het thoi gian. Hay kiem tra mang roi thu lai.";
        }

        if (exception is IOException)
        {
            return "Khong the doc hoac ghi tep can thiet. Hay dong cac tep dang bi khoa va thu lai.";
        }

        return string.IsNullOrWhiteSpace(exception.Message)
            ? "Da xay ra loi khong xac dinh."
            : exception.Message;
    }
}
