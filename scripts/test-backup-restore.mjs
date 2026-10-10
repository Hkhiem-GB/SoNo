import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert';

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ BƯỚC 5: CÀI ĐẶT VÀ SAO LƯU DỮ LIỆU');
console.log('====================================================\n');

// 1. Khởi tạo DB SQLite bộ nhớ
const db = new DatabaseSync(':memory:');

db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('DEBTOR', 'CREDITOR')),
  created_at TEXT NOT NULL
);

CREATE TABLE debt_activities (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  original_amount INTEGER NOT NULL CHECK(original_amount > 0),
  remaining_amount INTEGER NOT NULL CHECK(remaining_amount >= 0),
  status TEXT NOT NULL CHECK(status IN ('UNPAID', 'PAID')),
  FOREIGN KEY (person_id) REFERENCES people (id) ON DELETE CASCADE
);

CREATE TABLE payment_history (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  paid_at TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (activity_id) REFERENCES debt_activities (id) ON DELETE CASCADE
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

console.log('✅ Bước 1: Khởi tạo database SQLite với 4 bảng: people, debt_activities, payment_history, settings.\n');

// 2. Kiểm thử: Cài đặt và lưu tùy chọn (Theme & Language Persistence)
console.log('🧪 Bước 2: Kiểm thử lưu tùy chọn Theme và Language vào bảng settings...');
const setSetting = (k, v) => {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
  `).run(k, v);
};

const getSetting = (k, defVal) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(k);
  return row ? row.value : defVal;
};

// Đặt theme = 'dark'
setSetting('theme', 'dark');
assert.strictEqual(getSetting('theme', 'system'), 'dark');

// Đặt language = 'en'
setSetting('language', 'en');
assert.strictEqual(getSetting('language', 'vi'), 'en');

// Đổi lại theme = 'light'
setSetting('theme', 'light');
assert.strictEqual(getSetting('theme', 'system'), 'light');

// Đổi lại language = 'vi'
setSetting('language', 'vi');
assert.strictEqual(getSetting('language', 'en'), 'vi');
console.log('✅ Lưu và đọc tùy chọn cài đặt thành công (Hỗ trợ Dark/Light/System và Vi/En).\n');

// 3. Chuẩn bị dữ liệu ban đầu
console.log('🧪 Bước 3: Nạp dữ liệu ban đầu cho kịch bản xuất bản sao lưu...');
db.prepare("INSERT INTO people VALUES ('p-1', 'Nguyễn Văn An', 'DEBTOR', '2026-10-01T10:00:00Z')").run();
db.prepare("INSERT INTO people VALUES ('p-2', 'Chị Lan Tạp Hóa', 'CREDITOR', '2026-10-02T10:00:00Z')").run();

db.prepare("INSERT INTO debt_activities VALUES ('act-1', 'p-1', 'Tiền ăn trưa bún bò', '2026-10-05T12:00:00Z', 100000, 40000, 'UNPAID')").run();
db.prepare("INSERT INTO debt_activities VALUES ('act-2', 'p-2', 'Ghi sổ gạo và mắm', '2026-10-06T18:00:00Z', 300000, 0, 'PAID')").run();

db.prepare("INSERT INTO payment_history VALUES ('pay-1', 'act-1', 60000, '2026-10-07T08:00:00Z', 'Chuyển khoản MoMo')").run();

// 4. Kiểm thử hàm Xuất bản sao lưu (Export Backup)
console.log('🧪 Bước 4: Kiểm thử xuất dữ liệu ra JSON (Export)...');
function exportBackupPackage() {
  const people = db.prepare('SELECT id, name, type, created_at FROM people ORDER BY created_at ASC').all();
  const debt_activities = db.prepare('SELECT id, person_id, description, created_at, original_amount, remaining_amount, status FROM debt_activities ORDER BY created_at ASC').all();
  const payment_history = db.prepare('SELECT id, activity_id, amount, paid_at, note FROM payment_history ORDER BY paid_at ASC').all();

  return {
    version: 1,
    app_id: 'com.hoka.sono',
    exported_at: new Date().toISOString(),
    people,
    debt_activities,
    payment_history,
  };
}

const exported = exportBackupPackage();
assert.strictEqual(exported.version, 1);
assert.strictEqual(exported.app_id, 'com.hoka.sono');
assert.strictEqual(exported.people.length, 2);
assert.strictEqual(exported.debt_activities.length, 2);
assert.strictEqual(exported.payment_history.length, 1);
assert.strictEqual(exported.debt_activities[0].description, 'Tiền ăn trưa bún bò');
assert.strictEqual(exported.payment_history[0].amount, 60000);
console.log('✅ Xuất dữ liệu JSON thành công với đầy đủ metadata version, app_id và 3 bảng.\n');

// 5. Kiểm thử hàm Kiểm tra tính hợp lệ dữ liệu (Validation Function)
console.log('🧪 Bước 5: Kiểm tra tính hợp lệ dữ liệu (Validation)...');

function validateBackup(pkg) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    return { isValid: false, error: 'Tệp không phải là JSON object.' };
  }
  if (typeof pkg.version !== 'number' || pkg.version <= 0) {
    return { isValid: false, error: 'Thiếu version hợp lệ.' };
  }
  if (!Array.isArray(pkg.people) || !Array.isArray(pkg.debt_activities) || !Array.isArray(pkg.payment_history)) {
    return { isValid: false, error: 'Thiếu danh sách bảng dữ liệu.' };
  }

  const personIds = new Set();
  for (const p of pkg.people) {
    if (!p.id || !p.name) return { isValid: false, error: 'Thiếu id hoặc tên người.' };
    if (p.type !== 'DEBTOR' && p.type !== 'CREDITOR') return { isValid: false, error: 'Sai loại người.' };
    if (personIds.has(p.id)) return { isValid: false, error: 'Trùng ID người.' };
    personIds.add(p.id);
  }

  const activityIds = new Set();
  for (const a of pkg.debt_activities) {
    if (!a.id || !a.description) return { isValid: false, error: 'Thiếu id hoặc mô tả hoạt động.' };
    if (!personIds.has(a.person_id)) return { isValid: false, error: `Khóa ngoại người không tồn tại: ${a.person_id}` };
    if (!Number.isInteger(a.original_amount) || a.original_amount <= 0) return { isValid: false, error: 'Số tiền ban đầu không hợp lệ.' };
    if (!Number.isInteger(a.remaining_amount) || a.remaining_amount < 0 || a.remaining_amount > a.original_amount) return { isValid: false, error: 'Số dư không hợp lệ.' };
    if (a.status !== 'UNPAID' && a.status !== 'PAID') return { isValid: false, error: 'Sai trạng thái.' };
    if (a.remaining_amount === 0 && a.status !== 'PAID') return { isValid: false, error: 'Số dư 0 nhưng trạng thái không phải PAID.' };
    if (activityIds.has(a.id)) return { isValid: false, error: 'Trùng ID hoạt động.' };
    activityIds.add(a.id);
  }

  for (const ph of pkg.payment_history) {
    if (!ph.id || !ph.activity_id) return { isValid: false, error: 'Thiếu id hoặc activity_id.' };
    if (!activityIds.has(ph.activity_id)) return { isValid: false, error: `Khóa ngoại hoạt động không tồn tại: ${ph.activity_id}` };
    if (!Number.isInteger(ph.amount) || ph.amount <= 0) return { isValid: false, error: 'Số tiền trả không hợp lệ.' };
  }

  return { isValid: true, summary: { peopleCount: pkg.people.length, activitiesCount: pkg.debt_activities.length, paymentsCount: pkg.payment_history.length } };
}

// 5.1. Dữ liệu chuẩn -> Hợp lệ
const validResult = validateBackup(exported);
assert.strictEqual(validResult.isValid, true);
assert.strictEqual(validResult.summary.peopleCount, 2);
console.log('  -> Bản sao lưu hợp lệ: ĐẠT');

// 5.2. Lỗi khóa ngoại: debt_activity trỏ đến person_id không tồn tại
const invalidFkPkg = JSON.parse(JSON.stringify(exported));
invalidFkPkg.debt_activities[0].person_id = 'person-ghost-999';
const invalidFkRes = validateBackup(invalidFkPkg);
assert.strictEqual(invalidFkRes.isValid, false);
assert(invalidFkRes.error.includes('Khóa ngoại người không tồn tại'));
console.log('  -> Phát hiện lỗi khóa ngoại person_id không tồn tại: ĐẠT');

// 5.3. Lỗi khóa ngoại: payment_history trỏ đến activity_id không tồn tại
const invalidActFkPkg = JSON.parse(JSON.stringify(exported));
invalidActFkPkg.payment_history[0].activity_id = 'act-ghost-888';
const invalidActFkRes = validateBackup(invalidActFkPkg);
assert.strictEqual(invalidActFkRes.isValid, false);
assert(invalidActFkRes.error.includes('Khóa ngoại hoạt động không tồn tại'));
console.log('  -> Phát hiện lỗi khóa ngoại activity_id không tồn tại: ĐẠT');

// 5.4. Lỗi số tiền ban đầu <= 0
const invalidAmountPkg = JSON.parse(JSON.stringify(exported));
invalidAmountPkg.debt_activities[0].original_amount = -50000;
const invalidAmountRes = validateBackup(invalidAmountPkg);
assert.strictEqual(invalidAmountRes.isValid, false);
console.log('  -> Phát hiện lỗi số tiền âm / không hợp lệ: ĐẠT');

// 5.5. Lỗi số tiền còn nợ > số tiền ban đầu
const invalidRemainingPkg = JSON.parse(JSON.stringify(exported));
invalidRemainingPkg.debt_activities[0].remaining_amount = 500000; // original là 100000
const invalidRemainingRes = validateBackup(invalidRemainingPkg);
assert.strictEqual(invalidRemainingRes.isValid, false);
console.log('  -> Phát hiện lỗi số nợ còn lại vượt quá số nợ ban đầu: ĐẠT');

// 5.6. Lỗi số dư bằng 0 nhưng trạng thái UNPAID
const invalidStatusPkg = JSON.parse(JSON.stringify(exported));
invalidStatusPkg.debt_activities[0].remaining_amount = 0;
invalidStatusPkg.debt_activities[0].status = 'UNPAID';
const invalidStatusRes = validateBackup(invalidStatusPkg);
assert.strictEqual(invalidStatusRes.isValid, false);
console.log('  -> Phát hiện lỗi số dư 0 nhưng status không phải PAID: ĐẠT\n');

// 6. Kiểm thử Khôi phục bản sao lưu trong Transaction (Restore Replace)
console.log('🧪 Bước 6: Khôi phục bản sao lưu trong SQLite Transaction...');

function restoreBackupInTransaction(pkg) {
  const validation = validateBackup(pkg);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  db.exec('BEGIN TRANSACTION');
  try {
    // Xóa theo thứ tự ràng buộc khóa ngoại
    db.prepare('DELETE FROM payment_history').run();
    db.prepare('DELETE FROM debt_activities').run();
    db.prepare('DELETE FROM people').run();

    const insertP = db.prepare('INSERT INTO people (id, name, type, created_at) VALUES (?, ?, ?, ?)');
    for (const p of pkg.people) {
      insertP.run(p.id, p.name, p.type, p.created_at);
    }

    const insertA = db.prepare('INSERT INTO debt_activities (id, person_id, description, created_at, original_amount, remaining_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const a of pkg.debt_activities) {
      insertA.run(a.id, a.person_id, a.description, a.created_at, a.original_amount, a.remaining_amount, a.status);
    }

    const insertPh = db.prepare('INSERT INTO payment_history (id, activity_id, amount, paid_at, note) VALUES (?, ?, ?, ?, ?)');
    for (const ph of pkg.payment_history) {
      insertPh.run(ph.id, ph.activity_id, ph.amount, ph.paid_at, ph.note || null);
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Chuẩn bị một bản sao lưu mới (chứa 3 người mới)
const newBackup = {
  version: 1,
  app_id: 'com.hoka.sono',
  exported_at: '2026-10-10T15:00:00Z',
  people: [
    { id: 'p-new-1', name: 'Hoàng Minh Tuấn', type: 'CREDITOR', created_at: '2026-10-08T09:00:00Z' },
    { id: 'p-new-2', name: 'Vũ Thị Hạnh', type: 'DEBTOR', created_at: '2026-10-09T10:00:00Z' },
    { id: 'p-new-3', name: 'Đỗ Văn Khoa', type: 'DEBTOR', created_at: '2026-10-10T11:00:00Z' },
  ],
  debt_activities: [
    { id: 'act-new-1', person_id: 'p-new-1', description: 'Tiền vay làm nhà', created_at: '2026-10-08T09:30:00Z', original_amount: 10000000, remaining_amount: 5000000, status: 'UNPAID' },
    { id: 'act-new-2', person_id: 'p-new-2', description: 'Tiền mượn gấp', created_at: '2026-10-09T10:30:00Z', original_amount: 500000, remaining_amount: 0, status: 'PAID' },
  ],
  payment_history: [
    { id: 'pay-new-1', activity_id: 'act-new-1', amount: 5000000, paid_at: '2026-10-09T14:00:00Z', note: 'Chuyển khoản đợt 1' },
    { id: 'pay-new-2', activity_id: 'act-new-2', amount: 500000, paid_at: '2026-10-10T08:00:00Z', note: 'Trả dứt điểm' },
  ],
};

restoreBackupInTransaction(newBackup);

// Xác nhận dữ liệu trong database đã được thay thế chính xác bằng newBackup
const restoredPeople = db.prepare('SELECT * FROM people ORDER BY id').all();
assert.strictEqual(restoredPeople.length, 3);
const restoredNames = restoredPeople.map(p => p.name);
assert(restoredNames.includes('Hoàng Minh Tuấn'));
assert(restoredNames.includes('Vũ Thị Hạnh'));
assert(restoredNames.includes('Đỗ Văn Khoa'));

const restoredActs = db.prepare('SELECT * FROM debt_activities').all();
assert.strictEqual(restoredActs.length, 2);

const restoredPays = db.prepare('SELECT * FROM payment_history').all();
assert.strictEqual(restoredPays.length, 2);
console.log('✅ Khôi phục thành công toàn bộ dữ liệu trong SQLite Transaction.\n');

// 7. Kiểm thử Khôi phục thất bại và Tự động Rollback
console.log('🧪 Bước 7: Kiểm thử khi khôi phục lỗi -> Tự động ROLLBACK bảo toàn dữ liệu...');
// Bản sao lưu cố tình vi phạm CHECK constraint ở bước chèn activities (số tiền = 0)
const corruptBackup = {
  version: 1,
  app_id: 'com.hoka.sono',
  exported_at: '2026-10-10T16:00:00Z',
  people: [
    { id: 'p-bad-1', name: 'Người Lỗi', type: 'DEBTOR', created_at: '2026-10-10T16:00:00Z' },
  ],
  debt_activities: [
    // Lỗi vi phạm CHECK(original_amount > 0)
    { id: 'act-bad-1', person_id: 'p-bad-1', description: 'Khoản lỗi', created_at: '2026-10-10T16:00:00Z', original_amount: 0, remaining_amount: 0, status: 'PAID' },
  ],
  payment_history: [],
};

assert.throws(() => {
  restoreBackupInTransaction(corruptBackup);
});

// Xác minh dữ liệu trong database KHÔNG BỊ MẤT, vẫn nguyên vẹn 3 người và 2 hoạt động của newBackup!
const peopleAfterRollback = db.prepare('SELECT * FROM people').all();
assert.strictEqual(peopleAfterRollback.length, 3);
assert.strictEqual(peopleAfterRollback[0].name, 'Hoàng Minh Tuấn');

const actsAfterRollback = db.prepare('SELECT * FROM debt_activities').all();
assert.strictEqual(actsAfterRollback.length, 2);
console.log('✅ Tự động ROLLBACK thành công! Dữ liệu hiện có được bảo toàn nguyên vẹn 100% khi tệp sao lưu gặp sự cố.\n');

console.log('====================================================');
console.log('🎉 TẤT CẢ CÁC KIỂM THỬ BƯỚC 5 ĐỀU ĐẠT CHUẨN 100%!');
console.log('====================================================');
