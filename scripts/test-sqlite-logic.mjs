import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert';

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ SQLITE VÀ LOGIC NGHIỆP VỤ SỔ NỢ');
console.log('====================================================\n');

// 1. Khởi tạo In-Memory SQLite database với Schema chuẩn của dự án
const db = new DatabaseSync(':memory:');

db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('DEBTOR', 'CREDITOR')),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_people_type ON people(type);
CREATE INDEX idx_people_name ON people(name);

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

CREATE INDEX idx_debt_activities_person ON debt_activities(person_id);
CREATE INDEX idx_debt_activities_status ON debt_activities(status);
CREATE INDEX idx_debt_activities_date ON debt_activities(created_at);

CREATE TABLE payment_history (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  paid_at TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (activity_id) REFERENCES debt_activities (id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_history_activity ON payment_history(activity_id);
CREATE INDEX idx_payment_history_paid_at ON payment_history(paid_at);
`);

console.log('✅ Bước 1: Schema SQLite 3 bảng tạo thành công kèm Foreign Key ON.\n');

// 2. Kiểm thử: Thêm người (DEBTOR & CREDITOR)
console.log('🧪 Bước 2: Thêm người theo tab Con nợ và Chủ nợ...');
const insertPerson = db.prepare('INSERT INTO people (id, name, type, created_at) VALUES (?, ?, ?, ?)');
insertPerson.run('p-1', 'Nguyễn Văn An', 'DEBTOR', '2026-10-01T10:00:00Z');
insertPerson.run('p-2', 'Chị Lan Tạp Hóa', 'CREDITOR', '2026-10-02T10:00:00Z');

const people = db.prepare('SELECT * FROM people ORDER BY name').all();
assert.strictEqual(people.length, 2);
assert.strictEqual(people[0].name, 'Chị Lan Tạp Hóa');
assert.strictEqual(people[0].type, 'CREDITOR');
assert.strictEqual(people[1].name, 'Nguyễn Văn An');
assert.strictEqual(people[1].type, 'DEBTOR');
console.log('✅ Thêm người thành công với đúng phân loại DEBTOR / CREDITOR.\n');

// 3. Kiểm thử: Thêm hoạt động ban đầu (Validation: original_amount > 0)
console.log('🧪 Bước 3: Thêm hoạt động nợ (Kiểm tra số tiền nguyên dương)...');
const insertAct = db.prepare(`
  INSERT INTO debt_activities (id, person_id, description, created_at, original_amount, remaining_amount, status)
  VALUES (?, ?, ?, ?, ?, ?, 'UNPAID')
`);

// Thử thêm số tiền âm hoặc = 0 -> Phải bị chặn bởi CHECK constraint
assert.throws(() => {
  insertAct.run('act-fail', 'p-1', 'Khoản nợ lỗi', '2026-10-03T10:00:00Z', 0, 0);
}, /CHECK constraint failed/);

assert.throws(() => {
  insertAct.run('act-fail-2', 'p-1', 'Khoản nợ lỗi 2', '2026-10-03T10:00:00Z', -50000, -50000);
}, /CHECK constraint failed/);
console.log('✅ Database từ chối số tiền <= 0 đúng theo ràng buộc CHECK(original_amount > 0).');

// Thêm hoạt động hợp lệ: Nợ ban đầu 500.000 VNĐ
insertAct.run('act-1', 'p-1', 'Mượn tiền đóng học phí', '2026-10-03T10:00:00Z', 500000, 500000);
const act1 = db.prepare('SELECT * FROM debt_activities WHERE id = ?').get('act-1');
assert.strictEqual(act1.original_amount, 500000);
assert.strictEqual(act1.remaining_amount, 500000);
assert.strictEqual(act1.status, 'UNPAID');
console.log('✅ Tạo hoạt động ban đầu 500.000 VNĐ thành công.\n');

// 4. Kiểm thử: Thanh toán một phần nhiều lần trong Transaction
console.log('🧪 Bước 4: Thanh toán một phần nhiều lần...');
// Kịch bản theo yêu cầu:
// - Nợ ban đầu: 500.000 VNĐ
// - Trả lần 1: 200.000 VNĐ -> Còn nợ: 300.000 VNĐ
// - Trả tiếp: 100.000 VNĐ -> Còn nợ: 200.000 VNĐ

function recordPaymentInTransaction(activityId, amount, note) {
  assert(Number.isInteger(amount) && amount > 0, 'Số tiền phải là số nguyên > 0');
  
  // Mở transaction
  db.exec('BEGIN TRANSACTION');
  try {
    const act = db.prepare('SELECT remaining_amount, status FROM debt_activities WHERE id = ?').get(activityId);
    assert(act, 'Hoạt động không tồn tại');
    assert(amount <= act.remaining_amount, `Số tiền trả (${amount}) vượt quá số nợ còn lại (${act.remaining_amount})`);

    const newRemaining = act.remaining_amount - amount;
    const newStatus = newRemaining === 0 ? 'PAID' : 'UNPAID';

    // Insert payment_history
    const payId = 'pay-' + Math.random().toString(36).substring(2, 9);
    db.prepare('INSERT INTO payment_history (id, activity_id, amount, paid_at, note) VALUES (?, ?, ?, ?, ?)')
      .run(payId, activityId, amount, new Date().toISOString(), note || null);

    // Update debt_activities
    db.prepare('UPDATE debt_activities SET remaining_amount = ?, status = ? WHERE id = ?')
      .run(newRemaining, newStatus, activityId);

    db.exec('COMMIT');
    return { newRemaining, newStatus };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Trả lần 1: 200.000 VNĐ
const payStep1 = recordPaymentInTransaction('act-1', 200000, 'Chuyển khoản lần 1');
assert.strictEqual(payStep1.newRemaining, 300000);
assert.strictEqual(payStep1.newStatus, 'UNPAID');
console.log('  -> Trả lần 1: 200.000 VNĐ => Còn nợ: 300.000 VNĐ (UNPAID)');

// Trả lần 2: 100.000 VNĐ
const payStep2 = recordPaymentInTransaction('act-1', 100000, 'Tiền mặt lần 2');
assert.strictEqual(payStep2.newRemaining, 200000);
assert.strictEqual(payStep2.newStatus, 'UNPAID');
console.log('  -> Trả tiếp lần 2: 100.000 VNĐ => Còn nợ: 200.000 VNĐ (UNPAID)');

// Kiểm tra lịch sử thanh toán đã ghi đúng 2 bản ghi
const history1 = db.prepare('SELECT * FROM payment_history WHERE activity_id = ? ORDER BY paid_at ASC').all('act-1');
assert.strictEqual(history1.length, 2);
assert.strictEqual(history1[0].amount, 200000);
assert.strictEqual(history1[1].amount, 100000);
console.log('✅ Lịch sử payment_history ghi nhận chính xác 2 đợt thanh toán.\n');

// 5. Kiểm thử: Chặn số tiền thanh toán không hợp lệ (vượt số dư còn lại)
console.log('🧪 Bước 5: Kiểm tra validation thanh toán vượt số dư còn lại (200.000 VNĐ)...');
assert.throws(() => {
  recordPaymentInTransaction('act-1', 300000, 'Trả lố số tiền');
}, /vượt quá số nợ còn lại/);

// Kiểm tra số dư không bị thay đổi sau khi transaction rollback
const actAfterFailedPay = db.prepare('SELECT remaining_amount FROM debt_activities WHERE id = ?').get('act-1');
assert.strictEqual(actAfterFailedPay.remaining_amount, 200000);
console.log('✅ Transaction rollback hoàn hảo khi số tiền không hợp lệ.\n');

// 6. Kiểm thử: Thanh toán hết số dư còn lại (200.000 VNĐ)
console.log('🧪 Bước 6: Thanh toán hết số nợ còn lại (200.000 VNĐ)...');
const payStep3 = recordPaymentInTransaction('act-1', 200000, 'Thanh toán dứt điểm');
assert.strictEqual(payStep3.newRemaining, 0);
assert.strictEqual(payStep3.newStatus, 'PAID');

const actAfterFullyPaid = db.prepare('SELECT * FROM debt_activities WHERE id = ?').get('act-1');
assert.strictEqual(actAfterFullyPaid.remaining_amount, 0);
assert.strictEqual(actAfterFullyPaid.status, 'PAID');
console.log('✅ Khi số dư về 0, trạng thái tự động chuyển thành PAID.\n');

// 7. Kiểm thử: "Đánh dấu Đã trả" không tự tạo lịch sử thanh toán giả
console.log('🧪 Bước 7: Kiểm thử thao tác "Đánh dấu Đã trả" (Không tạo payment fake)...');
// Tạo thêm 1 hoạt động mới: 400.000 VNĐ
insertAct.run('act-2', 'p-1', 'Mua sách lập trình', '2026-10-04T10:00:00Z', 400000, 400000);

const countBeforeMark = db.prepare('SELECT COUNT(*) as c FROM payment_history WHERE activity_id = ?').get('act-2').c;
assert.strictEqual(countBeforeMark, 0);

// Thực hiện Đánh dấu Đã trả
db.prepare("UPDATE debt_activities SET remaining_amount = 0, status = 'PAID' WHERE id = ?").run('act-2');

const act2 = db.prepare('SELECT * FROM debt_activities WHERE id = ?').get('act-2');
assert.strictEqual(act2.remaining_amount, 0);
assert.strictEqual(act2.status, 'PAID');

// Xác nhận payment_history không có bản ghi giả nào!
const countAfterMark = db.prepare('SELECT COUNT(*) as c FROM payment_history WHERE activity_id = ?').get('act-2').c;
assert.strictEqual(countAfterMark, 0);
console.log('✅ "Đánh dấu Đã trả" cập nhật status = PAID thành công và TUYỆT ĐỐI KHÔNG sinh bản ghi payment giả!\n');

// 8. Kiểm thử: Không cho sửa hoạt động làm sai lệch lịch sử thanh toán
console.log('🧪 Bước 8: Kiểm tra quy tắc dữ liệu nhất quán khi sửa hoạt động...');
// act-1 ban đầu 500.000 VNĐ, đã thanh toán tổng cộng 500.000 VNĐ qua 3 lần trả
const totalPaidAct1 = db.prepare('SELECT SUM(amount) as s FROM payment_history WHERE activity_id = ?').get('act-1').s;
assert.strictEqual(totalPaidAct1, 500000);

// Giả sử người dùng muốn sửa số tiền ban đầu xuống 300.000 VNĐ (< 500.000 VNĐ đã trả)
function updateActivityAmount(activityId, newOriginalAmount) {
  const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM payment_history WHERE activity_id = ?').get(activityId).s;
  if (newOriginalAmount < totalPaid) {
    throw new Error(`Không thể sửa số tiền (${newOriginalAmount}) nhỏ hơn số tiền đã trả (${totalPaid})`);
  }
  const newRemaining = Math.max(0, newOriginalAmount - totalPaid);
  const newStatus = newRemaining === 0 ? 'PAID' : 'UNPAID';
  db.prepare('UPDATE debt_activities SET original_amount = ?, remaining_amount = ?, status = ? WHERE id = ?')
    .run(newOriginalAmount, newRemaining, newStatus, activityId);
}

assert.throws(() => {
  updateActivityAmount('act-1', 400000);
}, /nhỏ hơn số tiền đã trả/);
console.log('✅ Hệ thống chặn việc sửa số tiền nhỏ hơn số tiền đã trả để bảo toàn lịch sử thanh toán.\n');

// 9. Kiểm thử: Tính tổng nợ từ database, KHÔNG TÍNH CÁC KHOẢN ĐÃ TRẢ (PAID)
console.log('🧪 Bước 9: Tính tổng nợ chỉ từ các khoản UNPAID...');
// Thêm 1 khoản còn nợ: 150.000 VNĐ cho Nguyễn Văn An
insertAct.run('act-3', 'p-1', 'Tiền cà phê sáng', '2026-10-05T08:00:00Z', 150000, 150000);

const totalDebtRow = db.prepare(`
  SELECT COALESCE(SUM(remaining_amount), 0) as total
  FROM debt_activities
  WHERE person_id = 'p-1' AND status = 'UNPAID';
`).get();

// act-1 đã PAID (0), act-2 đã PAID (0), act-3 UNPAID (150.000)
assert.strictEqual(totalDebtRow.total, 150000);
console.log(`✅ Tổng nợ tính được: ${totalDebtRow.total} VNĐ (chỉ tính UNPAID, bỏ qua các khoản PAID).\n`);

// 10. Kiểm thử: Cảnh báo người còn nợ chưa thanh toán khi xóa
console.log('🧪 Bước 10: Kiểm tra cảnh báo người còn nợ khi xóa...');
const unpaidTotal = db.prepare(`
  SELECT COALESCE(SUM(remaining_amount), 0) as unpaid_total
  FROM debt_activities
  WHERE person_id = 'p-1' AND status = 'UNPAID';
`).get().unpaid_total;

assert.strictEqual(unpaidTotal, 150000);
console.log(`✅ Phát hiện người 'Nguyễn Văn An' còn ${unpaidTotal} VNĐ nợ chưa trả -> Kích hoạt cảnh báo thành công!\n`);

// 11. Kiểm thử: Xóa người (CASCADE xóa sạch các hoạt động và payment liên quan)
console.log('🧪 Bước 11: Xóa người và kiểm tra CASCADE...');
db.prepare('DELETE FROM people WHERE id = ?').run('p-1');

const remainingActs = db.prepare('SELECT COUNT(*) as c FROM debt_activities WHERE person_id = ?').get('p-1').c;
const remainingPays = db.prepare("SELECT COUNT(*) as c FROM payment_history WHERE activity_id IN ('act-1', 'act-2', 'act-3')").get().c;
assert.strictEqual(remainingActs, 0);
assert.strictEqual(remainingPays, 0);
console.log('✅ Foreign Key ON CASCADE hoạt động chuẩn xác: Đã dọn sạch activities và payment_history liên quan.\n');

console.log('====================================================');
console.log('🎉 TẤT CẢ 11 KỊCH BẢN KIỂM THỬ ĐỀU ĐẠT 100%!');
console.log('====================================================');
