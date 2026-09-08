import { supabase } from '../supabase/client.ts';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export class InvalidEmailError extends Error {
  constructor(message = 'Invalid email address provided.') {
    super(message);
    this.name = 'InvalidEmailError';
  }
}

export class MagicLinkAuthError extends Error {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'MagicLinkAuthError';
    this.originalError = originalError;
  }
}

export class SignOutError extends Error {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'SignOutError';
    this.originalError = originalError;
  }
}

export class OAuthAuthError extends Error {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'OAuthAuthError';
    this.originalError = originalError;
  }
}

export class AuthSessionError extends Error {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'AuthSessionError';
    this.originalError = originalError;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 320) {
    return false;
  }
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Sends a magic link (OTP) to the specified email using Supabase.
 * Sets emailRedirectTo to window.location.origin.
 */
export async function sendMagicLink(email: string): Promise<void> {
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';

  if (!isValidEmail(trimmedEmail)) {
    throw new InvalidEmailError(`The email "${email}" is invalid.`);
  }

  const emailRedirectTo =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    throw new MagicLinkAuthError(
      `Failed to send magic link: ${error.message}`,
      error
    );
  }
}

/**
 * Starts the Google OAuth flow through Supabase and redirects the browser.
 * Sets redirectTo to window.location.origin and forces the account chooser.
 * No callback route is required: the Supabase client detects the session in the
 * returned URL and the active onAuthStateChange subscription picks it up.
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : undefined;

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) {
      const normalizedMessage = error.message?.toLowerCase() ?? '';
      const isProviderDisabled =
        normalizedMessage.includes('provider is not enabled') ||
        normalizedMessage.includes('unsupported provider');

      if (isProviderDisabled) {
        throw new OAuthAuthError(
          'El inicio de sesión con Google todavía no está habilitado. Probá con el enlace por correo.',
          error
        );
      }

      throw new OAuthAuthError(
        'No pudimos iniciar sesión con Google. Intentalo de nuevo.',
        error
      );
    }
  } catch (caught) {
    // Errors mapped above are already normalised: re-throw them untouched so
    // their specific message is not replaced by the generic one.
    if (caught instanceof OAuthAuthError) {
      throw caught;
    }

    // The SDK itself threw or rejected (transport/network failure), so the
    // caller never saw an `{ error }` payload. Normalise it too.
    throw new OAuthAuthError(
      'No pudimos iniciar sesión con Google. Intentalo de nuevo.',
      caught
    );
  }
}

/**
 * Returns the current session, or null if no user is signed in.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new AuthSessionError(
      `Failed to retrieve current user session: ${error.message}`,
      error
    );
  }

  return data.session;
}

/**
 * Returns the currently authenticated user's ID, or null if no user is signed in.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user?.id ?? null;
}

/**
 * Subscribes to Supabase auth state changes and returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Signs out the current user session.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new SignOutError(`Failed to sign out: ${error.message}`, error);
  }
}
