import { dbManager } from '@/database/sqliteConnection';
import type { Debt, DebtFilter, FinancialSummary } from '@/types';

interface DebtRow {
  id: string;
  person_id: string;
  person_name: string;
  type: 'owe_me' | 'i_owe';
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  note: string | null;
  due_date: string | null;
  is_settled: number;
  created_at: string;
  updated_at: string;
}

export const debtRepository = {
  async getAll(filter?: Partial<DebtFilter>): Promise<Debt[]> {
    const today = new Date().toISOString().split('T')[0];
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filter?.type && filter.type !== 'all') {
      whereClauses.push('d.type = ?');
      params.push(filter.type);
    }

    if (filter?.personId) {
      whereClauses.push('d.person_id = ?');
      params.push(filter.personId);
    }

    if (filter?.status) {
      if (filter.status === 'active') {
        whereClauses.push('d.is_settled = 0');
      } else if (filter.status === 'settled') {
        whereClauses.push('d.is_settled = 1');
      } else if (filter.status === 'overdue') {
        whereClauses.push('d.is_settled = 0 AND d.due_date IS NOT NULL AND d.due_date < ?');
        params.push(today);
      }
    }

    if (filter?.searchQuery && filter.searchQuery.trim() !== '') {
      const q = `%${filter.searchQuery.trim()}%`;
      whereClauses.push('(p.name LIKE ? OR d.note LIKE ?)');
      params.push(q, q);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderSql = 'ORDER BY d.created_at DESC';
    if (filter?.sortBy) {
      switch (filter.sortBy) {
        case 'date_asc':
          orderSql = 'ORDER BY d.created_at ASC';
          break;
        case 'amount_desc':
          orderSql = 'ORDER BY d.amount DESC';
          break;
        case 'amount_asc':
          orderSql = 'ORDER BY d.amount ASC';
          break;
        case 'due_date':
          orderSql = 'ORDER BY CASE WHEN d.due_date IS NULL THEN 1 ELSE 0 END, d.due_date ASC';
          break;
        case 'date_desc':
        default:
          orderSql = 'ORDER BY d.created_at DESC';
          break;
      }
    }

    const sql = `
      SELECT 
        d.id,
        d.person_id,
        p.name AS person_name,
        d.type,
        d.amount,
        d.paid_amount,
        d.remaining_amount,
        d.note,
        d.due_date,
        d.is_settled,
        d.created_at,
        d.updated_at
      FROM debts d
      INNER JOIN people p ON d.person_id = p.id
      ${whereSql}
      ${orderSql};
    `;

    const rows = await dbManager.query<DebtRow>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      personId: r.person_id,
      personName: r.person_name,
      type: r.type,
      amount: r.amount,
      paidAmount: r.paid_amount,
      remainingAmount: r.remaining_amount,
      note: r.note || undefined,
      dueDate: r.due_date || undefined,
      isSettled: r.is_settled === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async getById(id: string): Promise<Debt | null> {
    const sql = `
      SELECT 
        d.id,
        d.person_id,
        p.name AS person_name,
        d.type,
        d.amount,
        d.paid_amount,
        d.remaining_amount,
        d.note,
        d.due_date,
        d.is_settled,
        d.created_at,
        d.updated_at
      FROM debts d
      INNER JOIN people p ON d.person_id = p.id
      WHERE d.id = ?;
    `;
    const rows = await dbManager.query<DebtRow>(sql, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      personId: r.person_id,
      personName: r.person_name,
      type: r.type,
      amount: r.amount,
      paidAmount: r.paid_amount,
      remainingAmount: r.remaining_amount,
      note: r.note || undefined,
      dueDate: r.due_date || undefined,
      isSettled: r.is_settled === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  async create(debt: {
    id: string;
    personId: string;
    type: 'owe_me' | 'i_owe';
    amount: number;
    note?: string;
    dueDate?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO debts (
        id, person_id, type, amount, paid_amount, remaining_amount, note, due_date, is_settled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?);
    `;
    await dbManager.run(sql, [
      debt.id,
      debt.personId,
      debt.type,
      debt.amount,
      debt.amount,
      debt.note?.trim() || null,
      debt.dueDate || null,
      now,
      now,
    ]);
  },

  async update(debt: {
    id: string;
    personId: string;
    type: 'owe_me' | 'i_owe';
    amount: number;
    note?: string;
    dueDate?: string;
  }): Promise<void> {
    const existing = await this.getById(debt.id);
    if (!existing) throw new Error('Debt not found');

    const paidAmount = existing.paidAmount;
    const remainingAmount = Math.max(0, debt.amount - paidAmount);
    const isSettled = remainingAmount <= 0 ? 1 : 0;
    const now = new Date().toISOString();

    const sql = `
      UPDATE debts 
      SET person_id = ?, type = ?, amount = ?, remaining_amount = ?, is_settled = ?, note = ?, due_date = ?, updated_at = ?
      WHERE id = ?;
    `;
    await dbManager.run(sql, [
      debt.personId,
      debt.type,
      debt.amount,
      remainingAmount,
      isSettled,
      debt.note?.trim() || null,
      debt.dueDate || null,
      now,
      debt.id,
    ]);
  },

  async updateSettlement(debtId: string, isSettled: boolean): Promise<void> {
    const debt = await this.getById(debtId);
    if (!debt) throw new Error('Debt not found');

    const now = new Date().toISOString();
    let newPaid = debt.paidAmount;
    let newRemaining = debt.remainingAmount;

    if (isSettled) {
      newPaid = debt.amount;
      newRemaining = 0;
    } else {
      newRemaining = Math.max(0, debt.amount - newPaid);
      if (newRemaining === 0) {
        newRemaining = debt.amount;
        newPaid = 0;
      }
    }

    const sql = `
      UPDATE debts 
      SET is_settled = ?, paid_amount = ?, remaining_amount = ?, updated_at = ?
      WHERE id = ?;
    `;
    await dbManager.run(sql, [isSettled ? 1 : 0, newPaid, newRemaining, now, debtId]);
  },

  async applyPayment(debtId: string, paymentAmount: number): Promise<void> {
    const debt = await this.getById(debtId);
    if (!debt) throw new Error('Debt not found');

    const newPaid = debt.paidAmount + paymentAmount;
    const newRemaining = Math.max(0, debt.amount - newPaid);
    const isSettled = newRemaining <= 0 ? 1 : 0;
    const now = new Date().toISOString();

    const sql = `
      UPDATE debts 
      SET paid_amount = ?, remaining_amount = ?, is_settled = ?, updated_at = ?
      WHERE id = ?;
    `;
    await dbManager.run(sql, [newPaid, newRemaining, isSettled, now, debtId]);
  },

  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM debts WHERE id = ?;`;
    await dbManager.run(sql, [id]);
  },

  async getFinancialSummary(): Promise<FinancialSummary> {
    const today = new Date().toISOString().split('T')[0];
    const sql = `
      SELECT 
        SUM(CASE WHEN type = 'owe_me' AND is_settled = 0 THEN remaining_amount ELSE 0 END) AS total_owe_me,
        SUM(CASE WHEN type = 'i_owe' AND is_settled = 0 THEN remaining_amount ELSE 0 END) AS total_i_owe,
        SUM(CASE WHEN type = 'owe_me' AND is_settled = 1 THEN amount ELSE paid_amount END) AS settled_owe_me,
        SUM(CASE WHEN type = 'i_owe' AND is_settled = 1 THEN amount ELSE paid_amount END) AS settled_i_owe,
        COUNT(CASE WHEN is_settled = 0 THEN 1 END) AS active_count,
        COUNT(CASE WHEN is_settled = 1 THEN 1 END) AS settled_count,
        COUNT(CASE WHEN is_settled = 0 AND due_date IS NOT NULL AND due_date < ? THEN 1 END) AS overdue_count
      FROM debts;
    `;

    interface SummaryRow {
      total_owe_me: number | null;
      total_i_owe: number | null;
      settled_owe_me: number | null;
      settled_i_owe: number | null;
      active_count: number | null;
      settled_count: number | null;
      overdue_count: number | null;
    }

    const rows = await dbManager.query<SummaryRow>(sql, [today]);
    const r = rows[0] || {};
    const totalOweMe = r.total_owe_me ?? 0;
    const totalIOwe = r.total_i_owe ?? 0;

    return {
      totalOweMe,
      totalIOwe,
      netBalance: totalOweMe - totalIOwe,
      totalSettledOweMe: r.settled_owe_me ?? 0,
      totalSettledIOwe: r.settled_i_owe ?? 0,
      activeDebtsCount: r.active_count ?? 0,
      settledDebtsCount: r.settled_count ?? 0,
      overdueCount: r.overdue_count ?? 0,
    };
  },
};
