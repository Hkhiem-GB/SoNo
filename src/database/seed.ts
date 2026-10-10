import { dbManager } from './sqliteConnection';

export async function seedInitialDataIfEmpty(): Promise<void> {
  const people = await dbManager.query<{ count: number }>(
    'SELECT COUNT(*) as count FROM people;'
  );

  if (people.length > 0 && people[0].count > 0) {
    return; // Already initialized with data
  }

  console.log('[Database] Seeding initial data for SQLite...');

  await dbManager.transaction(async () => {
    // 1. Seed People
    await dbManager.run(
      `INSERT INTO people (id, name, type, created_at) VALUES 
      ('p-1', 'Nguyễn Văn An', 'DEBTOR', '2026-10-01T10:00:00Z'),
      ('p-2', 'Trần Quốc Huy', 'DEBTOR', '2026-10-03T14:00:00Z'),
      ('p-3', 'Hoàng Minh Tuấn', 'CREDITOR', '2026-10-01T09:00:00Z'),
      ('p-4', 'Chị Lan Tạp Hóa', 'CREDITOR', '2026-10-09T18:00:00Z');`
    );

    // 2. Seed Debt Activities
    // Note: All amounts are INTEGER in VND
    await dbManager.run(
      `INSERT INTO debt_activities (id, person_id, description, created_at, original_amount, remaining_amount, status) VALUES 
      ('act-1', 'p-1', 'Ốc anh béo', '2026-10-10T12:00:00Z', 250000, 0, 'PAID'),
      ('act-2', 'p-1', 'Uống bia ở Cây Xanh', '2026-10-07T20:30:00Z', 300000, 300000, 'UNPAID'),
      ('act-3', 'p-2', 'Tiền ăn trưa bún bò', '2026-10-05T12:15:00Z', 60000, 60000, 'UNPAID'),
      ('act-4', 'p-3', 'Mượn đóng tiền nhà trọ', '2026-10-01T09:00:00Z', 1500000, 1500000, 'UNPAID'),
      ('act-5', 'p-4', 'Ghi sổ gạo và gia vị', '2026-10-09T18:00:00Z', 320000, 320000, 'UNPAID');`
    );

    // 3. Seed Payment History (only for actual payments made!)
    await dbManager.run(
      `INSERT INTO payment_history (id, activity_id, amount, paid_at, note) VALUES 
      ('pay-1', 'act-1', 250000, '2026-10-10T14:00:00Z', 'Thanh toán chuyển khoản MoMo');`
    );
  });

  console.log('[Database] Seed data inserted successfully into SQLite.');
}
