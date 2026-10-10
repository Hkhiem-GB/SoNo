import { dbManager } from '@/database/sqliteConnection';
import type { PaymentHistoryItem } from '@/types';
import { generateId } from '@/utils/id';

interface PaymentSqlRow {
  id: string;
  activity_id: string;
  amount: number;
  paid_at: string;
  note: string | null;
}

export const paymentRepository = {
  /**
   * Record a partial or full payment for an activity inside an atomic SQLite transaction.
   *
   * Business Rules:
   * 1. Payment amount must be integer > 0.
   * 2. Payment amount must not exceed remaining_amount.
   * 3. Insert record into payment_history.
   * 4. Update remaining_amount = remaining_amount - amount.
   * 5. If new remaining_amount == 0, update status to 'PAID'.
   * 6. Both operations must occur in the SAME transaction.
   */
  async recordPayment(
    activityId: string,
    amount: number,
    note?: string
  ): Promise<{ newRemaining: number; isFullyPaid: boolean }> {
    const intAmount = Math.round(amount);
    if (intAmount <= 0) {
      throw new Error('Số tiền thanh toán phải là số nguyên dương lớn hơn 0.');
    }

    return await dbManager.transaction(async () => {
      // 1. Fetch current activity details within transaction
      const rows = await dbManager.query<{
        id: string;
        remaining_amount: number;
        original_amount: number;
        status: string;
      }>(
        'SELECT id, remaining_amount, original_amount, status FROM debt_activities WHERE id = ?;',
        [activityId]
      );

      if (rows.length === 0) {
        throw new Error('Không tìm thấy hoạt động nợ.');
      }

      const activity = rows[0];
      const currentRemaining = Math.round(activity.remaining_amount);

      if (activity.status === 'PAID' || currentRemaining <= 0) {
        throw new Error('Khoản nợ này đã được thanh toán toàn bộ trước đó.');
      }

      if (intAmount > currentRemaining) {
        throw new Error(
          `Số tiền thanh toán (${intAmount.toLocaleString('vi-VN')} VNĐ) không được vượt quá số nợ còn lại (${currentRemaining.toLocaleString('vi-VN')} VNĐ).`
        );
      }

      const newRemaining = Math.max(0, currentRemaining - intAmount);
      const isFullyPaid = newRemaining === 0;
      const newStatus = isFullyPaid ? 'PAID' : 'UNPAID';
      const paymentId = generateId();
      const paidAt = new Date().toISOString();

      // 2. Insert record into payment_history
      await dbManager.run(
        `INSERT INTO payment_history (id, activity_id, amount, paid_at, note)
         VALUES (?, ?, ?, ?, ?);`,
        [paymentId, activityId, intAmount, paidAt, note?.trim() || null]
      );

      // 3. Update debt_activities remaining_amount and status
      await dbManager.run(
        `UPDATE debt_activities
         SET remaining_amount = ?, status = ?
         WHERE id = ?;`,
        [newRemaining, newStatus, activityId]
      );

      return {
        newRemaining,
        isFullyPaid,
      };
    });
  },

  /**
   * Get payment history for a specific activity
   */
  async getByActivityId(activityId: string): Promise<PaymentHistoryItem[]> {
    const sql = `
      SELECT id, activity_id, amount, paid_at, note
      FROM payment_history
      WHERE activity_id = ?
      ORDER BY paid_at DESC;
    `;
    const rows = await dbManager.query<PaymentSqlRow>(sql, [activityId]);
    return rows.map((r) => ({
      id: r.id,
      activityId: r.activity_id,
      amount: Math.round(r.amount),
      paidAt: r.paid_at,
      note: r.note || undefined,
    }));
  },

  /**
   * Get all payments across the entire system
   */
  async getAll(): Promise<PaymentHistoryItem[]> {
    const sql = `
      SELECT id, activity_id, amount, paid_at, note
      FROM payment_history
      ORDER BY paid_at DESC;
    `;
    const rows = await dbManager.query<PaymentSqlRow>(sql);
    return rows.map((r) => ({
      id: r.id,
      activityId: r.activity_id,
      amount: Math.round(r.amount),
      paidAt: r.paid_at,
      note: r.note || undefined,
    }));
  },
};
