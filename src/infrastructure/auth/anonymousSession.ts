import { supabase } from '../supabase/client.ts';

export class AnonymousAuthDisabledError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'Supabase Anonymous Sign-In is disabled on the project. Please enable the Anonymous provider in Supabase Dashboard > Authentication > Providers.'
    );
    this.name = 'AnonymousAuthDisabledError';
  }
}

export class AnonymousAuthError extends Error {
  readonly originalError: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'AnonymousAuthError';
    this.originalError = originalError;
  }
}

export async function ensureAnonymousSession(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new AnonymousAuthError(
      'Failed to retrieve existing Supabase session: ' + sessionError.message,
      sessionError
    );
  }

  if (sessionData.session?.user?.id) {
    return sessionData.session.user.id;
  }

  const { data: signData, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) {
    const msg = signInError.message.toLowerCase();
    if (
      signInError.status === 400 ||
      signInError.status === 403 ||
      msg.includes('anonymous') ||
      msg.includes('disabled') ||
      msg.includes('not enabled')
    ) {
      throw new AnonymousAuthDisabledError(signInError.message);
    }
    throw new AnonymousAuthError(
      'Failed to create anonymous Supabase session: ' + signInError.message,
      signInError
    );
  }

  if (!signData.user?.id) {
    throw new AnonymousAuthError('Supabase anonymous sign-in completed but returned no user ID.');
  }

  return signData.user.id;
}
