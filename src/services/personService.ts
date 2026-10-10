import { personRepository } from '@/repositories/personRepository';
import { debtActivityRepository } from '@/repositories/debtActivityRepository';
import { generateId } from '@/utils/id';
import type { Person, PersonType, Debt } from '@/types';

export const personService = {
  async getPeople(filterType?: PersonType): Promise<Person[]> {
    return personRepository.getAll(filterType);
  },

  async getPerson(id: string): Promise<Person | null> {
    return personRepository.getById(id);
  },

  async createPerson(input: { name: string; phone?: string; note?: string; type?: PersonType }): Promise<string> {
    const id = generateId();
    await personRepository.create({
      id,
      name: input.name,
      type: input.type || 'debtor',
    });
    return id;
  },

  async updatePerson(input: { id: string; name: string; phone?: string; note?: string }): Promise<void> {
    await personRepository.updateName(input.id, input.name);
  },

  async deletePerson(id: string): Promise<void> {
    await personRepository.delete(id);
  },

  async getUnpaidTotal(personId: string): Promise<number> {
    return personRepository.getUnpaidTotal(personId);
  },

  async getPersonDebts(personId: string): Promise<Debt[]> {
    const acts = await debtActivityRepository.getByPersonId(personId);
    return acts.map((a) => ({
      id: a.id,
      personId: a.personId,
      type: 'owe_me',
      amount: a.amount,
      paidAmount: a.paidAmount,
      remainingAmount: a.remainingAmount,
      isSettled: a.isPaid,
      createdAt: a.createdAt,
      updatedAt: a.createdAt,
    }));
  },
};
