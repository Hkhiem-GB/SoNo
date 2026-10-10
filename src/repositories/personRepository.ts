import { dbManager } from '@/database/sqliteConnection';
import type { Person, DbPersonType, PersonType } from '@/types';

interface PersonSqlRow {
  id: string;
  name: string;
  type: string;
  created_at: string;
  total_remaining: number | null;
  activities_count: number | null;
  unpaid_count: number | null;
}

export function normalizePersonType(type: PersonType): DbPersonType {
  const upper = type.toUpperCase();
  return upper === 'CREDITOR' ? 'CREDITOR' : 'DEBTOR';
}

export const personRepository = {
  /**
   * Get all people with aggregated debt calculations directly from SQLite.
   * Only calculates remaining debt for activities that are UNPAID.
   */
  async getAll(filterType?: PersonType): Promise<Person[]> {
    let whereClause = '';
    const params: unknown[] = [];

    if (filterType) {
      whereClause = 'WHERE p.type = ?';
      params.push(normalizePersonType(filterType));
    }

    const sql = `
      SELECT 
        p.id,
        p.name,
        p.type,
        p.created_at,
        COALESCE(SUM(CASE WHEN da.status = 'UNPAID' THEN da.remaining_amount ELSE 0 END), 0) AS total_remaining,
        COUNT(da.id) AS activities_count,
        COALESCE(SUM(CASE WHEN da.status = 'UNPAID' THEN 1 ELSE 0 END), 0) AS unpaid_count
      FROM people p
      LEFT JOIN debt_activities da ON p.id = da.person_id
      ${whereClause}
      GROUP BY p.id, p.name, p.type, p.created_at
      ORDER BY p.name COLLATE NOCASE ASC;
    `;

    const rows = await dbManager.query<PersonSqlRow>(sql, params);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type === 'CREDITOR' ? 'creditor' : 'debtor',
      createdAt: r.created_at,
      totalRemaining: Math.round(r.total_remaining ?? 0),
      activitiesCount: Number(r.activities_count ?? 0),
      unpaidCount: Number(r.unpaid_count ?? 0),
    }));
  },

  /**
   * Get a single person by ID with aggregated figures
   */
  async getById(id: string): Promise<Person | null> {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.type,
        p.created_at,
        COALESCE(SUM(CASE WHEN da.status = 'UNPAID' THEN da.remaining_amount ELSE 0 END), 0) AS total_remaining,
        COUNT(da.id) AS activities_count,
        COALESCE(SUM(CASE WHEN da.status = 'UNPAID' THEN 1 ELSE 0 END), 0) AS unpaid_count
      FROM people p
      LEFT JOIN debt_activities da ON p.id = da.person_id
      WHERE p.id = ?
      GROUP BY p.id, p.name, p.type, p.created_at;
    `;

    const rows = await dbManager.query<PersonSqlRow>(sql, [id]);
    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      type: r.type === 'CREDITOR' ? 'creditor' : 'debtor',
      createdAt: r.created_at,
      totalRemaining: Math.round(r.total_remaining ?? 0),
      activitiesCount: Number(r.activities_count ?? 0),
      unpaidCount: Number(r.unpaid_count ?? 0),
    };
  },

  /**
   * Calculate total remaining unpaid amount for a person (for deletion warning)
   */
  async getUnpaidTotal(personId: string): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(remaining_amount), 0) AS unpaid_total
      FROM debt_activities
      WHERE person_id = ? AND status = 'UNPAID';
    `;
    const rows = await dbManager.query<{ unpaid_total: number }>(sql, [personId]);
    return Math.round(rows[0]?.unpaid_total ?? 0);
  },

  /**
   * Calculate total remaining debt from DB for DEBTOR or CREDITOR
   * Excludes PAID activities.
   */
  async getTotalRemainingByType(type: PersonType): Promise<number> {
    const dbType = normalizePersonType(type);
    const sql = `
      SELECT COALESCE(SUM(da.remaining_amount), 0) AS total
      FROM debt_activities da
      INNER JOIN people p ON da.person_id = p.id
      WHERE p.type = ? AND da.status = 'UNPAID';
    `;
    const rows = await dbManager.query<{ total: number }>(sql, [dbType]);
    return Math.round(rows[0]?.total ?? 0);
  },

  /**
   * Create a new person
   */
  async create(data: { id: string; name: string; type: PersonType; createdAt?: string }): Promise<void> {
    const dbType = normalizePersonType(data.type);
    const createdAt = data.createdAt || new Date().toISOString();
    const sql = `
      INSERT INTO people (id, name, type, created_at)
      VALUES (?, ?, ?, ?);
    `;
    await dbManager.run(sql, [data.id, data.name.trim(), dbType, createdAt]);
  },

  /**
   * Update person name
   */
  async updateName(id: string, newName: string): Promise<void> {
    const sql = `UPDATE people SET name = ? WHERE id = ?;`;
    await dbManager.run(sql, [newName.trim(), id]);
  },

  /**
   * Delete person (cascades to debt_activities and payment_history)
   */
  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM people WHERE id = ?;`;
    await dbManager.run(sql, [id]);
  },
};
