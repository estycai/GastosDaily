import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendMagicLink,
  signInWithGoogle,
  getCurrentUserId,
  onAuthStateChange,
  signOut,
  InvalidEmailError,
  MagicLinkAuthError,
  OAuthAuthError,
  AuthSessionError,
  SignOutError,
  isValidEmail,
} from './session.ts';
import { supabase } from '../supabase/client.ts';

vi.mock('../supabase/client.ts', () => {
  return {
    supabase: {
      auth: {
        signInWithOtp: vi.fn(),
        signInWithOAuth: vi.fn(),
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
        signOut: vi.fn(),
      },
    },
  };
});

describe('session - auth utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidEmail', () => {
    it('validates well-formed emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      // @ts-expect-error test non-string input
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('sendMagicLink', () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it('throws InvalidEmailError for invalid email without calling Supabase', async () => {
      await expect(sendMagicLink('not-an-email')).rejects.toThrow(InvalidEmailError);
      await expect(sendMagicLink('')).rejects.toThrow(InvalidEmailError);
      expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it('calls supabase.auth.signInWithOtp with email and window.location.origin redirect when window is defined', async () => {
      globalThis.window = {
        location: { origin: 'https://app.gastosdaily.com' },
      } as any;

      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
        data: {} as any,
        error: null,
      });

      await sendMagicLink('user@example.com');

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: {
          emailRedirectTo: 'https://app.gastosdaily.com',
        },
      });
    });

    it('handles environment where window is undefined gracefully', async () => {
      // @ts-expect-error delete window in test environment
      delete globalThis.window;

      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
        data: {} as any,
        error: null,
      });

      await sendMagicLink('user@example.com');

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: {
          emailRedirectTo: undefined,
        },
      });
    });

    it('throws MagicLinkAuthError when Supabase returns an error', async () => {
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
        data: {} as any,
        error: { message: 'Rate limit exceeded', status: 429, name: 'AuthApiError' } as any,
      });

      await expect(sendMagicLink('user@example.com')).rejects.toThrow(MagicLinkAuthError);
    });
  });

  describe('signInWithGoogle', () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it('calls supabase.auth.signInWithOAuth with the google provider and origin redirect', async () => {
      globalThis.window = {
        location: { origin: 'https://app.gastosdaily.com' },
      } as any;

      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: {} as any,
        error: null,
      });

      await signInWithGoogle();

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://app.gastosdaily.com',
          queryParams: { prompt: 'select_account' },
        },
      });
    });

    it('handles environment where window is undefined gracefully', async () => {
      // @ts-expect-error delete window in test environment
      delete globalThis.window;

      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: {} as any,
        error: null,
      });

      await signInWithGoogle();

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: undefined,
          queryParams: { prompt: 'select_account' },
        },
      });
    });

    it('throws OAuthAuthError when Supabase returns an error', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: {} as any,
        error: { message: 'Network error', status: 500, name: 'AuthApiError' } as any,
      });

      await expect(signInWithGoogle()).rejects.toThrow(OAuthAuthError);
    });

    it('maps a disabled provider error to a friendly message', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: {} as any,
        error: { message: 'Unsupported provider: provider is not enabled', status: 400, name: 'AuthApiError' } as any,
      });

      await expect(signInWithGoogle()).rejects.toThrow(
        'El inicio de sesión con Google todavía no está habilitado. Probá con el enlace por correo.'
      );
    });

    it('wraps a rejection thrown by the Supabase SDK into an OAuthAuthError', async () => {
      const transportError = new Error('Failed to fetch');
      vi.mocked(supabase.auth.signInWithOAuth).mockRejectedValueOnce(transportError);

      await expect(signInWithGoogle()).rejects.toThrow(OAuthAuthError);
    });

    it('preserves the generic message and originalError when the SDK rejects', async () => {
      const transportError = new Error('Failed to fetch');
      vi.mocked(supabase.auth.signInWithOAuth).mockRejectedValueOnce(transportError);

      await expect(signInWithGoogle()).rejects.toMatchObject({
        name: 'OAuthAuthError',
        message: 'No pudimos iniciar sesión con Google. Intentalo de nuevo.',
        originalError: transportError,
      });
    });

    it('does not double-wrap an OAuthAuthError it mapped itself', async () => {
      const providerError = {
        message: 'Unsupported provider: provider is not enabled',
        status: 400,
        name: 'AuthApiError',
      };

      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValueOnce({
        data: {} as any,
        error: providerError as any,
      });

      await expect(signInWithGoogle()).rejects.toMatchObject({
        name: 'OAuthAuthError',
        message:
          'El inicio de sesión con Google todavía no está habilitado. Probá con el enlace por correo.',
        originalError: providerError,
      });
    });
  });

  describe('getCurrentUserId', () => {
    it('returns user ID when an active session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'user-123' },
          } as any,
        },
        error: null,
      });

      const userId = await getCurrentUserId();
      expect(userId).toBe('user-123');
    });

    it('returns null when there is no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const userId = await getCurrentUserId();
      expect(userId).toBeNull();
    });

    it('throws AuthSessionError when Supabase getSession fails', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session storage corrupted', status: 500, name: 'AuthSessionMissingError' } as any,
      });

      await expect(getCurrentUserId()).rejects.toThrow(AuthSessionError);
    });
  });

  describe('onAuthStateChange', () => {
    it('registers callback and returns unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValueOnce({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
            id: 'sub-1',
            callback: vi.fn(),
          },
        },
      });

      const callback = vi.fn();
      const unsubscribe = onAuthStateChange(callback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(callback);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('signOut', () => {
    it('calls supabase.auth.signOut successfully', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      });

      await expect(signOut()).resolves.toBeUndefined();
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('throws SignOutError when Supabase signOut fails', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: { message: 'Network error', status: 500, name: 'AuthError' } as any,
      });

      await expect(signOut()).rejects.toThrow(SignOutError);
    });
  });
});
