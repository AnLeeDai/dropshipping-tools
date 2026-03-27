# 🔄 Auto-Update Configuration Guide

Hướng dẫn cấu hình và sử dụng tính năng tự động cập nhật cho ứng dụng.

## 📋 Cài đặt Dependency

Trước tiên, cài đặt gói `electron-updater`:

```bash
npm install electron-updater
```

## 🔧 Cấu hình Publish (GitHub)

### 1. Cập nhật `forge.config.ts`

Chỉnh sửa phần `publishers` trong `forge.config.ts`:

```typescript
publishers: [
  {
    name: '@electron-forge/publisher-github',
    config: {
      repository: {
        owner: 'your-github-username',      // Thay bằng username GitHub của bạn
        name: 'dropshipping-tools',          // Tên repository
      },
      prerelease: false,
      draft: true,
    },
  },
],
```

### 2. Thiết lập GitHub Token

1. Tạo Personal Access Token trên GitHub:
   - Vào Settings → Developer settings → Personal access tokens
   - Chọn "Tokens (classic)"
   - Tạo token mới với scope: `repo`, `read:packages`

2. Thêm token vào biến môi trường:
   ```bash
   $env:GITHUB_TOKEN = "your-github-token"
   ```

### 3. Cấu hình `electron-updater`

File `src/lib/update-manager.ts` đã được cấu hình sẵn. Bạn có thể tùy chỉnh:

```typescript
// Kiểm tra cập nhật mỗi giờ
setInterval(() => {
  autoUpdater.checkForUpdates();
}, 60 * 60 * 1000); // Thay đổi time interval nếu cần
```

## 🚀 Quy Trình Phát Hành Cập Nhật

### Bước 1: Cập nhật version trong `package.json`

```json
{
  "version": "1.0.1"
}
```

### Bước 2: Commit và Tag

```bash
git add .
git commit -m "chore: release v1.0.1"
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main --tags
```

### Bước 3: Build và Publish

```bash
npm run make
npm run publish
```

Lệnh này sẽ:
- Build ứng dụng
- Tạo installer cho các nền tảng khác nhau
- Tải lên GitHub Releases
- Auto-updater sẽ tự động phát hiện bản cập nhật

## 📱 Cách Hoạt Động

### Phía Server
1. Release phiên bản mới trên GitHub
2. Electron-updater sẽ tự động phát hiện qua GitHub API

### Phía Client
1. Ứng dụng tự động kiểm tra cập nhật khi khởi động
2. Kiểm tra lại mỗi giờ
3. Hiển thị dialog khi có cập nhật mới
4. User chọn "Cập nhật ngay" để tải xuống
5. Sau khi tải xong, ứng dụng sẽ thoát và cài đặt
6. Khởi động lại với phiên bản mới

## 🎯 Tính Năng Đã Triển Khai

✅ **Tự động kiểm tra cập nhật**
- Khi ứng dụng khởi động
- Kiểm tra lại mỗi giờ

✅ **Dialog Thông Báo**
- Hiển thị phiên bản hiện tại và phiên bản mới
- Hiển thị ghi chú phát hành (release notes)
- Cho phép user chọn "Để sau" hoặc "Cập nhật ngay"

✅ **Progress Bar**
- Hiển thị tiến trình tải xuống
- Hiển thị tốc độ và dung lượng

✅ **Error Handling**
- Hiển thị lỗi nếu kiểm tra thất bại
- Cho phép user thử lại

## 🔌 API Sử Dụng

Trong React component, sử dụng hook `useUpdater`:

```typescript
import { useUpdater } from "@/hooks/use-updater";

export function MyComponent() {
  const {
    updateInfo,      // Thông tin cập nhật
    isDownloading,   // Đang tải xuống
    downloadProgress, // Tiến trình tải
    isChecking,      // Đang kiểm tra
    error,           // Lỗi nếu có
    checkForUpdates, // Hàm kiểm tra cập nhật
    quitAndInstall,  // Hàm cài đặt và khởi động lại
  } = useUpdater();
}
```

## 🌐 Alternative: Update Server

Nếu không muốn dùng GitHub, bạn có thể sử dụng server riêng:

1. Tạo endpoint trả về update info JSON:
```json
{
  "version": "1.0.1",
  "files": [
    {
      "url": "https://your-server.com/dropshipping-tools-1.0.1.zip",
      "sha512": "...",
      "size": 123456
    }
  ],
  "path": "https://your-server.com/dropshipping-tools-1.0.1.zip",
  "releaseDate": "2024-03-27"
}
```

2. Cấu hình trong `update-manager.ts`:
```typescript
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://your-server.com/updates/'
});
```

## 🛠️ Troubleshooting

### Cập nhật không được phát hiện
- Kiểm tra GitHub Token
- Kiểm tra tên repository trong config
- Verify tag version khớp với package.json

### Dialog không hiển thị
- Kiểm tra console log (F12)
- Ensure `electron` API được expose trong preload.ts
- Verify `UpdateNotifier` được render trong Providers

### Tải xuống thất bại
- Kiểm tra kết nối mạng
- Kiểm tra dung lượng ổ cứng
- Kiểm tra permission folder tạm thời

## 📚 Tài Liệu Tham Khảo

- [electron-updater docs](https://www.electron.build/auto-update)
- [Electron Forge Publishing](https://www.electronforge.io/config/publishers)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28)
