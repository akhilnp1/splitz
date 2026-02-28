'use client';

import { useState } from 'react';
import { useCreateExpense } from '@/hooks/useExpenses';
import { Group } from '@/types';
import { X } from 'lucide-react';

interface Props {
  group: Group;
  groupId: number;
  onClose: () => void;
}

export default function ExpenseForm({ group, groupId, onClose }: Props) {
  const createExpense = useCreateExpense(groupId);
  const members = group.members.map((m) => m.user);

  const [form, setForm] = useState({
    description: '',
    amount: '',
    paid_by_id: members[0]?.id || 0,
    split_type: 'EQUAL' as 'EQUAL' | 'EXACT' | 'PERCENTAGE',
    notes: '',
  });

  const [selectedParticipants, setSelectedParticipants] = useState<Set<number>>(
    new Set(members.map((m) => m.id))
  );

  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const toggleParticipant = (userId: number) => {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getCustomAmountsTotal = () => {
    return Array.from(selectedParticipants).reduce((sum, uid) => {
      return sum + (parseFloat(customAmounts[uid] || '0') || 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (selectedParticipants.size === 0) {
      setError('Select at least one participant.');
      return;
    }

    // Validate custom amounts
    if (form.split_type === 'EXACT') {
      const total = getCustomAmountsTotal();
      if (Math.abs(total - amount) > 0.01) {
        setError(`Exact amounts must sum to $${amount.toFixed(2)}. Current total: $${total.toFixed(2)}`);
        return;
      }
    }

    if (form.split_type === 'PERCENTAGE') {
      const total = getCustomAmountsTotal();
      if (Math.abs(total - 100) > 0.01) {
        setError(`Percentages must sum to 100%. Current total: ${total.toFixed(2)}%`);
        return;
      }
    }

    const payload: any = {
      description: form.description,
      amount: amount,
      paid_by_id: form.paid_by_id,
      split_type: form.split_type,
      participant_ids: Array.from(selectedParticipants),
      notes: form.notes,
    };

    if (form.split_type !== 'EQUAL') {
      // Build custom_amounts only for selected participants
      const ca: Record<number, number> = {};
      selectedParticipants.forEach((uid) => {
        ca[uid] = parseFloat(customAmounts[uid] || '0') || 0;
      });
      payload.custom_amounts = ca;
    }

    try {
      await createExpense.mutateAsync(payload);
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (typeof data === 'object' && data !== null) {
        // Extract the first readable error message
        const firstKey = Object.keys(data)[0];
        const firstVal = data[firstKey];
        if (Array.isArray(firstVal)) {
          setError(`${firstKey}: ${firstVal[0]}`);
        } else if (typeof firstVal === 'string') {
          setError(`${firstKey}: ${firstVal}`);
        } else {
          setError(JSON.stringify(data));
        }
      } else {
        setError(data || 'Failed to create expense. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold mb-5">Add Expense</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              placeholder="e.g. Dinner at Restaurant"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Paid By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paid By *
            </label>
            <select
              value={form.paid_by_id}
              onChange={(e) => setForm({ ...form, paid_by_id: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.username} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Split Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Split Type
            </label>
            <select
              value={form.split_type}
              onChange={(e) => setForm({ ...form, split_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="EQUAL">Equal Split</option>
              <option value="EXACT">Exact Amounts</option>
              <option value="PERCENTAGE">By Percentage</option>
            </select>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Split Between *
              <span className="font-normal text-gray-400 ml-1">
                ({selectedParticipants.size} selected)
              </span>
            </label>

            {/* Helper text for custom splits */}
            {form.split_type === 'EXACT' && form.amount && (
              <p className="text-xs text-gray-500 mb-2">
                Total must equal ${parseFloat(form.amount || '0').toFixed(2)} · 
                Current: ${getCustomAmountsTotal().toFixed(2)}
              </p>
            )}
            {form.split_type === 'PERCENTAGE' && (
              <p className="text-xs text-gray-500 mb-2">
                Total must equal 100% · Current: {getCustomAmountsTotal().toFixed(1)}%
              </p>
            )}

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                    selectedParticipants.has(member.id)
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => toggleParticipant(member.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.has(member.id)}
                    onChange={() => toggleParticipant(member.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{member.username}</p>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>

                  {/* Equal split — show calculated share */}
                  {form.split_type === 'EQUAL' && selectedParticipants.has(member.id) && form.amount && (
                    <span className="text-xs text-indigo-600 font-medium shrink-0">
                      ${(parseFloat(form.amount) / selectedParticipants.size).toFixed(2)}
                    </span>
                  )}

                  {/* Custom amount input for EXACT/PERCENTAGE */}
                  {form.split_type !== 'EQUAL' && selectedParticipants.has(member.id) && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customAmounts[member.id] || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        setCustomAmounts({ ...customAmounts, [member.id]: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder={form.split_type === 'PERCENTAGE' ? '%' : '$'}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createExpense.isPending}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {createExpense.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Expense'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
