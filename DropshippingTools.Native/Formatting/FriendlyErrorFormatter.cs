namespace DropshippingTools.Native.Formatting;

internal static class FriendlyErrorFormatter
{
    public static string Format(Exception exception)
    {
        if (exception is HttpRequestException httpException)
        {
            if (httpException.StatusCode.HasValue)
            {
                return $"Không thể tải dữ liệu cập nhật. Máy chủ trả về mã lỗi {(int)httpException.StatusCode.Value}.";
            }

            var message = httpException.Message;
            if (message.Contains("No such host", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("Name or service not known", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("remote name could not be resolved", StringComparison.OrdinalIgnoreCase))
            {
                return "Không tìm thấy máy chủ cập nhật. Hãy kiểm tra kết nối mạng và URL nguồn cấp.";
            }

            if (message.Contains("actively refused", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("forcibly closed", StringComparison.OrdinalIgnoreCase))
            {
                return "Kết nối tới máy chủ cập nhật bị từ chối hoặc bị ngắt giữa chừng.";
            }

            return "Không thể kết nối tới máy chủ cập nhật. Hãy kiểm tra mạng rồi thử lại.";
        }

        if (exception is TaskCanceledException)
        {
            return "Yêu cầu cập nhật bị hết thời gian. Hãy kiểm tra mạng rồi thử lại.";
        }

        if (exception is IOException)
        {
            return "Không thể đọc hoặc ghi tệp cần thiết. Hãy đóng các tệp đang bị khóa và thử lại.";
        }

        return string.IsNullOrWhiteSpace(exception.Message)
            ? "Đã xảy ra lỗi không xác định."
            : exception.Message;
    }
}
