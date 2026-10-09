export type DebtType = 'owe_me' | 'i_owe';

export interface Person {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields
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
  totalOweMe: number; // Tổng số tiền người khác nợ tôi (chưa thanh toán)
  totalIOwe: number;  // Tổng số tiền tôi nợ người khác (chưa thanh toán)
  netBalance: number; // Hiệu số: totalOweMe - totalIOwe
  totalSettledOweMe: number; // Tổng đã thu hồi
  totalSettledIOwe: number;  // Tổng đã trả xong
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
  currency: string;
  hideCompleted: boolean;
}
