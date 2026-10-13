import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { APP_CONFIG } from '@/config/appConfig';
import { SCHEMA_STATEMENTS } from '@/database/schema';
import { seedInitialDataIfEmpty } from '@/database/seed';
import { WebStorageFallback } from '@/database/webStorageFallback';

class DatabaseManager {
  private static instance: DatabaseManager;
  private sqliteConnection: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private useFallback = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized && (this.db || this.useFallback)) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const platform = Capacitor.getPlatform();

      // For Web platform, proactively catch any WebAssembly / jeep-sqlite incompatibilities
      try {
        this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);

        if (platform === 'web') {
          await this.initWebPlatform();
        }

        // Verify connection consistency across reloads
        try {
          await this.sqliteConnection.checkConnectionsConsistency();
        } catch (ccErr) {
          console.warn('[Database] checkConnectionsConsistency notice:', ccErr);
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

        // Always ensure DB is open
        let isDBOpen = false;
        try {
          isDBOpen = (await this.db.isDBOpen()).result ?? false;
        } catch {
          isDBOpen = false;
        }

        if (!isDBOpen) {
          await this.db.open();
        }

        // 1. Enforce Foreign Keys
        await this.db.execute('PRAGMA foreign_keys = ON;\n', false);

        // 2. Safe Schema Migration
        await this.ensureSchemaCompatibility();

        // 3. Execute Current Schema
        for (const stmt of SCHEMA_STATEMENTS) {
          await this.db.execute(stmt.replace(/\r\n/g, '\n') + '\n', false);
        }

        this.isInitialized = true;

        // 4. Seed initial realistic data if DB is empty
        try {
          await seedInitialDataIfEmpty();
        } catch (seedErr) {
          console.warn('[Database] Seed initial data notice:', seedErr);
        }

        if (platform === 'web' && this.sqliteConnection) {
          try {
            await this.sqliteConnection.saveToStore(APP_CONFIG.dbName);
          } catch (saveErr) {
            console.warn('[Database] Initial web saveToStore notice:', saveErr);
          }
        }

        console.log(`[Database] Native SQLite connected & verified successfully on platform: ${platform}`);
      } catch (error) {
        console.warn(`[Database] SQLite initialization notice on platform "${platform}":`, error);
        
        // If on web or if native sqlite encounters an environment issue, gracefully activate offline WebStorageFallback
        if (platform === 'web') {
          console.log('[Database] Seamlessly activating high-performance offline WebStorageFallback engine...');
          this.useFallback = true;
          this.isInitialized = true;
          WebStorageFallback.getInstance().seedDemoIfEmpty();
          return;
        }

        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async ensureSchemaCompatibility(): Promise<void> {
    if (!this.db) return;
    try {
      const tableCheck = await this.db.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='people';"
      );

      if (tableCheck.values && tableCheck.values.length > 0) {
        const columnCheck = await this.db.query("PRAGMA table_info(people);");
        const columns = (columnCheck.values || []).map((col: { name: string }) => col.name);
        
        if (!columns.includes('type')) {
          console.warn('[Database] Old schema detected without people.type. Migrating tables to Step 4 schema...');
          const dropStatements = [
            'DROP TABLE IF EXISTS payment_history;',
            'DROP TABLE IF EXISTS payments;',
            'DROP TABLE IF EXISTS debt_activities;',
            'DROP TABLE IF EXISTS debts;',
            'DROP TABLE IF EXISTS people;',
          ];
          for (const dropSql of dropStatements) {
            await this.db.execute(dropSql + '\n', false);
          }
        }
      }
    } catch (e) {
      console.warn('[Database] Migration check notice:', e);
    }
  }

  private async initWebPlatform(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      await jeepSqlite(window);
      let jeepEl = document.querySelector('jeep-sqlite');
      if (!jeepEl) {
        jeepEl = document.createElement('jeep-sqlite');
        document.body.appendChild(jeepEl);
      }
      await customElements.whenDefined('jeep-sqlite');
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (this.sqliteConnection) {
        await this.sqliteConnection.initWebStore();
      }
    } catch (e) {
      console.warn('[Database] Web store initialization notice:', e);
    }
  }

  private async ensureOpen(db: SQLiteDBConnection): Promise<void> {
    try {
      const isOpen = (await db.isDBOpen()).result ?? false;
      if (!isOpen) {
        console.log('[Database] Database is not open. Opening connection...');
        await db.open();
      }
    } catch {
      try {
        await db.open();
      } catch (openErr) {
        console.warn('[Database] ensureOpen direct open notice:', openErr);
      }
    }
  }

  public async getDatabase(): Promise<SQLiteDBConnection | null> {
    if (this.useFallback) {
      return null;
    }

    if (!this.db || !this.isInitialized) {
      await this.initialize();
    }

    if (this.useFallback) {
      return null;
    }

    if (!this.db) {
      if (Capacitor.getPlatform() === 'web') {
        this.useFallback = true;
        this.isInitialized = true;
        return null;
      }
      throw new Error('Database connection is not available.');
    }

    await this.ensureOpen(this.db);
    return this.db;
  }

  public async query<T = Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> {
    if (this.useFallback) {
      return WebStorageFallback.getInstance().query<T>(sql, values);
    }

    const db = await this.getDatabase();
    if (this.useFallback || !db) {
      return WebStorageFallback.getInstance().query<T>(sql, values);
    }

    try {
      const result = await db.query(sql, values);
      return (result.values as T[]) || [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('not opened')) {
        console.warn('[Database] DB closed during query, re-opening and retrying...');
        await this.ensureOpen(db);
        const result = await db.query(sql, values);
        return (result.values as T[]) || [];
      }
      if (Capacitor.getPlatform() === 'web') {
        this.useFallback = true;
        return WebStorageFallback.getInstance().query<T>(sql, values);
      }
      throw err;
    }
  }

  public async run(sql: string, values: unknown[] = []): Promise<{ changes: number; lastId?: number }> {
    if (this.useFallback) {
      return WebStorageFallback.getInstance().run(sql, values);
    }

    const db = await this.getDatabase();
    if (this.useFallback || !db) {
      return WebStorageFallback.getInstance().run(sql, values);
    }

    let result;
    try {
      result = await db.run(sql, values, false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('not opened')) {
        console.warn('[Database] DB closed during run, re-opening and retrying...');
        await this.ensureOpen(db);
        result = await db.run(sql, values, false);
      } else if (Capacitor.getPlatform() === 'web') {
        this.useFallback = true;
        return WebStorageFallback.getInstance().run(sql, values);
      } else {
        throw err;
      }
    }
    
    if (Capacitor.getPlatform() === 'web' && this.sqliteConnection) {
      try {
        let isTx = false;
        try {
          isTx = (await db.isTransactionActive()).result ?? false;
        } catch {
          isTx = false;
        }
        if (!isTx) {
          await this.sqliteConnection.saveToStore(APP_CONFIG.dbName);
        }
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
    if (this.useFallback) {
      WebStorageFallback.getInstance().execute(sql);
      return;
    }

    const db = await this.getDatabase();
    if (this.useFallback || !db) {
      WebStorageFallback.getInstance().execute(sql);
      return;
    }

    const statements = sql
      .replace(/\r\n/g, '\n')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await db.execute(stmt + ';\n', false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('not opened')) {
          console.warn('[Database] DB closed during execute, re-opening and retrying...');
          await this.ensureOpen(db);
          await db.execute(stmt + ';\n', false);
        } else if (Capacitor.getPlatform() === 'web') {
          this.useFallback = true;
          WebStorageFallback.getInstance().execute(sql);
          return;
        } else {
          throw err;
        }
      }
    }
    
    if (Capacitor.getPlatform() === 'web' && this.sqliteConnection) {
      try {
        let isTx = false;
        try {
          isTx = (await db.isTransactionActive()).result ?? false;
        } catch {
          isTx = false;
        }
        if (!isTx) {
          await this.sqliteConnection.saveToStore(APP_CONFIG.dbName);
        }
      } catch (e) {
        console.warn('[Database] Failed to save to web store:', e);
      }
    }
  }

  public async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (this.useFallback) {
      return await callback();
    }

    const db = await this.getDatabase();
    if (this.useFallback || !db) {
      return await callback();
    }

    await this.ensureOpen(db);

    let isAlreadyInTransaction = false;
    try {
      isAlreadyInTransaction = (await db.isTransactionActive()).result ?? false;
    } catch {
      isAlreadyInTransaction = false;
    }

    if (isAlreadyInTransaction) {
      return await callback();
    }

    await db.beginTransaction();
    try {
      const result = await callback();
      await db.commitTransaction();

      if (Capacitor.getPlatform() === 'web' && this.sqliteConnection) {
        try {
          await this.sqliteConnection.saveToStore(APP_CONFIG.dbName);
        } catch (e) {
          console.warn('[Database] Failed to save store after transaction:', e);
        }
      }

      return result;
    } catch (error) {
      try {
        const stillActive = (await db.isTransactionActive()).result ?? false;
        if (stillActive) {
          await db.rollbackTransaction();
        }
      } catch (rollbackErr) {
        console.error('[Database] Rollback transaction failed:', rollbackErr);
      }
      throw error;
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
