import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { APP_CONFIG } from '@/config/appConfig';
import { SCHEMA_STATEMENTS } from '@/database/schema';
import { seedInitialDataIfEmpty } from '@/database/seed';

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

        // Only open database if not already open
        const isDBOpen = (await this.db.isDBOpen()).result;
        if (!isDBOpen) {
          await this.db.open();
        }

        // 1. Enforce Foreign Keys (explicit false for transaction)
        await this.db.execute('PRAGMA foreign_keys = ON;\n', false);

        // 2. Safe Schema Migration: Check if schema needs upgrade from previous prototype
        await this.ensureSchemaCompatibility();

        // 3. Execute Current Schema statement by statement to prevent newline splitting bugs on Android
        for (const stmt of SCHEMA_STATEMENTS) {
          await this.db.execute(stmt.replace(/\r\n/g, '\n') + '\n', false);
        }

        // 4. Seed initial realistic data if DB is empty
        await seedInitialDataIfEmpty();

        if (platform === 'web') {
          await this.sqliteConnection.saveToStore(APP_CONFIG.dbName);
        }

        this.isInitialized = true;
        console.log(`[Database] SQLite connected & verified successfully on platform: ${platform}`);
      } catch (error) {
        console.error('[Database] Failed to initialize SQLite:', error);
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
      // Check if table 'people' has column 'type'
      const tableCheck = await this.db.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='people';"
      );

      if (tableCheck.values && tableCheck.values.length > 0) {
        const columnCheck = await this.db.query("PRAGMA table_info(people);");
        const columns = (columnCheck.values || []).map((col: { name: string }) => col.name);
        
        // If 'type' column is missing (old step 1/2 schema), drop old tables to rebuild fresh clean Step 4 schema
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
      console.warn('[Database] Migration check non-critical notice:', e);
    }
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
    // CRITICAL: Always pass `transaction: false` to db.run!
    // 1) Outside a transaction, SQLite commits automatically and immediately.
    // 2) Inside a transaction (begun with db.beginTransaction()), passing false prevents
    //    the plugin from attempting a nested transaction (which throws 'Already in transaction'
    //    and causes a premature rollback on Android).
    // 3) On UPDATE/DELETE where lastId == -1, passing false prevents the plugin from rolling back changes.
    const result = await db.run(sql, values, false);
    
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
    // Normalize newlines and safely split multiple SQL statements
    // Because Android plugin's getStatementsArray uses stmts.split(";\n") which fails on Windows \r\n
    const statements = sql
      .replace(/\r\n/g, '\n')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await db.execute(stmt + ';\n', false);
    }
    
    if (Capacitor.getPlatform() === 'web' && this.sqliteConnection) {
      try {
        await this.sqliteConnection.saveToStore(APP_CONFIG.dbName);
      } catch (e) {
        console.warn('[Database] Failed to save to web store:', e);
      }
    }
  }

  /**
   * Run operations inside an atomic SQLite transaction.
   * Re-entrant safe: checks if a transaction is already active.
   */
  public async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const db = await this.getDatabase();
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
