import { dbManager } from '@/database/sqliteConnection';
import type { Activity, ActivityStatus } from '@/types';

interface ActivitySqlRow {
  id: string;
  person_id: string;
  description: string;
  created_at: string;
  original_amount: number;
  remaining_amount: number;
  status: string;
  total_paid: number | null;
}

export const debtActivityRepository = {
  /**
   * Get all activities for a person, sorted by created_at DESC (newest first).
   * Also aggregates total paid amount from payment_history.
   */
  async getByPersonId(personId: string): Promise<Activity[]> {
    const sql = `
      SELECT 
        da.id,
        da.person_id,
        da.description,
        da.created_at,
        da.original_amount,
        da.remaining_amount,
        da.status,
        COALESCE(SUM(ph.amount), 0) AS total_paid
      FROM debt_activities da
      LEFT JOIN payment_history ph ON da.id = ph.activity_id
      WHERE da.person_id = ?
      GROUP BY da.id, da.person_id, da.description, da.created_at, da.original_amount, da.remaining_amount, da.status
      ORDER BY da.created_at DESC;
    `;

    const rows = await dbManager.query<ActivitySqlRow>(sql, [personId]);

    return rows.map((r) => {
      const isPaid = r.status === 'PAID';
      const originalAmount = Math.round(r.original_amount);
      const remainingAmount = Math.round(r.remaining_amount);
      const paidAmount = Math.round(r.total_paid ?? 0);

      return {
        id: r.id,
        personId: r.person_id,
        title: r.description,
        description: r.description,
        amount: originalAmount,
        paidAmount,
        remainingAmount,
        date: r.created_at,
        isPaid,
        status: (r.status as ActivityStatus) || (isPaid ? 'PAID' : 'UNPAID'),
        createdAt: r.created_at,
      };
    });
  },

  /**
   * Get single activity by ID
   */
  async getById(id: string): Promise<Activity | null> {
    const sql = `
      SELECT 
        da.id,
        da.person_id,
        da.description,
        da.created_at,
        da.original_amount,
        da.remaining_amount,
        da.status,
        COALESCE(SUM(ph.amount), 0) AS total_paid
      FROM debt_activities da
      LEFT JOIN payment_history ph ON da.id = ph.activity_id
      WHERE da.id = ?
      GROUP BY da.id, da.person_id, da.description, da.created_at, da.original_amount, da.remaining_amount, da.status;
    `;

    const rows = await dbManager.query<ActivitySqlRow>(sql, [id]);
    if (rows.length === 0) return null;

    const r = rows[0];
    const isPaid = r.status === 'PAID';
    return {
      id: r.id,
      personId: r.person_id,
      title: r.description,
      description: r.description,
      amount: Math.round(r.original_amount),
      paidAmount: Math.round(r.total_paid ?? 0),
      remainingAmount: Math.round(r.remaining_amount),
      date: r.created_at,
      isPaid,
      status: (r.status as ActivityStatus) || (isPaid ? 'PAID' : 'UNPAID'),
      createdAt: r.created_at,
    };
  },

  /**
   * Add a new debt activity.
   * original_amount must be a positive integer (> 0).
   */
  async create(data: {
    id: string;
    personId: string;
    description: string;
    amount: number;
    date?: string;
  }): Promise<void> {
    const intAmount = Math.round(data.amount);
    if (intAmount <= 0) {
      throw new Error('Số tiền ban đầu phải là số nguyên dương lớn hơn 0.');
    }

    const date = data.date || new Date().toISOString();
    const sql = `
      INSERT INTO debt_activities (id, person_id, description, created_at, original_amount, remaining_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, 'UNPAID');
    `;

    await dbManager.run(sql, [
      data.id,
      data.personId,
      data.description.trim(),
      date,
      intAmount,
      intAmount,
    ]);
  },

  /**
   * Update activity description and/or original_amount.
   * Consistency rule: Cannot reduce original_amount to less than already paid amount!
   */
  async update(
    id: string,
    data: { description?: string; amount?: number; date?: string }
  ): Promise<void> {
    const activity = await this.getById(id);
    if (!activity) {
      throw new Error('Không tìm thấy hoạt động nợ.');
    }

    const newDescription = data.description !== undefined ? data.description.trim() : activity.title;
    const newDate = data.date !== undefined ? data.date : activity.date;

    let newOriginalAmount = activity.amount;
    let newRemainingAmount = activity.remainingAmount;
    let newStatus: ActivityStatus = activity.status;

    if (data.amount !== undefined) {
      const intAmount = Math.round(data.amount);
      if (intAmount <= 0) {
        throw new Error('Số tiền phải là số nguyên dương lớn hơn 0.');
      }

      // Check if new amount is lower than already paid amount
      if (intAmount < activity.paidAmount) {
        throw new Error(
          `Không thể sửa số tiền nhỏ hơn số tiền đã thanh toán (${activity.paidAmount.toLocaleString('vi-VN')} VNĐ).`
        );
      }

      newOriginalAmount = intAmount;
      // Recalculate remaining amount: original - paid
      newRemainingAmount = Math.max(0, newOriginalAmount - activity.paidAmount);
      newStatus = newRemainingAmount === 0 ? 'PAID' : 'UNPAID';
    }

    const sql = `
      UPDATE debt_activities
      SET description = ?, created_at = ?, original_amount = ?, remaining_amount = ?, status = ?
      WHERE id = ?;
    `;

    await dbManager.run(sql, [
      newDescription,
      newDate,
      newOriginalAmount,
      newRemainingAmount,
      newStatus,
      id,
    ]);
  },

  /**
   * Mark activity as PAID.
   * Requirement: Sets remaining_amount = 0 and status = 'PAID'.
   * DO NOT insert fake records into payment_history!
   */
  async markAsPaid(id: string): Promise<void> {
    const sql = `
      UPDATE debt_activities
      SET remaining_amount = 0, status = 'PAID'
      WHERE id = ?;
    `;
    await dbManager.run(sql, [id]);
  },

  /**
   * Delete activity. SQLite foreign keys will cascade delete related payment_history.
   */
  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM debt_activities WHERE id = ?;`;
    await dbManager.run(sql, [id]);
  },
};
