# 📱 Sổ Nợ (SoNo - Personal Debt Ledger)

[![Capacitor](https://img.shields.io/badge/Capacitor-8.5.3-blue.svg)](https://capacitorjs.com/)
[![React](https://img.shields.io/badge/React-19.2.8-61dafb.svg)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-Native%20Local-003B57.svg)](https://sqlite.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3.3-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Private-green.svg)]()

Ứng dụng ghi chép và quản lý sổ ghi nợ cá nhân (cho vay / đi vay) **100% Offline-First**, ưu tiên tối đa tính bảo mật và sự riêng tư. Dữ liệu được lưu trữ hoàn toàn cục bộ trên thiết bị bằng **SQLite Native**, không cần máy chủ trung gian, không cần tài khoản hay kết nối mạng Internet.

---

## 🌟 Điểm nổi bật & Tính năng chính

### 1. 💾 Lưu trữ cục bộ & Tự phục hồi dữ liệu (Offline-First Engine)
- **Native SQLite:** Trên thiết bị Android/iOS, ứng dụng sử dụng trực tiếp engine SQLite gốc của hệ điều hành, đảm bảo tốc độ truy vấn tức thì và tính an toàn cao.
- **Tự động phục hồi kết nối (Auto-Reconnect):** Cơ chế `ensureOpen` tự động kiểm tra và kết nối lại cơ sở dữ liệu khi mở lại app từ chế độ chạy ngầm hoặc khóa màn hình.
- **Web Storage Fallback:** Khi chạy thử nghiệm trên trình duyệt Web máy tính, ứng dụng kích hoạt song song WebAssembly (`jeep-sqlite`) và engine dự phòng an toàn (LocalStorage Web Fallback), loại bỏ hoàn toàn hiện tượng nghẽn lưu dữ liệu.

### 2. 🛡️ Bảo mật đa tầng (Multi-Layer Security Hardening)
- **Chống trích xuất dữ liệu qua USB / ADB:** Thiết lập `android:allowBackup="false"` chặn nguy cơ kẻ xấu trích xuất cơ sở dữ liệu qua các lệnh backup máy tính.
- **Khóa ứng dụng bằng mã PIN (App PIN Lock):**
  - Tính năng tùy chọn trong **Cài đặt** (mặc định tắt, linh hoạt cho người dùng).
  - Mật mã 4 số được băm mật mã an toàn bằng **SHA-256 kèm chuỗi Salt ngẫu nhiên** qua Web Crypto API, không lưu plaintext thô.
  - Tự động hiển thị màn hình khóa toàn màn hình với bàn phím số khi mở app hoặc khi quay lại từ thanh đa nhiệm (App Resume).
  - Có rung phản hồi (Haptics) và hiệu ứng rung lắc (shake animation) khi nhập sai mã.
- **Chính sách an toàn nội dung (Content Security Policy - CSP):** Chặn đứng nguy cơ tấn công XSS, cấm chèn script từ xa và cấm rò rỉ dữ liệu ra ngoài.
- **Bảo vệ sao lưu (Backup Sanitization):** Chặn tệp sao lưu JSON > 5MB, chống Prototype Pollution (`__proto__`) và tự động khử độc chuỗi ký tự trước khi khôi phục vào SQLite.
- **Giữ nguyên khả năng chụp màn hình:** Cho phép người dùng chụp ảnh màn hình danh sách nợ để lưu lại biên lai hoặc đối chiếu đối soát bình thường.

### 3. 🎨 Giao diện hiện đại & Trải nghiệm tối ưu (UI/UX)
- **Thẻ người nợ / chủ nợ thông minh:** Bố cục hiển thị tên người đầy đủ (tự xuống dòng, không bị cắt cụt), thông tin tổng nợ nổi bật ngay phía dưới tên, các nút thao tác nhanh gọn gàng bên phải.
- **Hiệu ứng khởi động (Splash Screen Wave):** Hoạt ảnh 3 chấm sóng biển (Wave Animation) nhịp nhàng, chuyển động đồng bộ với gia tốc vật lý mềm mại.
- **Trạng thái danh sách rỗng (Empty States):** Minh họa trực quan, gợi ý hành động thân thiện khi chưa có dữ liệu.
- **Chế độ hiển thị:** Hỗ trợ giao diện Sáng / Tối (Dark / Light Mode) và Safe-Area Insets (tai thỏ, thanh vuốt Home của Android & iOS).

### 4. 📦 Sao lưu & Khôi phục độc lập
- **Xuất dữ liệu an toàn:** Hỗ trợ chuẩn Web Share API để chia sẻ nhanh file sao lưu JSON qua Zalo, Messenger, Google Drive, Email hoặc lưu vào bộ nhớ máy.
- **Khôi phục nguyên tử:** Quá trình phục hồi dữ liệu chạy trong một SQLite Transaction khép kín. Nếu xảy ra bất kỳ lỗi định dạng nào, hệ thống tự động hoàn tác để giữ nguyên dữ liệu hiện có.

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công nghệ / Thư viện |
|---|---|
| **Core Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite 8](https://vite.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) (Mobile-first, Dark Mode, Safe-area insets) |
| **Mobile Runtime** | [Capacitor 8](https://capacitorjs.com/) (`@capacitor/android`, `@capacitor/app`, `@capacitor/haptics`) |
| **Cơ sở dữ liệu** | [`@capacitor-community/sqlite`](https://github.com/capacitor-community/sqlite) v8.1.1 |
| **Bảo mật** | Web Crypto API (SHA-256 + Salt), Android Manifest Hardening, CSP |
| **Icon set** | [Lucide React](https://lucide.dev/) |
| **Package Manager**| [pnpm](https://pnpm.io/) |
| **CI/CD Build APK** | [GitHub Actions](https://github.com/features/actions) |

---

## 🗄️ Cấu trúc Cơ sở dữ liệu SQLite

Ứng dụng sử dụng 3 bảng quan hệ ràng buộc khóa ngoại (Foreign Keys ON, CASCADE):

```text
┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│     people      │ 1   * │   debt_activities    │ 1   * │   payment_history    │
├─────────────────┤───────├──────────────────────┤───────├──────────────────────┤
│ id (PK)         │       │ id (PK)              │       │ id (PK)              │
│ name            │       │ person_id (FK)       │       │ activity_id (FK)     │
│ type (DEBTOR/   │       │ description          │       │ amount (> 0)         │
│       CREDITOR) │       │ original_amount (>0) │       │ paid_at              │
│ created_at      │       │ remaining_amount(>=0)│       │ note                 │
└─────────────────┘       │ status (UNPAID/PAID) │       └──────────────────────┘
                          │ created_at           │
                          └──────────────────────┘
```

Ngoài ra còn có bảng `settings` (Key-Value) lưu cấu hình giao diện, ngôn ngữ và mã PIN băm mật mã.

---

## 🚀 Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Cài đặt môi trường
Yêu cầu Node.js $\ge$ 20 và `pnpm`:
```bash
git clone https://github.com/Hkhiem-GB/SoNo.git
cd SoNo
pnpm install
```

### 2. Chạy thử nghiệm trên trình duyệt Web
```bash
pnpm dev
```
Truy cập: `http://localhost:3000` (hoặc cổng hiển thị trên terminal).

### 3. Chạy kiểm thử tự động SQLite Logic (11 Kịch bản)
```bash
node scripts/test-sqlite-logic.mjs
```

### 4. Biên dịch và đồng bộ sang Android
```bash
# Biên dịch mã nguồn và đồng bộ với Capacitor Android
pnpm build:android
```

### 5. Mở trong Android Studio (nếu cần debug trực tiếp trên máy thật/giả lập)
```bash
pnpm exec cap open android
```

### 6. Tự động Build file APK qua GitHub Actions (Không cần Android Studio)
Chỉ cần đẩy commit lên nhánh `main`:
```bash
git add .
git commit -m "feat: cap nhat tinh nang moi"
git push origin main
```
Hệ thống GitHub Actions sẽ tự động biên dịch và tạo tệp `app-debug.apk` trong mục **Actions** > **Build Android APK** để bạn tải về cài đặt trực tiếp lên điện thoại.

---

## 🔒 Quy chuẩn Bảo mật & Đóng góp
- Không đẩy các tệp môi trường, chứng chỉ ký hoặc công cụ JDK cục bộ lên Git (đã được cấu hình trong `.gitignore`).
- Mọi truy vấn thay đổi dữ liệu nhiều bảng phải luôn được thực thi trong transaction (`dbManager.transaction(...)`).

---

*Phát triển bởi Hoka Team - Sổ Nợ: Quản lý nợ, rõ từng khoản.*
