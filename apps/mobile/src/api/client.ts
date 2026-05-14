import type { ApiError } from '@hkd-pos/shared';
import Constants from 'expo-constants';

import { useAuthStore } from '../store/auth.js';

const baseUrl: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

export class ApiClientError extends Error {
  constructor(public readonly status: number, public readonly body: ApiError) {
    super(body.message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Set true for endpoints that don't require auth (e.g. /v1/auth/*). */
  anonymous?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!opts.anonymous) {
    const token = await useAuthStore.getState().getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}/v1${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    throw new ApiClientError(res.status, (data as ApiError) ?? { code: 'INTERNAL_ERROR', message: res.statusText });
  }

  return data as T;
}
