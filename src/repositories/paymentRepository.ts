import { dbManager } from '@/database/sqliteConnection';
import { debtRepository } from '@/repositories/debtRepository';
import type { Payment } from '@/types';

interface PaymentRow {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  note: string | null;
  created_at: string;
}

export const paymentRepository = {
  async getByDebtId(debtId: string): Promise<Payment[]> {
    const sql = `
      SELECT id, debt_id, amount, payment_date, note, created_at
      FROM payments
      WHERE debt_id = ?
      ORDER BY payment_date DESC, created_at DESC;
    `;
    const rows = await dbManager.query<PaymentRow>(sql, [debtId]);
    return rows.map((r) => ({
      id: r.id,
      debtId: r.debt_id,
      amount: r.amount,
      paymentDate: r.payment_date,
      note: r.note || undefined,
      createdAt: r.created_at,
    }));
  },

  async recordPayment(payment: {
    id: string;
    debtId: string;
    amount: number;
    paymentDate: string;
    note?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO payments (id, debt_id, amount, payment_date, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    await dbManager.run(sql, [
      payment.id,
      payment.debtId,
      payment.amount,
      payment.paymentDate,
      payment.note?.trim() || null,
      now,
    ]);

    // Update debt paid and remaining balance
    await debtRepository.applyPayment(payment.debtId, payment.amount);
  },

  async delete(paymentId: string): Promise<void> {
    const getSql = `SELECT debt_id, amount FROM payments WHERE id = ?;`;
    const rows = await dbManager.query<{ debt_id: string; amount: number }>(getSql, [paymentId]);
    if (rows.length === 0) return;

    const { debt_id, amount } = rows[0];
    const deleteSql = `DELETE FROM payments WHERE id = ?;`;
    await dbManager.run(deleteSql, [paymentId]);

    // Reverse payment amount on debt
    await debtRepository.applyPayment(debt_id, -amount);
  },
};
