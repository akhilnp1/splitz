import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Expense, Repayment } from '@/types';

export const useExpenses = (groupId: number) => {
  return useQuery<Expense[]>({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/expenses/`);
      return data.results || data;
    },
    enabled: !!groupId,
  });
};

export const useCreateExpense = (groupId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      description: string;
      amount: number;
      paid_by_id: number;
      split_type: string;
      participant_ids: number[];
      custom_amounts?: Record<number, number>;
      notes?: string;
    }) => api.post(`/groups/${groupId}/expenses/`, payload).then((r) => r.data),
    onSuccess: () => {
      // Invalidate all related queries for instant UI update
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'settlements'] });
    },
  });
};

export const useDeleteExpense = (groupId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: number) =>
      api.delete(`/expenses/${expenseId}/`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'settlements'] });
    },
  });
};

export const useCreateRepayment = (groupId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { paid_to_id: number; amount: number; note?: string }) =>
      api.post(`/groups/${groupId}/repayments/`, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'settlements'] });
    },
  });
};