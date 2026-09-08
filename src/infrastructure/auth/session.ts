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
 * Returns the currently authenticated user's ID, or null if no user is signed in.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new AuthSessionError(
      `Failed to retrieve current user session: ${error.message}`,
      error
    );
  }

  return data.session?.user?.id ?? null;
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
