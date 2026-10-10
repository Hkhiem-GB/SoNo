import { debtActivityRepository } from '@/repositories/debtActivityRepository';
import { personRepository } from '@/repositories/personRepository';
import { paymentRepository } from '@/repositories/paymentRepository';
import { generateId } from '@/utils/id';
import type { Activity, Debt, DebtFilter, FinancialSummary, Payment } from '@/types';

export const debtService = {
  async getDebts(_filter?: Partial<DebtFilter>): Promise<Debt[]> {
    return [];
  },

  async getActivities(personId: string): Promise<Activity[]> {
    return debtActivityRepository.getByPersonId(personId);
  },

  async getActivity(id: string): Promise<Activity | null> {
    return debtActivityRepository.getById(id);
  },

  async getDebt(id: string): Promise<Debt | null> {
    const act = await debtActivityRepository.getById(id);
    if (!act) return null;
    return {
      id: act.id,
      personId: act.personId,
      type: 'owe_me',
      amount: act.amount,
      paidAmount: act.paidAmount,
      remainingAmount: act.remainingAmount,
      isSettled: act.isPaid,
      createdAt: act.createdAt,
      updatedAt: act.createdAt,
    };
  },

  async createActivity(input: {
    personId: string;
    description: string;
    amount: number;
    date?: string;
  }): Promise<string> {
    const actId = generateId();
    await debtActivityRepository.create({
      id: actId,
      personId: input.personId,
      description: input.description,
      amount: input.amount,
      date: input.date,
    });
    return actId;
  },

  async createDebt(input: {
    personId?: string;
    personName?: string;
    amount: number;
    note?: string;
    type?: string;
    dueDate?: string;
  }): Promise<string> {
    const actId = generateId();
    await debtActivityRepository.create({
      id: actId,
      personId: input.personId || 'p-1',
      description: input.note || 'Khoản nợ mới',
      amount: input.amount,
      date: input.dueDate,
    });
    return actId;
  },

  async updateDebt(input: {
    id: string;
    amount: number;
    note?: string;
    dueDate?: string;
    personId?: string;
    type?: string;
  }): Promise<void> {
    await debtActivityRepository.update(input.id, {
      description: input.note,
      amount: input.amount,
      date: input.dueDate,
    });
  },

  async updateActivity(input: {
    id: string;
    description?: string;
    amount?: number;
    date?: string;
  }): Promise<void> {
    await debtActivityRepository.update(input.id, {
      description: input.description,
      amount: input.amount,
      date: input.date,
    });
  },

  async toggleSettlement(debtId: string, currentStatus: boolean): Promise<void> {
    if (!currentStatus) {
      await debtActivityRepository.markAsPaid(debtId);
    }
  },

  async markAsPaid(activityId: string): Promise<void> {
    await debtActivityRepository.markAsPaid(activityId);
  },

  async recordPayment(input: {
    activityId?: string;
    debtId?: string;
    amount: number;
    paymentDate?: string;
    note?: string;
  }): Promise<{ newRemaining: number; isFullyPaid: boolean }> {
    const id = input.activityId || input.debtId || '';
    return await paymentRepository.recordPayment(id, input.amount, input.note);
  },

  async getPaymentHistory(activityId: string): Promise<Payment[]> {
    const history = await paymentRepository.getByActivityId(activityId);
    return history.map((h) => ({
      id: h.id,
      debtId: h.activityId,
      amount: h.amount,
      paymentDate: h.paidAt,
      note: h.note,
      createdAt: h.paidAt,
    }));
  },

  async deletePayment(_paymentId: string): Promise<void> {
    // Safe ignore for consistency
  },

  async deleteActivity(id: string): Promise<void> {
    await debtActivityRepository.delete(id);
  },

  async deleteDebt(id: string): Promise<void> {
    await debtActivityRepository.delete(id);
  },

  async getSummary(): Promise<FinancialSummary> {
    const totalReceivable = await personRepository.getTotalRemainingByType('DEBTOR');
    const totalPayable = await personRepository.getTotalRemainingByType('CREDITOR');
    return {
      totalOweMe: totalReceivable,
      totalIOwe: totalPayable,
      netBalance: totalReceivable - totalPayable,
      totalSettledOweMe: 0,
      totalSettledIOwe: 0,
      activeDebtsCount: 0,
      settledDebtsCount: 0,
      overdueCount: 0,
    };
  },
};
