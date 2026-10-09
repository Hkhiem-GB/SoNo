import { dbManager } from '@/database/sqliteConnection';
import type { Person } from '@/types';

interface PersonRow {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  total_owe_me: number | null;
  total_i_owe: number | null;
  active_count: number | null;
}

export const personRepository = {
  async getAll(): Promise<Person[]> {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.phone,
        p.note,
        p.created_at,
        p.updated_at,
        SUM(CASE WHEN d.type = 'owe_me' AND d.is_settled = 0 THEN d.remaining_amount ELSE 0 END) AS total_owe_me,
        SUM(CASE WHEN d.type = 'i_owe' AND d.is_settled = 0 THEN d.remaining_amount ELSE 0 END) AS total_i_owe,
        SUM(CASE WHEN d.is_settled = 0 THEN 1 ELSE 0 END) AS active_count
      FROM people p
      LEFT JOIN debts d ON p.id = d.person_id
      GROUP BY p.id
      ORDER BY p.name COLLATE NOCASE ASC;
    `;

    const rows = await dbManager.query<PersonRow>(sql);
    return rows.map((r) => {
      const oweMe = r.total_owe_me ?? 0;
      const iOwe = r.total_i_owe ?? 0;
      return {
        id: r.id,
        name: r.name,
        phone: r.phone || undefined,
        note: r.note || undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        totalOweMe: oweMe,
        totalIOwe: iOwe,
        netBalance: oweMe - iOwe,
        activeCount: r.active_count ?? 0,
      };
    });
  },

  async getById(id: string): Promise<Person | null> {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.phone,
        p.note,
        p.created_at,
        p.updated_at,
        SUM(CASE WHEN d.type = 'owe_me' AND d.is_settled = 0 THEN d.remaining_amount ELSE 0 END) AS total_owe_me,
        SUM(CASE WHEN d.type = 'i_owe' AND d.is_settled = 0 THEN d.remaining_amount ELSE 0 END) AS total_i_owe,
        SUM(CASE WHEN d.is_settled = 0 THEN 1 ELSE 0 END) AS active_count
      FROM people p
      LEFT JOIN debts d ON p.id = d.person_id
      WHERE p.id = ?
      GROUP BY p.id;
    `;
    const rows = await dbManager.query<PersonRow>(sql, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    const oweMe = r.total_owe_me ?? 0;
    const iOwe = r.total_i_owe ?? 0;
    return {
      id: r.id,
      name: r.name,
      phone: r.phone || undefined,
      note: r.note || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      totalOweMe: oweMe,
      totalIOwe: iOwe,
      netBalance: oweMe - iOwe,
      activeCount: r.active_count ?? 0,
    };
  },

  async create(person: { id: string; name: string; phone?: string; note?: string }): Promise<void> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO people (id, name, phone, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    await dbManager.run(sql, [
      person.id,
      person.name.trim(),
      person.phone?.trim() || null,
      person.note?.trim() || null,
      now,
      now,
    ]);
  },

  async update(person: { id: string; name: string; phone?: string; note?: string }): Promise<void> {
    const now = new Date().toISOString();
    const sql = `
      UPDATE people 
      SET name = ?, phone = ?, note = ?, updated_at = ?
      WHERE id = ?;
    `;
    await dbManager.run(sql, [
      person.name.trim(),
      person.phone?.trim() || null,
      person.note?.trim() || null,
      now,
      person.id,
    ]);
  },

  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM people WHERE id = ?;`;
    await dbManager.run(sql, [id]);
  },
};
