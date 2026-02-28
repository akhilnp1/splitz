'use client';

import { useState } from 'react';
import { useGroup, useGroupBalances, useGroupSettlements, useAddMember } from '@/hooks/useGroups';
import { useExpenses, useCreateExpense, useCreateRepayment } from '@/hooks/useExpenses';
import { ArrowLeft, Plus, Users, ArrowRight, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import ExpenseForm from '@/components/ExpenseForm';
import { useCurrentUser } from '@/hooks/useAuth';

export default function GroupClient({ groupId }: { groupId: number }) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settle'>('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayTarget, setRepayTarget] = useState<{
    toUserId: number;
    toUsername: string;
    suggestedAmount: string;
  } | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayNote, setRepayNote] = useState('');
  const [repayError, setRepayError] = useState('');
  const [repaySuccess, setRepaySuccess] = useState('');

  const { data: group, isLoading: groupLoading, error: groupError } = useGroup(groupId);
  const { data: expenses, isLoading: expensesLoading } = useExpenses(groupId);
  const { data: balances } = useGroupBalances(groupId);
  const { data: settlements } = useGroupSettlements(groupId);
  const addMember = useAddMember(groupId);
  const createRepayment = useCreateRepayment(groupId);
  const { data: currentUser } = useCurrentUser();

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberSuccess('');
    try {
      await addMember.mutateAsync(memberEmail);
      setMemberSuccess(`${memberEmail} added successfully!`);
      setMemberEmail('');
      setTimeout(() => {
        setShowAddMember(false);
        setMemberSuccess('');
      }, 1500);
    } catch (err: any) {
      const data = err?.response?.data;
      setMemberError(
        data?.detail || data?.email?.[0] || data?.non_field_errors?.[0] || 'Failed to add member.'
      );
    }
  };

  const openRepayModal = (toUserId: number, toUsername: string, amount: string) => {
    setRepayTarget({ toUserId, toUsername, suggestedAmount: amount });
    setRepayAmount(amount);
    setRepayNote('');
    setRepayError('');
    setRepaySuccess('');
    setShowRepayModal(true);
  };

  const handleRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepayError('');
    setRepaySuccess('');

    if (!repayTarget) return;

    const amount = parseFloat(repayAmount);
    if (!repayAmount || isNaN(amount) || amount <= 0) {
      setRepayError('Please enter a valid positive amount.');
      return;
    }

    try {
      await createRepayment.mutateAsync({
        paid_to_id: repayTarget.toUserId,
        amount,
        note: repayNote,
      });
      setRepaySuccess(`Payment of $${amount.toFixed(2)} to ${repayTarget.toUsername} recorded!`);
      setTimeout(() => {
        setShowRepayModal(false);
        setRepaySuccess('');
      }, 1800);
    } catch (err: any) {
      const data = err?.response?.data;
      setRepayError(
        data?.detail ||
        data?.amount?.[0] ||
        data?.non_field_errors?.[0] ||
        JSON.stringify(data) ||
        'Failed to record payment.'
      );
    }
  };

  if (groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <p className="text-red-600 text-lg font-semibold mb-2">Failed to load group.</p>
          <p className="text-gray-500 text-sm mb-4">You may not be a member or the group doesn't exist.</p>
          <Link href="/dashboard" className="text-indigo-600 hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'expenses', label: 'Expenses' },
    { key: 'balances', label: 'Balances' },
    { key: 'settle', label: 'Settle Up' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-3 w-fit text-sm">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              {group.description && <p className="text-gray-500 mt-1 text-sm">{group.description}</p>}
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                <Users size={14} /> {group.member_count} members
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setShowAddMember(true); setMemberError(''); setMemberSuccess(''); }}
                className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                + Member
              </button>
              <button
                onClick={() => setShowExpenseForm(true)}
                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition flex items-center gap-1"
              >
                <Plus size={14} /> Add Expense
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <div className="space-y-3">
            {expensesLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : !expenses || expenses.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg mb-2">No expenses yet.</p>
                <button onClick={() => setShowExpenseForm(true)} className="text-indigo-600 hover:underline text-sm">
                  Add the first expense →
                </button>
              </div>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Paid by <span className="font-medium text-gray-700">{expense.paid_by.username}</span>
                        {' · '}{expense.split_type} split
                      </p>
                    </div>
                    <span className="text-xl font-bold text-indigo-600">
                      ${parseFloat(expense.amount).toFixed(2)}
                    </span>
                  </div>
                  {expense.splits && expense.splits.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {expense.splits.map((split) => (
                        <span key={split.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {split.user.username}: ${parseFloat(split.amount_owed).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}
                  {expense.notes && <p className="text-xs text-gray-400 mt-2 italic">{expense.notes}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(expense.created_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* BALANCES TAB */}
        {activeTab === 'balances' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 mb-2">
              Positive = others owe you · Negative = you owe others
            </p>
            {!balances || balances.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No balance data yet.</div>
            ) : (
              balances.map((balance) => {
                const bal = parseFloat(balance.balance);
                return (
                  <div key={balance.user_id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{balance.username}</p>
                      <p className="text-sm text-gray-500">{balance.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${bal > 0 ? 'text-green-600' : bal < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {bal > 0 ? '+' : ''}{bal.toFixed(2)}
                      </span>
                      <p className="text-xs text-gray-400">
                        {bal > 0 ? 'gets back' : bal < 0 ? 'owes' : 'settled'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SETTLE UP TAB */}
        {activeTab === 'settle' && (
          <div className="space-y-3">
            {!settlements || settlements.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-xl font-semibold text-green-600">All settled up!</p>
                <p className="text-gray-500 mt-2 text-sm">No outstanding balances in this group.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-2">Minimum payments needed to settle all debts:</p>
                {settlements.map((s, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[80px]">
                          <div className="bg-red-100 text-red-700 rounded-full w-9 h-9 flex items-center justify-center font-bold text-sm mx-auto mb-1">
                            {s.from_user.username[0].toUpperCase()}
                          </div>
                          <p className="font-semibold text-red-600 text-sm">{s.from_user.username}</p>
                          <p className="text-xs text-gray-400">pays</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <ArrowRight className="text-gray-400" size={20} />
                          <span className="text-lg font-bold text-indigo-600">
                            ${parseFloat(s.amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <div className="bg-green-100 text-green-700 rounded-full w-9 h-9 flex items-center justify-center font-bold text-sm mx-auto mb-1">
                            {s.to_user.username[0].toUpperCase()}
                          </div>
                          <p className="font-semibold text-green-600 text-sm">{s.to_user.username}</p>
                          <p className="text-xs text-gray-400">receives</p>
                        </div>
                      </div>

                      {currentUser && s.from_user.id === currentUser.id ? (
                      <button
                        onClick={() => openRepayModal(s.to_user.id, s.to_user.username, s.amount)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                      >
                        <CheckCircle size={15} />
                        Pay Now
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
                        Awaiting payment
                      </span>
                    )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* Add Expense Modal */}
      {showExpenseForm && group && (
        <ExpenseForm group={group} groupId={groupId} onClose={() => setShowExpenseForm(false)} />
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-bold">Add Member</h3>
              <button onClick={() => setShowAddMember(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Enter the email of a registered user.</p>
            {memberSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {memberSuccess}
              </div>
            )}
            {memberError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {memberError}
              </div>
            )}
            <form onSubmit={handleAddMember} className="space-y-4">
              <input
                type="email" value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                required placeholder="member@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddMember(false)}
                  className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={addMember.isPending}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                  {addMember.isPending ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRepayModal && repayTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Record Payment</h3>
              <button onClick={() => setShowRepayModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5 text-center">
              <p className="text-sm text-gray-500 mb-1">Paying</p>
              <p className="text-2xl font-bold text-indigo-600 mb-1">
                ${parseFloat(repayTarget.suggestedAmount).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                to <span className="font-semibold">{repayTarget.toUsername}</span>
              </p>
            </div>

            {repaySuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <CheckCircle size={16} /> {repaySuccess}
              </div>
            )}
            {repayError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {repayError}
              </div>
            )}

            <form onSubmit={handleRepayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) *
                  <span className="font-normal text-gray-400 ml-1">
                    (suggested: ${parseFloat(repayTarget.suggestedAmount).toFixed(2)})
                  </span>
                </label>
                <input
                  type="number" step="0.01" min="0.01"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  You can enter a partial amount if paying in installments.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  value={repayNote}
                  onChange={(e) => setRepayNote(e.target.value)}
                  placeholder="e.g. Paid via UPI, Cash, GPay..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowRepayModal(false)}
                  className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={createRepayment.isPending}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60 text-sm font-medium flex items-center justify-center gap-2">
                  {createRepayment.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <><CheckCircle size={15} /> Confirm Payment</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}