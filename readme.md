# Bộ công cụ Dropshipping

Biên dịch:

```powershell
dotnet build .\DropshippingTools.Native\DropshippingTools.Native.csproj
```

Đóng gói release production:

```powershell
.\scripts\build-velopack-release.ps1
```

Ghi chú:

- Script trên luôn tạo feed cập nhật Velopack.
- Nếu máy có `ISCC.exe` của Inno Setup, script sẽ tạo thêm `DropshippingTools-Installer.exe` cho lần cài đầu và cho phép chọn thư mục cài đặt.
- Nếu máy chưa có Inno Setup, script vẫn tạo `Setup.exe` tiêu chuẩn của Velopack để kiểm tra local.
- Có thể truyền `VELOPACK_SIGN_PARAMS` để ký file khi đóng gói production.
