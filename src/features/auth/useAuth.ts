import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client.ts';

/**
 * User type from /api/auth/me
 * Matches backend routes/authentication.py get_current_user response
 */
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'technician' | 'sales' | 'user';
  permissions?: Record<string, Record<string, boolean>>;
  technician_id?: string;
}

/**
 * Auth response wrapper
 */
interface AuthResponse {
  user: User;
}

/**
 * Auth hook - checks session validity via /api/auth/me
 *
 * The backend expects session cookie (set at login) and returns user data.
 * On 401, the apiClient interceptor redirects to login page.
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async (): Promise<AuthResponse> => {
      const { data } = await apiClient.get('/auth/me');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const user = data?.user;

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    queryClient.clear();
    // Stay within React SPA - navigate to React login page
    window.location.href = '/app/login';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isTechnician: user?.role === 'technician',
    isSales: user?.role === 'sales',
    // Helper to get full name
    fullName: user ? `${user.first_name} ${user.last_name}` : undefined,
    logout,
    refetch,
  };
}
