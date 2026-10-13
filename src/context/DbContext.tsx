import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { dbManager } from '@/database/sqliteConnection';

interface DbContextType {
  isReady: boolean;
  error: string | null;
  dataVersion: number;
  refreshData: () => void;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(1);

  const refreshData = useCallback(() => {
    setDataVersion((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        await dbManager.initialize();

        if (isMounted) {
          setIsReady(true);
        }
      } catch (err: unknown) {
        console.error('Database initialization error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Database error');
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DbContext.Provider value={{ isReady, error, dataVersion, refreshData }}>
      {children}
    </DbContext.Provider>
  );
};

export const useDb = (): DbContextType => {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
};
