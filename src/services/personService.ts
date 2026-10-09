import { personRepository } from '@/repositories/personRepository';
import { debtRepository } from '@/repositories/debtRepository';
import { generateId } from '@/utils/id';
import type { Person, Debt } from '@/types';

export const personService = {
  async getPeople(): Promise<Person[]> {
    return personRepository.getAll();
  },

  async getPerson(id: string): Promise<Person | null> {
    return personRepository.getById(id);
  },

  async createPerson(input: { name: string; phone?: string; note?: string }): Promise<string> {
    const id = generateId();
    await personRepository.create({
      id,
      name: input.name,
      phone: input.phone,
      note: input.note,
    });
    return id;
  },

  async updatePerson(input: { id: string; name: string; phone?: string; note?: string }): Promise<void> {
    await personRepository.update(input);
  },

  async deletePerson(id: string): Promise<void> {
    await personRepository.delete(id);
  },

  async getPersonDebts(personId: string): Promise<Debt[]> {
    return debtRepository.getAll({ personId });
  },
};
