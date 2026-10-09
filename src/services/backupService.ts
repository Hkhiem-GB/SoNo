import { dbManager } from '@/database/sqliteConnection';
import { generateId } from '@/utils/id';

export interface BackupData {
  version: number;
  exportedAt: string;
  people: Array<{
    id: string;
    name: string;
    phone?: string | null;
    note?: string | null;
    created_at: string;
    updated_at: string;
  }>;
  debts: Array<{
    id: string;
    person_id: string;
    type: 'owe_me' | 'i_owe';
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    note?: string | null;
    due_date?: string | null;
    is_settled: number;
    created_at: string;
    updated_at: string;
  }>;
  payments: Array<{
    id: string;
    debt_id: string;
    amount: number;
    payment_date: string;
    note?: string | null;
    created_at: string;
  }>;
}

export const backupService = {
  async exportData(): Promise<string> {
    const people = await dbManager.query<BackupData['people'][0]>('SELECT * FROM people;');
    const debts = await dbManager.query<BackupData['debts'][0]>('SELECT * FROM debts;');
    const payments = await dbManager.query<BackupData['payments'][0]>('SELECT * FROM payments;');

    const data: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      people,
      debts,
      payments,
    };

    return JSON.stringify(data, null, 2);
  },

  async importData(jsonContent: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonContent) as BackupData;
      if (!data.people || !data.debts) {
        throw new Error('Dữ liệu sao lưu không hợp lệ.');
      }

      await dbManager.execute('DELETE FROM payments;');
      await dbManager.execute('DELETE FROM debts;');
      await dbManager.execute('DELETE FROM people;');

      for (const p of data.people) {
        await dbManager.run(
          'INSERT INTO people (id, name, phone, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
          [p.id, p.name, p.phone || null, p.note || null, p.created_at, p.updated_at],
        );
      }

      for (const d of data.debts) {
        await dbManager.run(
          `INSERT INTO debts (
            id, person_id, type, amount, paid_amount, remaining_amount, note, due_date, is_settled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            d.id,
            d.person_id,
            d.type,
            d.amount,
            d.paid_amount,
            d.remaining_amount,
            d.note || null,
            d.due_date || null,
            d.is_settled,
            d.created_at,
            d.updated_at,
          ],
        );
      }

      if (data.payments) {
        for (const py of data.payments) {
          await dbManager.run(
            'INSERT INTO payments (id, debt_id, amount, payment_date, note, created_at) VALUES (?, ?, ?, ?, ?, ?);',
            [py.id, py.debt_id, py.amount, py.payment_date, py.note || null, py.created_at],
          );
        }
      }

      return true;
    } catch (e) {
      console.error('[Backup] Import failed:', e);
      throw e;
    }
  },

  async seedDemoDataIfEmpty(): Promise<boolean> {
    const people = await dbManager.query('SELECT COUNT(*) as count FROM people;');
    const count = (people[0] as { count: number })?.count ?? 0;
    if (count > 0) return false;

    const now = new Date();
    const todayStr = now.toISOString();
    const futureDate = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const pastDate = new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0];

    const p1 = generateId();
    const p2 = generateId();
    const p3 = generateId();

    await dbManager.run(
      'INSERT INTO people (id, name, phone, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
      [p1, 'Nguyễn Văn An', '0901234567', 'Đồng nghiệp công ty', todayStr, todayStr],
    );
    await dbManager.run(
      'INSERT INTO people (id, name, phone, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
      [p2, 'Trần Thị Mai', '0987654321', 'Bạn học đại học', todayStr, todayStr],
    );
    await dbManager.run(
      'INSERT INTO people (id, name, phone, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);',
      [p3, 'Lê Hoàng Nam', '0912349876', 'Cửa hàng tạp hóa', todayStr, todayStr],
    );

    // Debt 1: An nợ tôi 1,500,000 VND
    const d1 = generateId();
    await dbManager.run(
      `INSERT INTO debts (id, person_id, type, amount, paid_amount, remaining_amount, note, due_date, is_settled, created_at, updated_at)
       VALUES (?, ?, 'owe_me', 1500000, 500000, 1000000, 'Tiền ăn trưa và cafe tháng này', ?, 0, ?, ?);`,
      [d1, p1, futureDate, todayStr, todayStr],
    );

    // Payment for d1
    await dbManager.run(
      `INSERT INTO payments (id, debt_id, amount, payment_date, note, created_at)
       VALUES (?, ?, 500000, ?, 'Đã chuyển khoản trước 500k', ?);`,
      [generateId(), d1, pastDate, todayStr],
    );

    // Debt 2: Tôi nợ Mai 500,000 VND
    const d2 = generateId();
    await dbManager.run(
      `INSERT INTO debts (id, person_id, type, amount, paid_amount, remaining_amount, note, due_date, is_settled, created_at, updated_at)
       VALUES (?, ?, 'i_owe', 500000, 0, 500000, 'Mượn mua sách công nghệ', ?, 0, ?, ?);`,
      [d2, p2, futureDate, todayStr, todayStr],
    );

    // Debt 3: Nam nợ tôi 3,000,000 VND (Quá hạn)
    const d3 = generateId();
    await dbManager.run(
      `INSERT INTO debts (id, person_id, type, amount, paid_amount, remaining_amount, note, due_date, is_settled, created_at, updated_at)
       VALUES (?, ?, 'owe_me', 3000000, 0, 3000000, 'Tiền mượn gấp việc gia đình', ?, 0, ?, ?);`,
      [d3, p3, pastDate, todayStr, todayStr],
    );

    return true;
  },
};
