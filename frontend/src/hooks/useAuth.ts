import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { User } from '@/types';

export const useCurrentUser = () => {
  return useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data } = await api.get('/auth/profile/');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
