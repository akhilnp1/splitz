import Cookies from 'js-cookie';
import api from './api';
import { QueryClient } from '@tanstack/react-query';

// Shared queryClient instance so auth functions can clear cache
let _queryClient: QueryClient | null = null;

export const setQueryClient = (qc: QueryClient) => {
  _queryClient = qc;
};

export const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login/', { email, password });

  // Clear ALL cached data from previous user before setting new tokens
  if (_queryClient) {
    _queryClient.clear();
  }

  Cookies.set('access_token', data.access, { expires: 1 });
  Cookies.set('refresh_token', data.refresh, { expires: 7 });
  return data;
};

export const register = async (
  username: string,
  email: string,
  password: string,
  password2: string
) => {
  const { data } = await api.post('/auth/register/', {
    username,
    email,
    password,
    password2,
  });

  if (_queryClient) {
    _queryClient.clear();
  }

  Cookies.set('access_token', data.tokens.access, { expires: 1 });
  Cookies.set('refresh_token', data.tokens.refresh, { expires: 7 });
  return data;
};

export const logout = async () => {
  const refresh = Cookies.get('refresh_token');
  if (refresh) {
    await api.post('/auth/logout/', { refresh }).catch(() => {});
  }

  // Clear all cached query data on logout
  if (_queryClient) {
    _queryClient.clear();
  }

  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
};

export const isAuthenticated = () => !!Cookies.get('access_token');