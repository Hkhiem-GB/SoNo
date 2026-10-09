import { dbManager } from '@/database/sqliteConnection';
import type { AppSettings, Language, ThemeMode } from '@/types';

export const settingsRepository = {
  async get(key: string, defaultValue = ''): Promise<string> {
    const sql = `SELECT value FROM settings WHERE key = ?;`;
    const rows = await dbManager.query<{ value: string }>(sql, [key]);
    if (rows.length === 0) return defaultValue;
    return rows[0].value;
  },

  async set(key: string, value: string): Promise<void> {
    const sql = `
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `;
    await dbManager.run(sql, [key, value]);
  },

  async getAppSettings(): Promise<AppSettings> {
    const sql = `SELECT key, value FROM settings;`;
    const rows = await dbManager.query<{ key: string; value: string }>(sql);
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, r.value);
    }

    return {
      theme: (map.get('theme') as ThemeMode) || 'system',
      language: (map.get('language') as Language) || 'vi',
      currency: map.get('currency') || 'VND',
      hideCompleted: map.get('hideCompleted') === 'true',
    };
  },

  async saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
    if (settings.theme !== undefined) {
      await this.set('theme', settings.theme);
    }
    if (settings.language !== undefined) {
      await this.set('language', settings.language);
    }
    if (settings.currency !== undefined) {
      await this.set('currency', settings.currency);
    }
    if (settings.hideCompleted !== undefined) {
      await this.set('hideCompleted', settings.hideCompleted ? 'true' : 'false');
    }
  },
};
