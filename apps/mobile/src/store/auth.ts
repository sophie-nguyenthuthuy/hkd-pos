import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { api } from '../api/client.js';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds; we recompute expiry on hydrate as `now + expiresIn`. */
  expiresIn: number;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  fullName: string | null;
  ready: boolean;

  hydrate(): Promise<void>;
  requestOtp(phone: string, purpose: 'LOGIN' | 'REGISTER'): Promise<void>;
  verifyOtp(args: { phone: string; otp: string; purpose: 'LOGIN' | 'REGISTER'; fullName?: string }): Promise<void>;
  logout(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}

const REFRESH_KEY = 'hkd-pos.refreshToken';
const REFRESH_SKEW_MS = 30_000;

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  expiresAt: 0,
  fullName: null,
  ready: false,

  async hydrate() {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken) {
      set({ ready: true });
      return;
    }
    try {
      const tokens = await api<AuthTokens>('/auth/token/refresh', {
        method: 'POST',
        body: { refreshToken },
        anonymous: true,
      });
      await persistRefresh(tokens.refreshToken);
      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
        ready: true,
      });
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      set({ ready: true });
    }
  },

  async requestOtp(phone, purpose) {
    await api<void>('/auth/otp/request', {
      method: 'POST',
      body: { phone, purpose },
      anonymous: true,
    });
  },

  async verifyOtp({ phone, otp, purpose, fullName }) {
    const tokens = await api<AuthTokens>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, otp, purpose, fullName },
      anonymous: true,
    });
    await persistRefresh(tokens.refreshToken);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      fullName: fullName ?? null,
    });
  },

  async logout() {
    const refreshToken = get().refreshToken;
    if (refreshToken) {
      try {
        await api<void>('/auth/logout', { method: 'POST', body: { refreshToken }, anonymous: true });
      } catch {
        // ignore — local state is the source of truth for "logged out".
      }
    }
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null, expiresAt: 0, fullName: null });
  },

  async getAccessToken() {
    const state = get();
    if (state.accessToken && state.expiresAt - REFRESH_SKEW_MS > Date.now()) {
      return state.accessToken;
    }
    if (!state.refreshToken) return null;
    try {
      const tokens = await api<AuthTokens>('/auth/token/refresh', {
        method: 'POST',
        body: { refreshToken: state.refreshToken },
        anonymous: true,
      });
      await persistRefresh(tokens.refreshToken);
      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
      });
      return tokens.accessToken;
    } catch {
      return null;
    }
  },
}));

async function persistRefresh(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
