import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Person, Activity, PersonType, PaymentHistoryItem } from '@/types';
import { dbManager } from '@/database/sqliteConnection';
import { personRepository } from '@/repositories/personRepository';
import { debtActivityRepository } from '@/repositories/debtActivityRepository';
import { paymentRepository } from '@/repositories/paymentRepository';
import { generateId } from '@/utils/id';

interface DebtContextType {
  people: Person[];
  activities: Activity[];
  debtors: Person[];
  creditors: Person[];
  totalDebtorsRemaining: number;
  totalCreditorsRemaining: number;
  isLoading: boolean;
  isDbReady: boolean;
  dbError: string | null;
  addPerson: (name: string, type: PersonType) => Promise<string>;
  updatePersonName: (personId: string, newName: string) => Promise<void>;
  deletePerson: (personId: string) => Promise<void>;
  getPerson: (personId: string) => Person | undefined;
  getPersonActivities: (personId: string) => Activity[];
  getPersonUnpaidTotal: (personId: string) => Promise<number>;
  addActivity: (personId: string, data: { title: string; amount: number; date?: string }) => Promise<void>;
  updateActivity: (activityId: string, data: { title?: string; amount?: number; date?: string }) => Promise<void>;
  recordPayment: (personId: string, activityId: string, amount: number, note?: string) => Promise<void>;
  markActivityAsPaid: (personId: string, activityId: string) => Promise<void>;
  deleteActivity: (personId: string, activityId: string) => Promise<void>;
  getActivityPayments: (activityId: string) => Promise<PaymentHistoryItem[]>;
  refreshData: () => Promise<void>;
}

const DebtContext = createContext<DebtContextType | undefined>(undefined);

export const DebtProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [activitiesMap, setActivitiesMap] = useState<Record<string, Activity[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

  /**
   * Load all data from SQLite database
   */
  const loadAllData = useCallback(async () => {
    try {
      const allPeople = await personRepository.getAll();
      setPeople(allPeople);

      // Load activities for all people
      const actsMap: Record<string, Activity[]> = {};
      await Promise.all(
        allPeople.map(async (p) => {
          const acts = await debtActivityRepository.getByPersonId(p.id);
          actsMap[p.id] = acts;
        })
      );
      setActivitiesMap(actsMap);
      setDbError(null);
    } catch (err: unknown) {
      console.error('[DebtContext] Failed to load SQLite data:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi nạp dữ liệu SQLite';
      setDbError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize SQLite connection on startup
   */
  useEffect(() => {
    let isMounted = true;

    const initDb = async () => {
      try {
        setIsLoading(true);
        await dbManager.initialize();
        if (isMounted) {
          setIsDbReady(true);
          await loadAllData();
        }
      } catch (err: unknown) {
        console.error('[DebtContext] Database initialization failed:', err);
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Không thể khởi tạo cơ sở dữ liệu SQLite.';
          setDbError(msg);
          setIsLoading(false);
        }
      }
    };

    initDb();

    return () => {
      isMounted = false;
    };
  }, [loadAllData]);

  // Filter debtors and creditors
  const debtors = useMemo(
    () => people.filter((p) => p.type === 'debtor'),
    [people]
  );

  const creditors = useMemo(
    () => people.filter((p) => p.type === 'creditor'),
    [people]
  );

  // Total remaining amount from UNPAID debt activities
  const totalDebtorsRemaining = useMemo(
    () => debtors.reduce((acc, p) => acc + (p.totalRemaining || 0), 0),
    [debtors]
  );

  const totalCreditorsRemaining = useMemo(
    () => creditors.reduce((acc, p) => acc + (p.totalRemaining || 0), 0),
    [creditors]
  );

  // Flattened activities list for legacy consumers
  const activities = useMemo(() => {
    return Object.values(activitiesMap).flat();
  }, [activitiesMap]);

  // Operations
  const addPerson = async (name: string, type: PersonType): Promise<string> => {
    const id = generateId();
    await personRepository.create({
      id,
      name,
      type,
    });
    await loadAllData();
    return id;
  };

  const updatePersonName = async (personId: string, newName: string): Promise<void> => {
    await personRepository.updateName(personId, newName);
    await loadAllData();
  };

  const deletePerson = async (personId: string): Promise<void> => {
    await personRepository.delete(personId);
    await loadAllData();
  };

  const getPerson = (personId: string): Person | undefined => {
    return people.find((p) => p.id === personId);
  };

  const getPersonActivities = (personId: string): Activity[] => {
    return activitiesMap[personId] || [];
  };

  const getPersonUnpaidTotal = async (personId: string): Promise<number> => {
    return await personRepository.getUnpaidTotal(personId);
  };

  const addActivity = async (
    personId: string,
    data: { title: string; amount: number; date?: string }
  ): Promise<void> => {
    const actId = generateId();
    await debtActivityRepository.create({
      id: actId,
      personId,
      description: data.title,
      amount: data.amount,
      date: data.date,
    });
    await loadAllData();
  };

  const updateActivity = async (
    activityId: string,
    data: { title?: string; amount?: number; date?: string }
  ): Promise<void> => {
    await debtActivityRepository.update(activityId, {
      description: data.title,
      amount: data.amount,
      date: data.date,
    });
    await loadAllData();
  };

  const recordPayment = async (
    _personId: string,
    activityId: string,
    amount: number,
    note?: string
  ): Promise<void> => {
    await paymentRepository.recordPayment(activityId, amount, note);
    await loadAllData();
  };

  const markActivityAsPaid = async (_personId: string, activityId: string): Promise<void> => {
    await debtActivityRepository.markAsPaid(activityId);
    await loadAllData();
  };

  const deleteActivity = async (_personId: string, activityId: string): Promise<void> => {
    await debtActivityRepository.delete(activityId);
    await loadAllData();
  };

  const getActivityPayments = async (activityId: string): Promise<PaymentHistoryItem[]> => {
    return await paymentRepository.getByActivityId(activityId);
  };

  return (
    <DebtContext.Provider
      value={{
        people,
        activities,
        debtors,
        creditors,
        totalDebtorsRemaining,
        totalCreditorsRemaining,
        isLoading,
        isDbReady,
        dbError,
        addPerson,
        updatePersonName,
        deletePerson,
        getPerson,
        getPersonActivities,
        getPersonUnpaidTotal,
        addActivity,
        updateActivity,
        recordPayment,
        markActivityAsPaid,
        deleteActivity,
        getActivityPayments,
        refreshData: loadAllData,
      }}
    >
      {children}
    </DebtContext.Provider>
  );
};

export const useDebtStore = (): DebtContextType => {
  const context = useContext(DebtContext);
  if (!context) {
    throw new Error('useDebtStore must be used within a DebtProvider');
  }
  return context;
};
