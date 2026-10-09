import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { APP_CONFIG } from '@/config/appConfig';
import { DB_SCHEMA } from '@/database/schema';

class DatabaseManager {
  private static instance: DatabaseManager;
  private sqliteConnection: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const platform = Capacitor.getPlatform();
        this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);

        if (platform === 'web') {
          await this.initWebPlatform();
        }

        const isConn = (await this.sqliteConnection.isConnection(APP_CONFIG.dbName, false)).result;
        if (isConn) {
          this.db = await this.sqliteConnection.retrieveConnection(APP_CONFIG.dbName, false);
        } else {
          this.db = await this.sqliteConnection.createConnection(
            APP_CONFIG.dbName,
            false,
            'no-encryption',
            APP_CONFIG.dbVersion,
            false,
          );
        }

        await this.db.open();
        await this.db.execute(DB_SCHEMA);

        if (platform === 'web') {
          await this.sqliteConnection.saveToStore(APP_CONFIG.dbName);
        }

        this.isInitialized = true;
        console.log(`[Database] SQLite connected successfully on platform: ${platform}`);
      } catch (error) {
        console.error('[Database] Failed to initialize SQLite:', error);
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async initWebPlatform(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      await jeepSqlite(window);
      if (!document.querySelector('jeep-sqlite')) {
        const jeepEl = document.createElement('jeep-sqlite');
        document.body.appendChild(jeepEl);
        await customElements.whenDefined('jeep-sqlite');
      }

      if (this.sqliteConnection) {
        await this.sqliteConnection.initWebStore();
      }
    } catch (e) {
      console.warn('[Database] Web store fallback warning:', e);
    }
  }

  public async getDatabase(): Promise<SQLiteDBConnection> {
    if (!this.db || !this.isInitialized) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database connection is not available.');
    }
    return this.db;
  }

  public async query<T = Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> {
    const db = await this.getDatabase();
    const result = await db.query(sql, values);
    return (result.values as T[]) || [];
  }

  public async run(sql: string, values: unknown[] = []): Promise<{ changes: number; lastId?: number }> {
    const db = await this.getDatabase();
    const result = await db.run(sql, values);
    
    if (Capacitor.getPlatform() === 'web' && this.sqliteConnection) {
      try {
        await this.sqliteConnection.saveToStore(APP_CONFIG.dbName);
      } catch (e) {
        console.warn('[Database] Failed to save to web store:', e);
      }
    }

    return {
      changes: result.changes?.changes ?? 0,
      lastId: result.changes?.lastId,
    };
  }

  public async execute(sql: string): Promise<void> {
    const db = await this.getDatabase();
    await db.execute(sql);
    
    if (Capacitor.getPlatform() === 'web' && this.sqliteConnection) {
      try {
        await this.sqliteConnection.saveToStore(APP_CONFIG.dbName);
      } catch (e) {
        console.warn('[Database] Failed to save to web store:', e);
      }
    }
  }

  public async close(): Promise<void> {
    if (this.db && this.sqliteConnection) {
      await this.sqliteConnection.closeConnection(APP_CONFIG.dbName, false);
      this.db = null;
      this.isInitialized = false;
    }
  }
}

export const dbManager = DatabaseManager.getInstance();
