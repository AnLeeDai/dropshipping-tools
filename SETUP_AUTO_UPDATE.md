# 🚀 Quick Start - Auto-Update Feature

## 1️⃣ Cài đặt Dependency

```bash
npm install electron-updater
```

## 2️⃣ Cấu hình GitHub Repository (Khuyến nghị)

### Option A: GitHub Releases (Khuyến nghị nhất)

1. **Tạo GitHub Personal Access Token:**
   - Vào https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Chọn scope: `repo`, `read:packages`
   - Copy token

2. **Thiết lập biến môi trường:**
   ```bash
   # Windows PowerShell
   $env:GITHUB_TOKEN = "your_token_here"
   
   # Windows CMD
   set GITHUB_TOKEN=your_token_here
   
   # Linux/Mac
   export GITHUB_TOKEN=your_token_here
   ```

3. **Cập nhật `forge.config.ts`** - Đã cấu hình sẵn, chỉ cần thay:
   ```typescript
   publishers: [
     {
       name: '@electron-forge/publisher-github',
       config: {
         repository: {
           owner: 'YOUR_GITHUB_USERNAME',      // ← Thay username
           name: 'YOUR_REPO_NAME',              // ← Thay repo name
         },
         prerelease: false,
         draft: true,
       },
     },
   ],
   ```

4. **Cập nhật `package.json`:**
   ```json
   {
     "version": "1.0.1"  // ← Tăng version
   }
   ```

5. **Phát hành:**
   ```bash
   git add .
   git commit -m "Release v1.0.1"
   git tag -a v1.0.1 -m "Version 1.0.1"
   git push origin main --tags
   
   npm run make
   npm run publish
   ```

## 3️⃣ Test Tính Năng

1. **Chạy trong dev**:
   ```bash
   npm run start
   ```

2. **Kiểm tra Console** (F12):
   - Xem message về checking updates
   - Confirm không có lỗi

3. **Nếu có cập nhật**:
   - Dialog sẽ hiển thị tự động
   - Click "Cập nhật ngay"
   - Ứng dụng sẽ tải xuống rồi khởi động lại

## 📋 Cơ Chế Hoạt Động

- ✅ Ứng dụng tự động kiểm tra khi khởi động
- ✅ Kiểm tra lại mỗi giờ
- ✅ Lấy release notes từ GitHub
- ✅ Hiển thị progress bar khi tải
- ✅ Tự động cài đặt và khởi động lại

## 📁 Những File Đã Thêm/Sửa

**Mới:**
- `src/lib/update-manager.ts` - Logic updater
- `src/hooks/use-updater.ts` - React hook
- `src/components/update-dialog.tsx` - UI Dialog
- `src/components/ui/dialog.tsx` - Dialog component (nếu cần)
- `AUTO_UPDATE_GUIDE.md` - Hướng dẫn chi tiết

**Sửa:**
- `src/main.ts` - Khởi tạo updater
- `src/preload.ts` - Expose API to renderer
- `src/providers/index.tsx` - Thêm UpdateNotifier
- `forge.config.ts` - Thêm publisher config (cần cấu hình username/repo)

## 🔧 Troubleshooting

| Vấn đề | Giải pháp |
|--------|----------|
| Dialog không hiển thị | Check console, xem có error message không |
| Không phát hiện update | Kiểm tra GITHUB_TOKEN, username/repo name trong forge.config.ts |
| Tải xuống thất bại | Kiểm tra kết nối mạng, dung lượng disk |
| Cần dùng custom server | Xem `AUTO_UPDATE_GUIDE.md` phần "Update Server" |

## 💡 Mẹo

- Để test update locally: [Electron Updater Local Testing](https://www.electron.build/auto-update#testing)
- Sử dụng GitHub Releases draft mode để test mà không công khai
- Check logs trong `~/.config/dropshipping-tools/logs` (Linux) hoặc `%APPDATA%/dropshipping-tools/logs` (Windows)

## 🎯 Chi phí

**Hoàn toàn miễn phí!** GitHub cung cấp:
- Hosting releases miễn phí
- API unlimited cho public repos
- 1000 requests/hour per user cho private repos

---

**Cần giúp thêm?** Xem `AUTO_UPDATE_GUIDE.md` để hướng dẫn chi tiết.
