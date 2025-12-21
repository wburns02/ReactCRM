import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client.ts';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  SystemSettings,
  NotificationSettings,
  IntegrationSettings,
  SecuritySettings,
} from '@/api/types/admin.ts';

/**
 * Users API hooks
 */

export function useUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async (): Promise<User[]> => {
      const { data } = await apiClient.get('/admin/users');
      return data.users || [];
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput): Promise<User> => {
      const { data } = await apiClient.post('/admin/users', input);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateUserInput;
    }): Promise<User> => {
      const { data } = await apiClient.patch(`/admin/users/${id}`, input);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

/**
 * Settings API hooks
 */

export function useSystemSettings() {
  return useQuery({
    queryKey: ['admin', 'settings', 'system'],
    queryFn: async (): Promise<SystemSettings> => {
      const { data } = await apiClient.get('/admin/settings/system');
      return data.settings;
    },
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<SystemSettings>): Promise<SystemSettings> => {
      const { data } = await apiClient.patch('/admin/settings/system', input);
      return data.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'system'] });
    },
  });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['admin', 'settings', 'notifications'],
    queryFn: async (): Promise<NotificationSettings> => {
      const { data } = await apiClient.get('/admin/settings/notifications');
      return data.settings;
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Partial<NotificationSettings>
    ): Promise<NotificationSettings> => {
      const { data } = await apiClient.patch('/admin/settings/notifications', input);
      return data.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'notifications'] });
    },
  });
}

export function useIntegrationSettings() {
  return useQuery({
    queryKey: ['admin', 'settings', 'integrations'],
    queryFn: async (): Promise<IntegrationSettings> => {
      const { data } = await apiClient.get('/admin/settings/integrations');
      return data.settings;
    },
  });
}

export function useUpdateIntegrationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Partial<IntegrationSettings>
    ): Promise<IntegrationSettings> => {
      const { data } = await apiClient.patch('/admin/settings/integrations', input);
      return data.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'integrations'] });
    },
  });
}

export function useSecuritySettings() {
  return useQuery({
    queryKey: ['admin', 'settings', 'security'],
    queryFn: async (): Promise<SecuritySettings> => {
      const { data } = await apiClient.get('/admin/settings/security');
      return data.settings;
    },
  });
}

export function useUpdateSecuritySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<SecuritySettings>): Promise<SecuritySettings> => {
      const { data } = await apiClient.patch('/admin/settings/security', input);
      return data.settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'security'] });
    },
  });
}
