import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Group, Balance, Settlement } from '@/types';

export const useGroups = () => {
  return useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await api.get('/groups/');
      return data.results || data;
    },
  });
};

export const useGroup = (id: number) => {
  return useQuery<Group>({
    queryKey: ['groups', id],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${id}/`);
      return data;
    },
    enabled: !!id,
  });
};

export const useGroupBalances = (groupId: number) => {
  return useQuery<Balance[]>({
    queryKey: ['groups', groupId, 'balances'],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/balances/`);
      return data;
    },
    enabled: !!groupId,
  });
};

// Fetch balances for ALL groups and compute current user's net per group
export const useAllGroupsNetBalance = (groupIds: number[], currentUserId: number | null) => {
  return useQuery({
    queryKey: ['all-balances', groupIds, currentUserId],
    queryFn: async () => {
      if (!groupIds.length || !currentUserId) return {};
      const results = await Promise.all(
        groupIds.map((id) =>
          api.get(`/groups/${id}/balances/`).then((r) => ({ id, balances: r.data }))
        )
      );
      // Map: groupId -> { balance, totalOwed, totalToPay }
      const netMap: Record<number, { net: number; totalOwed: number; totalToPay: number }> = {};
      for (const { id, balances } of results) {
        const userBalance = balances.find((b: Balance) => b.user_id === currentUserId);
        const net = userBalance ? parseFloat(userBalance.balance) : 0;
        netMap[id] = {
          net,
          totalOwed: net > 0 ? net : 0,
          totalToPay: net < 0 ? Math.abs(net) : 0,
        };
      }
      return netMap;
    },
    enabled: groupIds.length > 0 && !!currentUserId,
    staleTime: 30 * 1000,
  });
};

export const useGroupSettlements = (groupId: number) => {
  return useQuery<Settlement[]>({
    queryKey: ['groups', groupId, 'settlements'],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/settlements/`);
      return data;
    },
    enabled: !!groupId,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post('/groups/', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useAddMember = (groupId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      api.post(`/groups/${groupId}/add-member/`, { email }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
};
