import { apiClient } from '@/data/http/api-client';

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Thin typed wrapper over the /auth/* REST endpoints — no logic, just shapes. */
export const authApi = {
  register: (input: { email: string; password: string; displayName: string }) =>
    apiClient.post<AuthResult>('/auth/register', input),

  login: (input: { email: string; password: string }) =>
    apiClient.post<AuthResult>('/auth/login', input),

  guest: () => apiClient.post<AuthResult>('/auth/guest'),

  upgrade: (input: { email: string; password: string; displayName: string }) =>
    apiClient.post<AuthResult>('/auth/upgrade', input),

  refresh: (refreshToken: string) =>
    apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken,
    }),

  verifyEmail: (token: string) =>
    apiClient.post<{ success: true }>('/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    apiClient.post<{ success: true }>('/auth/resend-verification', { email }),

  requestPasswordReset: (email: string) =>
    apiClient.post<{ success: true }>('/auth/request-password-reset', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<{ success: true }>('/auth/reset-password', { token, newPassword }),
};
