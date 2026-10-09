import { debtRepository } from '@/repositories/debtRepository';
import { personRepository } from '@/repositories/personRepository';
import { paymentRepository } from '@/repositories/paymentRepository';
import { generateId } from '@/utils/id';
import type { Debt, DebtFilter, FinancialSummary, Payment } from '@/types';

export const debtService = {
  async getDebts(filter?: Partial<DebtFilter>): Promise<Debt[]> {
    return debtRepository.getAll(filter);
  },

  async getDebt(id: string): Promise<Debt | null> {
    return debtRepository.getById(id);
  },

  async createDebt(input: {
    personId?: string;
    personName?: string;
    personPhone?: string;
    type: 'owe_me' | 'i_owe';
    amount: number;
    note?: string;
    dueDate?: string;
  }): Promise<string> {
    let personId = input.personId;

    if (!personId && input.personName) {
      // Find if person already exists by name
      const people = await personRepository.getAll();
      const existing = people.find(
        (p) => p.name.trim().toLowerCase() === input.personName!.trim().toLowerCase(),
      );

      if (existing) {
        personId = existing.id;
      } else {
        personId = generateId();
        await personRepository.create({
          id: personId,
          name: input.personName.trim(),
          phone: input.personPhone,
        });
      }
    }

    if (!personId) {
      throw new Error('Person is required');
    }

    const debtId = generateId();
    await debtRepository.create({
      id: debtId,
      personId,
      type: input.type,
      amount: input.amount,
      note: input.note,
      dueDate: input.dueDate,
    });

    return debtId;
  },

  async updateDebt(input: {
    id: string;
    personId: string;
    type: 'owe_me' | 'i_owe';
    amount: number;
    note?: string;
    dueDate?: string;
  }): Promise<void> {
    await debtRepository.update(input);
  },

  async toggleSettlement(debtId: string, currentStatus: boolean): Promise<void> {
    await debtRepository.updateSettlement(debtId, !currentStatus);
  },

  async recordPayment(input: {
    debtId: string;
    amount: number;
    paymentDate: string;
    note?: string;
  }): Promise<string> {
    const paymentId = generateId();
    await paymentRepository.recordPayment({
      id: paymentId,
      debtId: input.debtId,
      amount: input.amount,
      paymentDate: input.paymentDate,
      note: input.note,
    });
    return paymentId;
  },

  async getPaymentHistory(debtId: string): Promise<Payment[]> {
    return paymentRepository.getByDebtId(debtId);
  },

  async deletePayment(paymentId: string): Promise<void> {
    await paymentRepository.delete(paymentId);
  },

  async deleteDebt(id: string): Promise<void> {
    await debtRepository.delete(id);
  },

  async getSummary(): Promise<FinancialSummary> {
    return debtRepository.getFinancialSummary();
  },
};
