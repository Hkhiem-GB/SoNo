export interface StoredPerson {
  id: string;
  name: string;
  type: 'DEBTOR' | 'CREDITOR';
  created_at: string;
}

export interface StoredActivity {
  id: string;
  person_id: string;
  description: string;
  created_at: string;
  original_amount: number;
  remaining_amount: number;
  status: 'UNPAID' | 'PAID';
}

export interface StoredPayment {
  id: string;
  activity_id: string;
  amount: number;
  paid_at: string;
  note?: string | null;
}

interface LocalDatabaseState {
  people: StoredPerson[];
  debt_activities: StoredActivity[];
  payment_history: StoredPayment[];
  settings: Record<string, string>;
}

const STORAGE_KEY = 'sono_offline_local_db_v1';

export class WebStorageFallback {
  private static instance: WebStorageFallback;
  private state: LocalDatabaseState;

  private constructor() {
    this.state = this.loadFromStorage();
  }

  public static getInstance(): WebStorageFallback {
    if (!WebStorageFallback.instance) {
      WebStorageFallback.instance = new WebStorageFallback();
    }
    return WebStorageFallback.instance;
  }

  private loadFromStorage(): LocalDatabaseState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('[WebFallback] Failed to load localStorage:', e);
    }
    return {
      people: [],
      debt_activities: [],
      payment_history: [],
      settings: {},
    };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('[WebFallback] Failed to save localStorage:', e);
    }
  }

  public query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    const cleanSql = sql.trim();

    // 1. SELECT COUNT(*) as count FROM people
    if (/SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+people/i.test(cleanSql)) {
      return [{ count: this.state.people.length }] as unknown as T[];
    }

    // 2. Query single person by ID with aggregates
    if (/FROM\s+people\s+p[\s\S]*WHERE\s+p\.id\s*=\s*\?/i.test(cleanSql)) {
      const personId = String(params[0]);
      const p = this.state.people.find((x) => x.id === personId);
      if (!p) return [] as T[];

      const pActs = this.state.debt_activities.filter((a) => a.person_id === personId);
      const unpaidActs = pActs.filter((a) => a.status === 'UNPAID');
      const totalRemaining = unpaidActs.reduce((sum, a) => sum + (Number(a.remaining_amount) || 0), 0);
      const row = {
        id: p.id,
        name: p.name,
        type: p.type,
        created_at: p.created_at,
        total_remaining: totalRemaining,
        activities_count: pActs.length,
        unpaid_count: unpaidActs.length,
      };
      return [row] as unknown as T[];
    }

    // 3. Query all people with aggregates (optionally filtered by type)
    if (/FROM\s+people\s+p[\s\S]*LEFT\s+JOIN\s+debt_activities/i.test(cleanSql)) {
      let filtered = [...this.state.people];
      if (/WHERE\s+p\.type\s*=\s*\?/i.test(cleanSql) && params.length > 0) {
        const filterType = String(params[0]).toUpperCase();
        filtered = filtered.filter((p) => p.type.toUpperCase() === filterType);
      }

      // Sort by name NOCASE
      filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      const rows = filtered.map((p) => {
        const pActs = this.state.debt_activities.filter((a) => a.person_id === p.id);
        const unpaidActs = pActs.filter((a) => a.status === 'UNPAID');
        const totalRemaining = unpaidActs.reduce((sum, a) => sum + (Number(a.remaining_amount) || 0), 0);
        return {
          id: p.id,
          name: p.name,
          type: p.type,
          created_at: p.created_at,
          total_remaining: totalRemaining,
          activities_count: pActs.length,
          unpaid_count: unpaidActs.length,
        };
      });

      return rows as unknown as T[];
    }

    // 4. Query single debt activity by ID
    if (/FROM\s+debt_activities\s+da[\s\S]*WHERE\s+da\.id\s*=\s*\?/i.test(cleanSql)) {
      const actId = String(params[0]);
      const act = this.state.debt_activities.find((a) => a.id === actId);
      if (!act) return [] as T[];

      const payments = this.state.payment_history.filter((ph) => ph.activity_id === actId);
      const totalPaid = payments.reduce((sum, ph) => sum + (Number(ph.amount) || 0), 0);

      const row = {
        id: act.id,
        person_id: act.person_id,
        description: act.description,
        created_at: act.created_at,
        original_amount: act.original_amount,
        remaining_amount: act.remaining_amount,
        status: act.status,
        total_paid: totalPaid,
      };
      return [row] as unknown as T[];
    }

    // 5. Query activities by person_id
    if (/FROM\s+debt_activities\s+da[\s\S]*WHERE\s+da\.person_id\s*=\s*\?/i.test(cleanSql)) {
      const personId = String(params[0]);
      const acts = this.state.debt_activities.filter((a) => a.person_id === personId);
      acts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const rows = acts.map((act) => {
        const payments = this.state.payment_history.filter((ph) => ph.activity_id === act.id);
        const totalPaid = payments.reduce((sum, ph) => sum + (Number(ph.amount) || 0), 0);
        return {
          id: act.id,
          person_id: act.person_id,
          description: act.description,
          created_at: act.created_at,
          original_amount: act.original_amount,
          remaining_amount: act.remaining_amount,
          status: act.status,
          total_paid: totalPaid,
        };
      });

      return rows as unknown as T[];
    }

    // 6. Query payment history for activity
    if (/FROM\s+payment_history[\s\S]*WHERE\s+activity_id\s*=\s*\?/i.test(cleanSql)) {
      const actId = String(params[0]);
      const payments = this.state.payment_history.filter((ph) => ph.activity_id === actId);
      payments.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
      return payments as unknown as T[];
    }

    // 7. Query all payment history
    if (/FROM\s+payment_history/i.test(cleanSql)) {
      const payments = [...this.state.payment_history];
      payments.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
      return payments as unknown as T[];
    }

    // 8. Query unpaid total for person
    if (/SELECT\s+COALESCE\(SUM\(remaining_amount\),\s*0\)\s+AS\s+unpaid_total\s+FROM\s+debt_activities\s+WHERE\s+person_id\s*=\s*\?\s+AND\s+status\s*=\s*'UNPAID'/i.test(cleanSql)) {
      const personId = String(params[0]);
      const unpaidActs = this.state.debt_activities.filter((a) => a.person_id === personId && a.status === 'UNPAID');
      const sum = unpaidActs.reduce((acc, a) => acc + (Number(a.remaining_amount) || 0), 0);
      return [{ unpaid_total: sum }] as unknown as T[];
    }

    // 9. Query total remaining by type
    if (/FROM\s+debt_activities\s+da\s+INNER\s+JOIN\s+people\s+p[\s\S]*WHERE\s+p\.type\s*=\s*\?\s+AND\s+da\.status\s*=\s*'UNPAID'/i.test(cleanSql)) {
      const type = String(params[0]).toUpperCase();
      const peopleIds = new Set(this.state.people.filter((p) => p.type.toUpperCase() === type).map((p) => p.id));
      const unpaidActs = this.state.debt_activities.filter((a) => peopleIds.has(a.person_id) && a.status === 'UNPAID');
      const sum = unpaidActs.reduce((acc, a) => acc + (Number(a.remaining_amount) || 0), 0);
      return [{ total: sum }] as unknown as T[];
    }

    // 10. Settings query
    if (/SELECT\s+value\s+FROM\s+settings\s+WHERE\s+key\s*=\s*\?/i.test(cleanSql)) {
      const key = String(params[0]);
      const val = this.state.settings[key];
      if (val !== undefined) {
        return [{ value: val }] as unknown as T[];
      }
      return [] as T[];
    }

    if (/SELECT\s+key,\s*value\s+FROM\s+settings/i.test(cleanSql)) {
      const rows = Object.entries(this.state.settings).map(([k, v]) => ({ key: k, value: v }));
      return rows as unknown as T[];
    }

    // Backup queries
    if (/SELECT\s+id,\s*name,\s*type,\s*created_at\s+FROM\s+people/i.test(cleanSql)) {
      return [...this.state.people] as unknown as T[];
    }

    if (/SELECT\s+id,\s*person_id,\s*description,\s*created_at,\s*original_amount,\s*remaining_amount,\s*status\s+FROM\s+debt_activities/i.test(cleanSql)) {
      return [...this.state.debt_activities] as unknown as T[];
    }

    return [] as T[];
  }

  public run(sql: string, params: unknown[] = []): { changes: number; lastId?: number } {
    const cleanSql = sql.trim();

    // 1. INSERT INTO people
    if (/INSERT\s+INTO\s+people/i.test(cleanSql)) {
      if (params.length >= 4) {
        const [id, name, type, created_at] = params;
        this.state.people.push({
          id: String(id),
          name: String(name).trim(),
          type: (String(type).toUpperCase() === 'CREDITOR' ? 'CREDITOR' : 'DEBTOR'),
          created_at: String(created_at),
        });
        this.saveToStorage();
        return { changes: 1 };
      }
    }

    // 2. UPDATE people name
    if (/UPDATE\s+people\s+SET\s+name\s*=\s*\?\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
      const [newName, id] = params;
      const p = this.state.people.find((x) => x.id === String(id));
      if (p) {
        p.name = String(newName).trim();
        this.saveToStorage();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 3. DELETE FROM people
    if (/DELETE\s+FROM\s+people\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
      const id = String(params[0]);
      this.state.people = this.state.people.filter((p) => p.id !== id);
      // Cascade delete activities
      const actsToDelete = this.state.debt_activities.filter((a) => a.person_id === id).map((a) => a.id);
      this.state.debt_activities = this.state.debt_activities.filter((a) => a.person_id !== id);
      this.state.payment_history = this.state.payment_history.filter((ph) => !actsToDelete.includes(ph.activity_id));
      this.saveToStorage();
      return { changes: 1 };
    }

    // 4. INSERT INTO debt_activities
    if (/INSERT\s+INTO\s+debt_activities/i.test(cleanSql)) {
      if (params.length >= 6) {
        const [id, person_id, description, created_at, original_amount, remaining_amount, status] = params;
        this.state.debt_activities.push({
          id: String(id),
          person_id: String(person_id),
          description: String(description).trim(),
          created_at: String(created_at),
          original_amount: Math.round(Number(original_amount)),
          remaining_amount: Math.round(Number(remaining_amount)),
          status: String(status || 'UNPAID').toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID',
        });
        this.saveToStorage();
        return { changes: 1 };
      }
    }

    // 5. UPDATE debt_activities (full or partial)
    if (/UPDATE\s+debt_activities\s+SET\s+description\s*=\s*\?/i.test(cleanSql)) {
      const [desc, date, orig, rem, status, id] = params;
      const act = this.state.debt_activities.find((a) => a.id === String(id));
      if (act) {
        act.description = String(desc).trim();
        act.created_at = String(date);
        act.original_amount = Math.round(Number(orig));
        act.remaining_amount = Math.round(Number(rem));
        act.status = String(status).toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID';
        this.saveToStorage();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 6. UPDATE debt_activities remaining_amount and status (payments)
    if (/UPDATE\s+debt_activities\s+SET\s+remaining_amount\s*=\s*\?,\s*status\s*=\s*\?\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
      const [rem, status, id] = params;
      const act = this.state.debt_activities.find((a) => a.id === String(id));
      if (act) {
        act.remaining_amount = Math.round(Number(rem));
        act.status = String(status).toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID';
        this.saveToStorage();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 7. Mark as paid
    if (/UPDATE\s+debt_activities\s+SET\s+remaining_amount\s*=\s*0,\s*status\s*=\s*'PAID'\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
      const id = String(params[0]);
      const act = this.state.debt_activities.find((a) => a.id === id);
      if (act) {
        act.remaining_amount = 0;
        act.status = 'PAID';
        this.saveToStorage();
        return { changes: 1 };
      }
      return { changes: 0 };
    }

    // 8. DELETE FROM debt_activities
    if (/DELETE\s+FROM\s+debt_activities\s+WHERE\s+id\s*=\s*\?/i.test(cleanSql)) {
      const id = String(params[0]);
      this.state.debt_activities = this.state.debt_activities.filter((a) => a.id !== id);
      this.state.payment_history = this.state.payment_history.filter((ph) => ph.activity_id !== id);
      this.saveToStorage();
      return { changes: 1 };
    }

    // 9. INSERT INTO payment_history
    if (/INSERT\s+INTO\s+payment_history/i.test(cleanSql)) {
      if (params.length >= 4) {
        const [id, activity_id, amount, paid_at, note] = params;
        this.state.payment_history.push({
          id: String(id),
          activity_id: String(activity_id),
          amount: Math.round(Number(amount)),
          paid_at: String(paid_at),
          note: note ? String(note).trim() : null,
        });
        this.saveToStorage();
        return { changes: 1 };
      }
    }

    // 10. Settings insert / update
    if (/INSERT\s+INTO\s+settings/i.test(cleanSql)) {
      const [key, value] = params;
      this.state.settings[String(key)] = String(value);
      this.saveToStorage();
      return { changes: 1 };
    }

    // 11. Delete all for restore
    if (/DELETE\s+FROM\s+payment_history;/i.test(cleanSql)) {
      this.state.payment_history = [];
      this.saveToStorage();
      return { changes: 1 };
    }
    if (/DELETE\s+FROM\s+debt_activities;/i.test(cleanSql)) {
      this.state.debt_activities = [];
      this.saveToStorage();
      return { changes: 1 };
    }
    if (/DELETE\s+FROM\s+people;/i.test(cleanSql)) {
      this.state.people = [];
      this.saveToStorage();
      return { changes: 1 };
    }

    return { changes: 0 };
  }

  public execute(sql: string): void {
    const stmts = sql.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
    for (const stmt of stmts) {
      this.run(stmt);
    }
  }

  public seedDemoIfEmpty(): void {
    // Fresh install mode: No demo data is inserted.
  }
}

