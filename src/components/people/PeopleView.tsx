import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useDb } from '@/context/DbContext';
import { formatCurrency } from '@/utils/formatters';
import { personService } from '@/services/personService';
import { PersonFormModal } from '@/components/people/PersonFormModal';
import { PersonDetailModal } from '@/components/people/PersonDetailModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { Person } from '@/types';

interface PeopleViewProps {
  onAddDebtForPerson: (person: Person) => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({ onAddDebtForPerson }) => {
  const { t, language } = useLanguage();
  const { dataVersion, refreshData } = useDb();
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);

  useEffect(() => {
    setLoading(true);
    personService.getPeople().then((data) => {
      setPeople(data);
      setLoading(false);
    });
  }, [dataVersion]);

  const filtered = people.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q));
  });

  const handleSavePerson = async (data: { id?: string; name: string; phone?: string; note?: string }) => {
    if (data.id) {
      await personService.updatePerson({
        id: data.id,
        name: data.name,
        phone: data.phone,
        note: data.note,
      });
    } else {
      await personService.createPerson({
        name: data.name,
        phone: data.phone,
        note: data.note,
      });
    }
    refreshData();
  };

  const handleDeleteConfirm = async () => {
    if (deletingPerson) {
      await personService.deletePerson(deletingPerson.id);
      setDeletingPerson(null);
      setIsDetailOpen(false);
      refreshData();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
          {t('contactList')}
        </h2>
        <button
          type="button"
          onClick={() => {
            setSelectedPerson(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{t('addPerson')}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 shadow-2xs"
        />
      </div>

      {/* People List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Đang tải danh bạ...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
          {t('noPeopleFound')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((person) => {
            const oweMe = person.totalOweMe ?? 0;
            const iOwe = person.totalIOwe ?? 0;

            return (
              <div
                key={person.id}
                onClick={() => {
                  setSelectedPerson(person);
                  setIsDetailOpen(true);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 rounded-2xl p-4 shadow-2xs cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-base shrink-0">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {person.name}
                    </h4>
                    {person.phone && (
                      <div className="flex items-center space-x-1 text-xs text-slate-400 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{person.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {oweMe > 0 && (
                    <div className="flex items-center justify-end space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <ArrowDownLeft className="w-3 h-3" />
                      <span>{formatCurrency(oweMe, 'VND', language)}</span>
                    </div>
                  )}
                  {iOwe > 0 && (
                    <div className="flex items-center justify-end space-x-1 text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>{formatCurrency(iOwe, 'VND', language)}</span>
                    </div>
                  )}
                  {oweMe === 0 && iOwe === 0 && (
                    <span className="text-xs text-slate-400 font-medium">
                      0 đ
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <PersonFormModal
        isOpen={isFormOpen}
        initialPerson={selectedPerson}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSavePerson}
      />

      {/* Detail Modal */}
      <PersonDetailModal
        isOpen={isDetailOpen}
        person={selectedPerson}
        onClose={() => setIsDetailOpen(false)}
        onEditPerson={(p) => {
          setIsDetailOpen(false);
          setSelectedPerson(p);
          setIsFormOpen(true);
        }}
        onDeletePerson={(p) => {
          setDeletingPerson(p);
        }}
        onAddDebtForPerson={(p) => {
          setIsDetailOpen(false);
          onAddDebtForPerson(p);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingPerson}
        title={t('delete')}
        message={t('deletePersonPrompt')}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingPerson(null)}
      />
    </div>
  );
};
