import { supabase } from './client.ts';
import type { ApiTokenInsert, ApiTokenRow } from './types.ts';

export interface ApiTokenEntity {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedApiTokenResult {
  token: string;
  tokenRecord: ApiTokenEntity;
}

export class ApiTokenError extends Error {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'ApiTokenError';
    this.originalError = originalError;
  }
}

/**
 * Converts a byte array or buffer to standard base64url string
 * without padding (=) per RFC 4648 § 5.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generates a plaintext API token conforming to the security contract:
 * Prefix 'gd_' followed by 32 random bytes from crypto.getRandomValues encoded base64url.
 */
export function generatePlaintextToken(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return 'gd_' + bytesToBase64Url(randomBytes);
}

/**
 * Computes SHA-256 of the token string using crypto.subtle.digest, hex-encoded (64 chars).
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function mapRowToEntity(row: ApiTokenRow): ApiTokenEntity {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * Creates a personal API token for a user.
 * Generates plaintext token, computes SHA-256 hex hash, and stores ONLY the hash.
 * Returns the PLAINTEXT token exactly once alongside the entity.
 */
export async function createApiToken(
  userId: string,
  label: string
): Promise<CreatedApiTokenResult> {
  if (!userId) {
    throw new ApiTokenError('userId is required to create an API token');
  }
  const normalizedLabel = typeof label === 'string' ? label.trim() : '';
  if (!normalizedLabel) {
    throw new ApiTokenError('label is required to create an API token');
  }

  const plaintextToken = generatePlaintextToken();
  const tokenHash = await hashToken(plaintextToken);

  const insertPayload: ApiTokenInsert = {
    user_id: userId,
    label: normalizedLabel,
    token_hash: tokenHash,
  };

  const { data, error } = await supabase
    .from('api_tokens')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    throw new ApiTokenError(
      `Failed to create API token: ${error?.message ?? 'no data returned'}`,
      error
    );
  }

  return {
    token: plaintextToken,
    tokenRecord: mapRowToEntity(data),
  };
}

/**
 * Lists all API tokens for a user, ordered by creation date descending.
 * CRITICAL: Strips token_hash and returns id, label, createdAt, lastUsedAt, revokedAt only.
 */
export async function listApiTokens(userId: string): Promise<ApiTokenEntity[]> {
  if (!userId) {
    throw new ApiTokenError('userId is required to list API tokens');
  }

  const { data, error } = await supabase
    .from('api_tokens')
    .select('id, label, created_at, last_used_at, revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiTokenError(
      `Failed to list API tokens: ${error.message}`,
      error
    );
  }

  return (data || []).map((row) => ({
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  }));
}

/**
 * Revokes an API token by setting revoked_at to the current timestamp.
 * Scoped by user_id and tokenId.
 */
export async function revokeApiToken(
  userId: string,
  tokenId: string
): Promise<ApiTokenEntity> {
  if (!userId) {
    throw new ApiTokenError('userId is required to revoke an API token');
  }
  if (!tokenId) {
    throw new ApiTokenError('tokenId is required to revoke an API token');
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('api_tokens')
    .update({ revoked_at: now })
    .eq('id', tokenId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new ApiTokenError(
      `Failed to revoke API token: ${error?.message ?? 'token not found or unauthorized'}`,
      error
    );
  }

  return mapRowToEntity(data);
}
