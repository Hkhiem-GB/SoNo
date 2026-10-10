# Sổ Nợ (Debt Book) - Mobile App

Ứng dụng cá nhân quản lý sổ ghi nợ (cho vay / đi vay) offline-first trên Android, lưu trữ dữ liệu 100% cục bộ trên thiết bị bằng **SQLite**, không cần backend, không cần tài khoản hay dịch vụ đám mây.

---

## 1. Công nghệ sử dụng

- **Frontend:** React 19, TypeScript, Vite 8.
- **Styling:** Tailwind CSS v4 (Mobile-first, Dark/Light Mode, Safe-area insets cho tai thỏ và thanh điều hướng Android).
- **Mobile Runtime:** Capacitor 8 (`@capacitor/android`, `@capacitor/core`).
- **Splash Screen Plugin:** `@capacitor/splash-screen` (2 lớp: Native Splash + React Transition).
- **Cơ sở dữ liệu:** `@capacitor-community/sqlite` 8.1.1 (chạy SQLite gốc trên Android, hỗ trợ fallback Web với `jeep-sqlite`).
- **Package Manager:** `pnpm`.
- **CI/CD:** GitHub Actions (Build APK tự động trên cloud, không cần cài Android Studio).

---

## 2. Thông tin nhận diện thương hiệu

- **Tên hiển thị chính thức:** Sổ Nợ
- **Package ID (App ID):** `com.hoka.sono`
- **Slogan:** "Quản lý nợ, rõ từng khoản"
- **Logo biểu tượng:** Cuốn sổ ghi nợ tối giản kết hợp đồng tiền phong thủy xanh ngọc (Emerald / Teal), biểu trưng cho tài chính minh bạch, thanh khoản an tâm.
- **Bảng màu:**
  - Nền tối: Deep Navy `#0f172a`
  - Màu nhấn chính: Indigo `#6366f1` / Violet `#4f46e5`
  - Con nợ (người nợ mình): Emerald `#10b981` (dòng tiền thu về)
  - Chủ nợ (mình nợ người ta): Rose `#f43f5e` / Amber (cảnh báo nghĩa vụ chi trả)

---

## 3. Kiến trúc Database SQLite (Offline-First)

Hệ thống sử dụng cơ sở dữ liệu SQLite cục bộ chuẩn hoá với 3 bảng quan hệ:

### Bảng 1: `people`
- `id` (TEXT PRIMARY KEY): Định danh duy nhất.
- `name` (TEXT NOT NULL): Tên người.
- `type` (TEXT NOT NULL CHECK(type IN ('DEBTOR', 'CREDITOR'))): Phân loại Con nợ hoặc Chủ nợ.
- `created_at` (TEXT NOT NULL): Thời điểm tạo.

### Bảng 2: `debt_activities`
- `id` (TEXT PRIMARY KEY): Mã hoạt động nợ.
- `person_id` (TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE): Khóa ngoại liên kết người.
- `description` (TEXT NOT NULL): Nội dung hoạt động (ví dụ: *Ăn tối bún bò*, *Mượn đóng tiền nhà trọ*).
- `created_at` (TEXT NOT NULL): Ngày phát sinh khoản nợ.
- `original_amount` (INTEGER NOT NULL CHECK(original_amount > 0)): Số tiền ban đầu (VNĐ, số nguyên dương).
- `remaining_amount` (INTEGER NOT NULL CHECK(remaining_amount >= 0)): Số tiền còn nợ.
- `status` (TEXT NOT NULL CHECK(status IN ('UNPAID', 'PAID'))): Trạng thái nợ.

### Bảng 3: `payment_history`
- `id` (TEXT PRIMARY KEY): Mã lần thanh toán.
- `activity_id` (TEXT NOT NULL REFERENCES debt_activities(id) ON DELETE CASCADE): Khóa ngoại khoản nợ.
- `amount` (INTEGER NOT NULL CHECK(amount > 0)): Số tiền thực trả trong đợt này.
- `paid_at` (TEXT NOT NULL): Thời điểm thanh toán.
- `note` (TEXT): Ghi chú phương thức/lý do trả (chuyển khoản, tiền mặt...).

### Quy tắc toàn vẹn dữ liệu SQLite:
1. `PRAGMA foreign_keys = ON;`: Bật khóa ngoại, tự động xóa liên đới (CASCADE) khi xóa người.
2. **Transaction**: Mọi thao tác thanh toán một phần hoặc cập nhật nhiều bảng đều thực thi trong một SQLite Transaction nguyên tử.
3. **Tiền tệ VNĐ**: Sử dụng kiểu số nguyên `INTEGER` trong SQLite, loại bỏ sai số số thực.
4. **Không tạo bản ghi thanh toán giả**: Thao tác "Đánh dấu Đã trả" chỉ cập nhật `remaining_amount = 0` và `status = 'PAID'`, tuyệt đối không tự chèn bản ghi vào `payment_history` nếu người dùng không nhập số tiền thực trả.
5. **Bảo toàn lịch sử trả**: Khi sửa hoạt động, không cho phép sửa số tiền ban đầu nhỏ hơn tổng số tiền đã trả qua các đợt thanh toán.
6. **Cảnh báo xóa người**: Nếu người đó còn khoản nợ chưa thanh toán (`unpaid_total > 0`), hệ thống sẽ hiển thị cảnh báo chi tiết trước khi xác nhận xóa.
7. **Tính tổng nợ**: Chỉ tính các hoạt động có trạng thái `UNPAID`, loại bỏ các khoản đã trả.

---

## 4. Hướng dẫn chạy thử và kiểm thử

### Chạy kiểm thử tự động SQLite Logic (11 Kịch bản)
```bash
node scripts/test-sqlite-logic.mjs
```
Kiểm thử tự động xác minh:
- Tạo schema và kích hoạt Foreign Key ON.
- Thêm người theo 2 loại DEBTOR / CREDITOR.
- Chặn số tiền ban đầu <= 0.
- Thanh toán một phần nhiều lần (VD: Nợ 500k -> Trả 200k -> Trả tiếp 100k -> Trả hết 200k).
- Chặn số tiền trả vượt quá số nợ còn lại & kiểm tra rollback transaction.
- Chuyển tự động status thành PAID khi số dư = 0.
- Xác nhận "Đánh dấu Đã trả" không sinh payment giả.
- Chặn sửa số tiền nhỏ hơn số tiền đã trả.
- Tính tổng nợ loại trừ các khoản PAID.
- Cảnh báo người còn nợ chưa thanh toán khi xóa.
- Xóa người và kiểm tra CASCADE dọn dẹp dữ liệu con.

### Chạy thử giao diện trên trình duyệt (Web Development)
```bash
pnpm dev
```
Truy cập `http://localhost:3000`.

### Biên dịch & Đồng bộ sang Android
```bash
pnpm build:android
```
Lệnh này chạy `tsc -b && vite build` và tự động sync web assets cùng plugin `@capacitor-community/sqlite` sang thư mục Android.

### Build APK tự động bằng GitHub Actions (Không cần Android Studio)
Đẩy code lên GitHub:
```bash
git add .
git commit -m "feat: integrate SQLite database and business logic"
git push origin main
```
Truy cập tab **Actions** trên GitHub repository để tải file `app-debug.apk` về cài đặt trên điện thoại Android.
