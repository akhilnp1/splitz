'use client';

import { useState } from 'react';
import { useGroups, useCreateGroup, useAllGroupsNetBalance } from '@/hooks/useGroups';
import { useCurrentUser } from '@/hooks/useAuth';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Plus,
  LogOut,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  X,
} from 'lucide-react';

export default function DashboardClient() {
  const router = useRouter();
  const { data: groups, isLoading } = useGroups();
  const { data: currentUser } = useCurrentUser();
  const createGroup = useCreateGroup();
  const [showModal, setShowModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState('');

  // Fetch net balances for all groups in parallel
  const groupIds = groups?.map((g) => g.id) ?? [];
  const { data: netBalances } = useAllGroupsNetBalance(groupIds, currentUser?.id ?? null);

  // Compute overall summary across all groups
  const overallNet = Object.values(netBalances ?? {}).reduce(
    (acc, { net }) => acc + net,
    0
  );
  const totalOwed = Object.values(netBalances ?? {}).reduce(
    (acc, { totalOwed }) => acc + totalOwed,
    0
  );
  const totalToPay = Object.values(netBalances ?? {}).reduce(
    (acc, { totalToPay }) => acc + totalToPay,
    0
  );

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      await createGroup.mutateAsync(newGroup);
      setShowModal(false);
      setNewGroup({ name: '', description: '' });
    } catch (err: any) {
      const data = err?.response?.data;
      setCreateError(data?.name?.[0] || data?.detail || 'Failed to create group.');
    }
  };

const handleLogout = async () => {
  await logout();
  window.location.href = '/login'; // ✅ full reload, wipes everything
};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
              S
            </div>
            <h1 className="text-xl font-bold text-gray-900">Split-It</h1>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="text-sm text-gray-500 hidden sm:block">
                Hi, <span className="font-medium text-gray-700">{currentUser.username}</span>
              </span>
            )}
            <button
              onClick={() => { setShowModal(true); setCreateError(''); }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              <Plus size={15} /> New Group
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm"
            >
              <LogOut size={15} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Overall Net Balance Summary ── */}
        {groups && groups.length > 0 && netBalances && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Total Owed to You */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 font-medium">Total Owed to You</p>
                <div className="bg-green-100 p-2 rounded-lg">
                  <TrendingUp size={16} className="text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">
                ${totalOwed.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">across all groups</p>
            </div>

            {/* Total You Owe */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 font-medium">Total You Owe</p>
                <div className="bg-red-100 p-2 rounded-lg">
                  <TrendingDown size={16} className="text-red-500" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-500">
                ${totalToPay.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">across all groups</p>
            </div>

            {/* Net Balance */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 font-medium">Net Balance</p>
                <div
                  className={`p-2 rounded-lg ${
                    overallNet > 0
                      ? 'bg-green-100'
                      : overallNet < 0
                      ? 'bg-red-100'
                      : 'bg-gray-100'
                  }`}
                >
                  <DollarSign
                    size={16}
                    className={
                      overallNet > 0
                        ? 'text-green-600'
                        : overallNet < 0
                        ? 'text-red-500'
                        : 'text-gray-400'
                    }
                  />
                </div>
              </div>
              <p
                className={`text-2xl font-bold ${
                  overallNet > 0
                    ? 'text-green-600'
                    : overallNet < 0
                    ? 'text-red-500'
                    : 'text-gray-500'
                }`}
              >
                {overallNet > 0 ? '+' : ''}
                {overallNet.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {overallNet > 0
                  ? 'overall you are owed'
                  : overallNet < 0
                  ? 'overall you owe'
                  : 'all settled up'}
              </p>
            </div>
          </div>
        )}

        {/* ── Groups Section ── */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">Your Groups</h2>
          {groups && groups.length > 0 && (
            <span className="text-sm text-gray-400">{groups.length} group{groups.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-6" />
                <div className="h-6 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : groups?.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="opacity-40" />
            </div>
            <p className="text-lg font-medium text-gray-500 mb-1">No groups yet</p>
            <p className="text-sm mb-5">Create a group to start splitting expenses</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus size={15} /> Create First Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups?.map((group) => {
              const balance = netBalances?.[group.id];
              const net = balance?.net ?? null;
              const isLoaded = balance !== undefined;

              return (
                <Link key={group.id} href={`/groups/${group.id}`}>
                  <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 hover:border-indigo-200 group h-full flex flex-col">
                    {/* Group Name & Description */}
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition mb-1">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>

                    {/* ── NET BALANCE BADGE ── */}
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      {!isLoaded ? (
                        <div className="h-8 bg-gray-100 rounded-lg animate-pulse w-24" />
                      ) : net === null || net === 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="bg-gray-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                            <Minus size={12} className="text-gray-400" />
                            <span className="text-sm font-medium text-gray-400">Settled up</span>
                          </div>
                        </div>
                      ) : net > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-green-600" />
                            <span className="text-sm font-semibold text-green-700">
                              +${net.toFixed(2)} owed to you
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                            <TrendingDown size={12} className="text-red-500" />
                            <span className="text-sm font-semibold text-red-600">
                              -${Math.abs(net).toFixed(2)} you owe
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Member count & date */}
                      <div className="flex items-center justify-between mt-3">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Users size={11} /> {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-300">
                          {new Date(group.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Create Group Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Create New Group</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name *
                </label>
                <input
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  required
                  maxLength={255}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  placeholder="e.g. Trip to Goa, Flatmates, Office Lunch"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm resize-none"
                  rows={3}
                  placeholder="What's this group for?"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroup.isPending}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 text-sm font-medium flex items-center justify-center gap-2"
                >
                  {createGroup.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Group'
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
