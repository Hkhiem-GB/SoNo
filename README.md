# Sổ Nợ (Debt Book) - Mobile App

Ứng dụng cá nhân quản lý sổ ghi nợ (cho vay / đi vay) offline-first trên Android, lưu trữ dữ liệu 100% cục bộ trên thiết bị bằng **SQLite**, không cần backend, không cần tài khoản hay dịch vụ đám mây.

---

## 1. Công nghệ sử dụng

- **Frontend:** React 19, TypeScript, Vite 8.
- **Styling:** Tailwind CSS v4 (Mobile-first, Dark/Light Mode, Safe-area insets cho tai thỏ và thanh điều hướng Android).
- **Mobile Runtime:** Capacitor 8 (`@capacitor/android`, `@capacitor/core`).
- **Cơ sở dữ liệu:** `@capacitor-community/sqlite` (chạy SQLite gốc trên Android, hỗ trợ fallback Web với `jeep-sqlite`).
- **Icons & UI:** `lucide-react`, `clsx`, `tailwind-merge`.
- **Package Manager:** `pnpm`.
- **CI/CD:** GitHub Actions (Build APK tự động trên cloud, không cần cài Android Studio).

---

## 2. Thông tin ứng dụng

- **Tên ứng dụng:** Sổ Nợ
- **Package ID (App ID):** `com.hoka.sono`
- **Ngôn ngữ:** Tiếng Việt (mặc định) & Tiếng Anh (chuyển đổi linh hoạt trong cài đặt).
- **Chế độ hiển thị:** Sáng (Light), Tối (Dark) hoặc Theo hệ thống (System).
- **Lưu trữ:** 100% Cục bộ bằng SQLite (`sono_db`).

---

## 3. Kiến trúc dự án

Dự án được phân tách rõ ràng theo các tầng độc lập:

```text
SoNo/
├── .github/
│   └── workflows/
│       └── build-apk.yml          # GitHub Actions tự động build APK khi push/release
├── android/                       # Mã nguồn native Android được tạo bởi Capacitor
│   ├── app/
│   └── build.gradle
├── src/
│   ├── config/
│   │   └── appConfig.ts           # Cấu hình app, database name, app ID
│   ├── database/
│   │   ├── schema.ts              # DDL SQLite (bảng people, debts, payments, settings)
│   │   └── sqliteConnection.ts    # Khởi tạo và quản lý kết nối SQLite (Android & Web)
│   ├── repositories/              # Tầng truy xuất dữ liệu (Data Access Layer)
│   │   ├── personRepository.ts    # Truy vấn bảng people
│   │   ├── debtRepository.ts      # Truy vấn bảng debts, tính toán số dư
│   │   ├── paymentRepository.ts   # Truy vấn bảng payments
│   │   └── settingsRepository.ts  # Quản lý cấu hình lưu trong SQLite
│   ├── services/                  # Tầng logic nghiệp vụ (Business Logic Layer)
│   │   ├── debtService.ts         # Nghiệp vụ nợ, thanh toán, quyết toán
│   │   ├── personService.ts       # Nghiệp vụ danh bạ nợ
│   │   └── backupService.ts       # Sao lưu / Khôi phục file JSON offline
│   ├── context/                   # Tầng quản lý trạng thái React Context
│   │   ├── DbContext.tsx          # Quản lý khởi tạo SQLite và reload app
│   │   ├── ThemeContext.tsx       # Quản lý Sáng / Tối và màu Status Bar Android
│   │   └── LanguageContext.tsx    # Quản lý đa ngôn ngữ (VI / EN)
│   ├── i18n/
│   │   └── translations.ts        # Từ điển song ngữ Tiếng Việt & Tiếng Anh
│   ├── types/
│   │   └── index.ts               # Định nghĩa kiểu dữ liệu TypeScript
│   ├── utils/
│   │   ├── formatters.ts          # Định dạng tiền tệ VND, ngày tháng, hạn nợ
│   │   └── id.ts                  # Tạo UUID v4
│   ├── components/
│   │   ├── common/                # Modal, ConfirmDialog
│   │   ├── layout/                # TopAppBar (pt-safe), BottomNav (pb-safe), AppShell
│   │   ├── debts/                 # Thẻ nợ, bộ lọc, form thêm nợ, trả bớt, lịch sử
│   │   ├── people/                # Danh bạ người nợ, chi tiết từng người
│   │   ├── reports/               # Báo cáo tỷ lệ dòng tiền, top người nợ
│   │   └── settings/              # Cài đặt theme, ngôn ngữ, backup/restore
│   ├── App.tsx                    # Điều hướng chính và nạp Providers
│   ├── main.tsx                   # Điểm bắt đầu của ứng dụng React
│   └── index.css                  # Cấu hình Tailwind CSS và Safe Area insets
├── capacitor.config.ts            # Cấu hình Capacitor (App ID, Splash, StatusBar)
├── vite.config.ts                 # Cấu hình Vite & Tailwind v4
└── package.json                   # Scripts và dependencies
```

