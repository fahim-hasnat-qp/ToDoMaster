import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type AuthResult, type AuthUser } from './auth-api';
import { setAuthAccessors } from '@/data/http/api-client';
import { logger } from '@/core/logger';
import { analytics } from '@/core/analytics';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** True once the store has attempted its initial guest bootstrap. */
  ready: boolean;

  /** Ensures there's always a logged-in identity — creates a guest on first launch. */
  ensureSession: () => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  upgradeGuest: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<boolean>;
  markEmailVerified: () => void;
}

function applyAuthResult(result: AuthResult) {
  return {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      ready: false,

      ensureSession: async () => {
        if (get().user) {
          set({ ready: true });
          return;
        }
        try {
          const result = await authApi.guest();
          set({ ...applyAuthResult(result), ready: true });
          analytics.track('guest_session_created');
        } catch (error) {
          logger.error('Failed to create guest session', error);
          // App still works fully offline without a session — sync just stays
          // disabled until connectivity + a session are both available.
          set({ ready: true });
        }
      },

      register: async (input) => {
        const result = await authApi.register(input);
        set(applyAuthResult(result));
        analytics.track('user_registered');
      },

      login: async (input) => {
        const result = await authApi.login(input);
        set(applyAuthResult(result));
        analytics.track('user_logged_in');
      },

      upgradeGuest: async (input) => {
        const result = await authApi.upgrade(input);
        set(applyAuthResult(result));
        analytics.track('guest_upgraded');
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        analytics.track('user_logged_out');
      },

      refreshTokens: async () => {
        const current = get().refreshToken;
        if (!current) return false;
        try {
          const tokens = await authApi.refresh(current);
          set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          return true;
        } catch (error) {
          logger.error('Token refresh failed', error);
          set({ user: null, accessToken: null, refreshToken: null });
          return false;
        }
      },

      markEmailVerified: () => {
        const user = get().user;
        if (user) set({ user: { ...user, emailVerified: true } });
      },
    }),
    { name: 'todomaster.auth' },
  ),
);

// Break the auth-store <-> api-client import cycle: api-client needs to read
// the current token and trigger a refresh, without importing this store's
// full surface (or causing a circular module dependency at load time).
setAuthAccessors({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshTokens: () => useAuthStore.getState().refreshTokens(),
});
