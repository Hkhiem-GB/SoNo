import { dbManager } from '@/database/sqliteConnection';
import { APP_CONFIG } from '@/config/appConfig';
import { seedInitialDataIfEmpty } from '@/database/seed';

function sanitizeString(val: string): string {
  if (!val) return '';
  return val.replace(/<[^>]*>?/gm, '').trim();
}

export interface BackupPerson {
  id: string;
  name: string;
  type: 'DEBTOR' | 'CREDITOR';
  created_at: string;
}

export interface BackupDebtActivity {
  id: string;
  person_id: string;
  description: string;
  created_at: string;
  original_amount: number;
  remaining_amount: number;
  status: 'UNPAID' | 'PAID';
}

export interface BackupPaymentHistory {
  id: string;
  activity_id: string;
  amount: number;
  paid_at: string;
  note?: string | null;
}

export interface BackupPackage {
  version: number;
  app_id: string;
  exported_at: string;
  people: BackupPerson[];
  debt_activities: BackupDebtActivity[];
  payment_history: BackupPaymentHistory[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  summary?: {
    peopleCount: number;
    activitiesCount: number;
    paymentsCount: number;
    exportedAt: string;
    version: number;
  };
  data?: BackupPackage;
}

export const backupService = {
  /**
   * Export all data to JSON string conforming to Step 5 specification
   */
  async exportData(): Promise<BackupPackage> {
    const people = await dbManager.query<BackupPerson>(
      'SELECT id, name, type, created_at FROM people ORDER BY created_at ASC;'
    );
    const debt_activities = await dbManager.query<BackupDebtActivity>(
      'SELECT id, person_id, description, created_at, original_amount, remaining_amount, status FROM debt_activities ORDER BY created_at ASC;'
    );
    const payment_history = await dbManager.query<BackupPaymentHistory>(
      'SELECT id, activity_id, amount, paid_at, note FROM payment_history ORDER BY paid_at ASC;'
    );

    const backup: BackupPackage = {
      version: 1,
      app_id: APP_CONFIG.appId,
      exported_at: new Date().toISOString(),
      people: people.map((p) => ({
        id: String(p.id),
        name: String(p.name).trim(),
        type: (String(p.type).toUpperCase() === 'CREDITOR' ? 'CREDITOR' : 'DEBTOR') as 'DEBTOR' | 'CREDITOR',
        created_at: String(p.created_at),
      })),
      debt_activities: debt_activities.map((da) => ({
        id: String(da.id),
        person_id: String(da.person_id),
        description: String(da.description).trim(),
        created_at: String(da.created_at),
        original_amount: Math.round(Number(da.original_amount)),
        remaining_amount: Math.round(Number(da.remaining_amount)),
        status: (String(da.status).toUpperCase() === 'PAID' ? 'PAID' : 'UNPAID') as 'UNPAID' | 'PAID',
      })),
      payment_history: payment_history.map((ph) => ({
        id: String(ph.id),
        activity_id: String(ph.activity_id),
        amount: Math.round(Number(ph.amount)),
        paid_at: String(ph.paid_at),
        note: ph.note ? String(ph.note).trim() : null,
      })),
    };

    return backup;
  },

  /**
   * Triggers file download or native Android share sheet for the exported backup JSON
   */
  async downloadOrShareBackup(): Promise<{ fileName: string; method: 'share' | 'download' }> {
    const backup = await this.exportData();
    const jsonString = JSON.stringify(backup, null, 2);
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0];
    const fileName = `sono_backup_${timestamp}.json`;

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

    // 1. Check if native Web Share API with files is available (ideal on Android WebView)
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const file = new File([blob], fileName, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Sổ Nợ - Bản sao lưu ${timestamp}`,
            text: `Bản sao lưu dữ liệu Sổ Nợ ngày ${now.toLocaleDateString('vi-VN')}`,
          });
          return { fileName, method: 'share' };
        }
      } catch (err: unknown) {
        // If user cancelled the share dialog, do not trigger fallback download
        if (err instanceof Error && err.name === 'AbortError') {
          return { fileName, method: 'share' };
        }
        console.warn('[Backup] Share API failed, falling back to download:', err);
      }
    }

    // 2. Standard browser / WebView file download fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);

    return { fileName, method: 'download' };
  },

  /**
   * Deeply validates the structure, foreign keys, IDs, amounts, and statuses of a backup JSON file
   */
  validateBackup(jsonString: string): ValidationResult {
    // 0. Security checks: size limit (5MB) & Prototype Pollution prevention
    if (jsonString.length > 5 * 1024 * 1024) {
      return { isValid: false, error: 'Kích thước tệp sao lưu vượt quá giới hạn an toàn (tối đa 5MB).' };
    }

    if (
      jsonString.includes('"__proto__"') ||
      jsonString.includes('"constructor"') ||
      jsonString.includes('"prototype"')
    ) {
      return { isValid: false, error: 'Tệp sao lưu chứa thuộc tính không hợp lệ hoặc không an toàn.' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { isValid: false, error: 'Định dạng tệp không phải là JSON hợp lệ.' };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { isValid: false, error: 'Tệp sao lưu phải là một đối tượng JSON hợp lệ.' };
    }

    const pkg = parsed as Record<string, unknown>;

    // 1. Version check
    if (typeof pkg.version !== 'number' || pkg.version <= 0) {
      return { isValid: false, error: 'Thiếu hoặc sai số phiên bản dữ liệu (version).' };
    }

    // 2. Array checks
    if (!Array.isArray(pkg.people)) {
      return { isValid: false, error: 'Thiếu danh sách người (people).' };
    }
    if (!Array.isArray(pkg.debt_activities)) {
      return { isValid: false, error: 'Thiếu danh sách hoạt động nợ (debt_activities).' };
    }
    if (!Array.isArray(pkg.payment_history)) {
      return { isValid: false, error: 'Thiếu danh sách lịch sử thanh toán (payment_history).' };
    }

    // 3. Validate people items
    const personIds = new Set<string>();
    for (let i = 0; i < pkg.people.length; i++) {
      const p = pkg.people[i] as Record<string, unknown>;
      if (!p.id || typeof p.id !== 'string') {
        return { isValid: false, error: `Người thứ ${i + 1} bị thiếu mã định danh (id).` };
      }
      if (!p.name || typeof p.name !== 'string' || !p.name.trim()) {
        return { isValid: false, error: `Người có ID "${p.id}" bị thiếu tên.` };
      }
      const type = String(p.type).toUpperCase();
      if (type !== 'DEBTOR' && type !== 'CREDITOR') {
        return { isValid: false, error: `Người "${p.name}" có loại không hợp lệ (phải là DEBTOR hoặc CREDITOR).` };
      }
      if (personIds.has(p.id)) {
        return { isValid: false, error: `Trùng lặp mã người (id: ${p.id}).` };
      }
      personIds.add(p.id);
    }

    // 4. Validate debt_activities items
    const activityIds = new Set<string>();
    for (let i = 0; i < pkg.debt_activities.length; i++) {
      const a = pkg.debt_activities[i] as Record<string, unknown>;
      if (!a.id || typeof a.id !== 'string') {
        return { isValid: false, error: `Hoạt động thứ ${i + 1} bị thiếu mã định danh (id).` };
      }
      if (!a.person_id || typeof a.person_id !== 'string') {
        return { isValid: false, error: `Hoạt động "${a.id}" thiếu mã người liên kết (person_id).` };
      }
      // Foreign Key check: person_id must exist in people
      if (!personIds.has(a.person_id)) {
        return {
          isValid: false,
          error: `Hoạt động "${a.id}" tham chiếu đến người không tồn tại (person_id: ${a.person_id}).`,
        };
      }
      if (!a.description || typeof a.description !== 'string' || !a.description.trim()) {
        return { isValid: false, error: `Hoạt động "${a.id}" thiếu mô tả nội dung.` };
      }

      const origAmount = Number(a.original_amount);
      if (!Number.isInteger(origAmount) || origAmount <= 0) {
        return { isValid: false, error: `Hoạt động "${a.description}" có số tiền ban đầu không hợp lệ (> 0 VNĐ).` };
      }

      const remAmount = Number(a.remaining_amount);
      if (!Number.isInteger(remAmount) || remAmount < 0 || remAmount > origAmount) {
        return { isValid: false, error: `Hoạt động "${a.description}" có số tiền còn nợ không hợp lệ (0 <= nợ <= ${origAmount}).` };
      }

      const status = String(a.status).toUpperCase();
      if (status !== 'UNPAID' && status !== 'PAID') {
        return { isValid: false, error: `Hoạt động "${a.description}" có trạng thái không hợp lệ (UNPAID hoặc PAID).` };
      }

      if (remAmount === 0 && status !== 'PAID') {
        return { isValid: false, error: `Hoạt động "${a.description}" có số dư 0 VNĐ nhưng trạng thái chưa là PAID.` };
      }

      if (activityIds.has(a.id)) {
        return { isValid: false, error: `Trùng lặp mã hoạt động (id: ${a.id}).` };
      }
      activityIds.add(a.id);
    }

    // 5. Validate payment_history items
    for (let i = 0; i < pkg.payment_history.length; i++) {
      const ph = pkg.payment_history[i] as Record<string, unknown>;
      if (!ph.id || typeof ph.id !== 'string') {
        return { isValid: false, error: `Lần thanh toán thứ ${i + 1} thiếu mã định danh (id).` };
      }
      if (!ph.activity_id || typeof ph.activity_id !== 'string') {
        return { isValid: false, error: `Lần thanh toán "${ph.id}" thiếu mã hoạt động liên kết.` };
      }
      // Foreign Key check: activity_id must exist in debt_activities
      if (!activityIds.has(ph.activity_id)) {
        return {
          isValid: false,
          error: `Lần thanh toán "${ph.id}" tham chiếu đến hoạt động không tồn tại (activity_id: ${ph.activity_id}).`,
        };
      }
      const payAmount = Number(ph.amount);
      if (!Number.isInteger(payAmount) || payAmount <= 0) {
        return { isValid: false, error: `Lần thanh toán "${ph.id}" có số tiền không hợp lệ (> 0 VNĐ).` };
      }
    }

    const data = pkg as unknown as BackupPackage;

    return {
      isValid: true,
      summary: {
        peopleCount: data.people.length,
        activitiesCount: data.debt_activities.length,
        paymentsCount: data.payment_history.length,
        exportedAt: String(data.exported_at || ''),
        version: Number(data.version || 1),
      },
      data,
    };
  },

  /**
   * Restores data from a validated BackupPackage inside an atomic SQLite transaction.
   * If any step errors, rolls back automatically preserving original database.
   */
  async restoreBackup(backup: BackupPackage): Promise<void> {
    await dbManager.transaction(async () => {
      // 1. Wipe existing data in foreign-key safe order
      await dbManager.execute('DELETE FROM payment_history;');
      await dbManager.execute('DELETE FROM debt_activities;');
      await dbManager.execute('DELETE FROM people;');

      // 2. Insert people
      for (const p of backup.people) {
        await dbManager.run(
          'INSERT INTO people (id, name, type, created_at) VALUES (?, ?, ?, ?);',
          [p.id, sanitizeString(p.name), p.type.toUpperCase(), p.created_at]
        );
      }

      // 3. Insert debt_activities
      for (const da of backup.debt_activities) {
        await dbManager.run(
          `INSERT INTO debt_activities (id, person_id, description, created_at, original_amount, remaining_amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            da.id,
            da.person_id,
            sanitizeString(da.description),
            da.created_at,
            Math.round(da.original_amount),
            Math.round(da.remaining_amount),
            da.status.toUpperCase(),
          ]
        );
      }

      // 4. Insert payment_history
      for (const ph of backup.payment_history) {
        await dbManager.run(
          `INSERT INTO payment_history (id, activity_id, amount, paid_at, note)
           VALUES (?, ?, ?, ?, ?);`,
          [
            ph.id,
            ph.activity_id,
            Math.round(ph.amount),
            ph.paid_at,
            ph.note ? sanitizeString(ph.note) : null,
          ]
        );
      }
    });
  },

  /**
   * Seed demo test data if needed
   */
  async seedDemoDataIfEmpty(): Promise<boolean> {
    await seedInitialDataIfEmpty();
    return true;
  },
};