---

## 4. Hướng dẫn cài đặt và chạy thử

### Bước 1: Cài đặt thư viện
```bash
pnpm install
```

### Bước 2: Chạy thử trên trình duyệt (Web Development)
```bash
pnpm dev
```
Trình duyệt sẽ mở tại `http://localhost:3000`. Khi chạy trên Web, hệ thống tự động kích hoạt `jeep-sqlite` trong bộ nhớ cục bộ để bạn có thể kiểm thử toàn bộ tính năng giao diện, thêm sửa xóa nợ mà không cần điện thoại hay máy ảo.

### Bước 3: Biên dịch Web và đồng bộ sang Android
```bash
pnpm build
pnpm cap:sync
```

---

## 5. Hướng dẫn Build APK bằng GitHub Actions (Không cần Android Studio)

Dự án đã được cấu hình sẵn file workflow `.github/workflows/build-apk.yml`. Bạn không cần cài đặt Android Studio trên máy cá nhân mà chỉ cần đưa code lên GitHub:

### Cách 1: Tự động build khi đẩy code lên GitHub
1. Khởi tạo kho lưu trữ GitHub và đẩy mã nguồn lên:
   ```bash
   git add .
   git commit -m "feat: init SoNo debt tracker app"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo-name>.git
   git push -u origin main
   ```
2. Mở repository trên GitHub, chuyển sang tab **Actions**.
3. Workflow **Build Android APK (Sổ Nợ)** sẽ tự động chạy trong khoảng 3–5 phút.
4. Khi chạy xong, bấm vào lượt chạy (Run) và cuộn xuống mục **Artifacts** để tải về file zip chứa **`SoNo-Debug-APK`**. Giải nén bạn sẽ có file `app-debug.apk` để cài trực tiếp vào điện thoại Android.

### Cách 2: Kích hoạt build thủ công (Workflow Dispatch)
1. Vào tab **Actions** trên GitHub.
2. Chọn workflow **Build Android APK (Sổ Nợ)** ở danh sách bên trái.
3. Bấm nút **Run workflow** -> Chọn nhánh `main` -> Bấm **Run workflow**.

### Cách 3: Tự động phát hành bản Release (GitHub Releases)
Tạo và đẩy một tag phiên bản (ví dụ `v1.0.0`):
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions sẽ tự động biên dịch APK và tạo một bản phát hành chính thức tại mục **Releases** trên GitHub đính kèm file `app-debug.apk`.

---

## 6. Hướng dẫn cài đặt file APK lên thiết bị Android

1. Tải file `app-debug.apk` về điện thoại (qua Zalo, Google Drive, hoặc tải trực tiếp từ GitHub).
2. Mở file APK trên điện thoại Android.
3. Nếu điện thoại hiển thị cảnh báo "Cài đặt ứng dụng từ nguồn không xác định" (Install unknown apps), hãy chọn **Cho phép từ nguồn này** (Allow from this source).
4. Bấm **Cài đặt** (Install) và mở ứng dụng **Sổ Nợ** để sử dụng.

---

## 7. Tính năng chính của ứng dụng Sổ Nợ

1. **Ghi nợ hai chiều:**
   - Người khác nợ tôi (Tôi cho vay).
   - Tôi nợ người khác (Tôi đi vay).
2. **Thanh toán linh hoạt:**
   - Thanh toán từng phần (ghi nhận nhiều đợt trả tiền kèm ngày và ghi chú).
   - Đánh dấu đã trả xong toàn bộ chỉ bằng một cú chạm (1-click settle).
   - Xem và quản lý lịch sử thanh toán chi tiết, có thể hoàn tác nếu ghi nhầm.
3. **Cảnh báo hạn nợ:**
   - Hẹn ngày đến hạn.
   - Tự động đánh dấu và đếm số khoản nợ quá hạn với cảnh báo nổi bật.
4. **Quản lý danh bạ nợ:**
   - Tự động tổng hợp số dư của từng người.
   - Gọi điện trực tiếp từ ứng dụng thông qua liên kết số điện thoại.
5. **Báo cáo tài chính trực quan:**
   - Phân tích cơ cấu nợ và cho vay.
   - Thống kê top người nợ nhiều nhất và người mình nợ nhiều nhất.
6. **Sao lưu & Khôi phục dữ liệu:**
   - Xuất dữ liệu ra file JSON lưu vào máy.
   - Nhập lại file JSON để chuyển dữ liệu sang thiết bị khác mà không lo mất dữ liệu.
