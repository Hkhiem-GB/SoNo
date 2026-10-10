export type DebtType = 'owe_me' | 'i_owe';
export type PersonType = 'debtor' | 'creditor' | 'DEBTOR' | 'CREDITOR';
export type DbPersonType = 'DEBTOR' | 'CREDITOR';
export type ActivityStatus = 'UNPAID' | 'PAID';

export interface PaymentHistoryItem {
  id: string;
  activityId: string;
  amount: number;
  paidAt: string;
  note?: string;
}

export interface Activity {
  id: string;
  personId: string;
  title: string;
  description?: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  date: string;
  isPaid: boolean;
  status: ActivityStatus;
  createdAt: string;
  payments?: PaymentHistoryItem[];
}

export interface Person {
  id: string;
  name: string;
  type: PersonType;
  phone?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  totalRemaining: number;
  activitiesCount: number;
  unpaidCount?: number;
  // Computed fields for SQLite aggregation / legacy compatibility
  totalOweMe?: number;
  totalIOwe?: number;
  netBalance?: number;
  activeCount?: number;
}

export interface Debt {
  id: string;
  personId: string;
  personName?: string;
  type: DebtType;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  note?: string;
  dueDate?: string;
  isSettled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: string;
  note?: string;
  createdAt: string;
}

export interface FinancialSummary {
  totalOweMe: number;
  totalIOwe: number;
  netBalance: number;
  totalSettledOweMe: number;
  totalSettledIOwe: number;
  activeDebtsCount: number;
  settledDebtsCount: number;
  overdueCount: number;
}

export type DebtFilterStatus = 'all' | 'active' | 'settled' | 'overdue';
export type DebtSortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'due_date';

export interface DebtFilter {
  type: 'all' | DebtType;
  status: DebtFilterStatus;
  searchQuery: string;
  personId?: string;
  sortBy: DebtSortOption;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'vi' | 'en';

export interface AppSettings {
  theme: ThemeMode;
  language: Language;
  currency?: string;
  hideCompleted?: boolean;
}
