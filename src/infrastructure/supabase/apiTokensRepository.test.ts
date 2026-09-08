import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
  generatePlaintextToken,
  hashToken,
  bytesToBase64Url,
  ApiTokenError,
} from './apiTokensRepository.ts';
import { supabase } from './client.ts';

vi.mock('./client.ts', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('apiTokensRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token generation & hashing security contract', () => {
    it('generates token starting with gd_ prefix followed by 43 base64url characters (32 bytes)', () => {
      const token = generatePlaintextToken();
      expect(token.startsWith('gd_')).toBe(true);

      const payload = token.slice(3);
      // 32 bytes in base64url is ceil(32 * 4 / 3) = 43 chars (without padding)
      expect(payload).toHaveLength(43);
      // base64url characters only: A-Z, a-z, 0-9, -, _
      expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('hashes token into a 64-character lowercase hex string using SHA-256', async () => {
      const token = 'gd_test-token-value-1234567890';
      const hash = await hashToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('always produces the identical hash for the same token', async () => {
      const token = generatePlaintextToken();
      const hash1 = await hashToken(token);
      const hash2 = await hashToken(token);
      const hash3 = await hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('never collides across 1000 generated tokens and their hashes', async () => {
      const tokenSet = new Set<string>();
      const hashSet = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        const token = generatePlaintextToken();
        expect(tokenSet.has(token)).toBe(false);
        tokenSet.add(token);

        // Verify hash determinism and uniqueness on a sample
        if (i < 50) {
          const hash = await hashToken(token);
          expect(hashSet.has(hash)).toBe(false);
          hashSet.add(hash);
        }
      }

      expect(tokenSet.size).toBe(1000);
    });

    it('correctly encodes bytes to base64url without padding', () => {
      const bytes = new Uint8Array([251, 255, 254]); // In base64: +//+
      const encoded = bytesToBase64Url(bytes);
      expect(encoded).toBe('-__-');
      expect(encoded.includes('=')).toBe(false);
    });
  });

  describe('createApiToken', () => {
    it('stores ONLY token_hash in database and returns plaintext token to caller once', async () => {
      let insertedPayload: any = null;

      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: 'token-uuid-1',
          user_id: 'user-abc',
          label: 'Apple Shortcut',
          token_hash: 'a'.repeat(64),
          created_at: '2026-09-08T12:00:00.000Z',
          last_used_at: null,
          revoked_at: null,
        },
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({ single: singleMock });

      const insertMock = vi.fn().mockImplementation((payload) => {
        insertedPayload = payload;
        return { select: selectMock };
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      const result = await createApiToken('user-abc', 'Apple Shortcut');

      // Check returned token
      expect(result.token.startsWith('gd_')).toBe(true);
      expect(result.tokenRecord.id).toBe('token-uuid-1');
      expect(result.tokenRecord.label).toBe('Apple Shortcut');
      expect(result.tokenRecord.createdAt).toBe('2026-09-08T12:00:00.000Z');
      expect(result.tokenRecord.lastUsedAt).toBeNull();
      expect(result.tokenRecord.revokedAt).toBeNull();
      // Ensure entity returned does NOT have token_hash
      expect((result.tokenRecord as any).token_hash).toBeUndefined();

      // Check insert payload sent to Supabase
      expect(insertedPayload).not.toBeNull();
      expect(insertedPayload.user_id).toBe('user-abc');
      expect(insertedPayload.label).toBe('Apple Shortcut');
      expect(insertedPayload.token_hash).toHaveLength(64);
      // Plaintext token must NEVER be stored in the insert payload
      expect(insertedPayload.token).toBeUndefined();
      expect(insertedPayload.token_hash).not.toBe(result.token);

      // Verify the stored hash matches the plaintext token
      const expectedHash = await hashToken(result.token);
      expect(insertedPayload.token_hash).toBe(expectedHash);
    });

    it('validates userId and label inputs', async () => {
      await expect(createApiToken('', 'Label')).rejects.toThrow(ApiTokenError);
      await expect(createApiToken('user-1', '')).rejects.toThrow(ApiTokenError);
      await expect(createApiToken('user-1', '   ')).rejects.toThrow(ApiTokenError);
    });

    it('throws ApiTokenError if supabase insert fails', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB connection error' },
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });

      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
      } as any);

      await expect(createApiToken('user-1', 'Test')).rejects.toThrow(ApiTokenError);
    });
  });

  describe('listApiTokens', () => {
    it('never leaks token_hash to callers and strips it completely', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'tok-1',
            label: 'Shortcut Mac',
            created_at: '2026-09-08T10:00:00Z',
            last_used_at: '2026-09-08T11:00:00Z',
            revoked_at: null,
            // Even if DB query returned token_hash by accident
            token_hash: 'secret_hash_value',
          },
          {
            id: 'tok-2',
            label: 'Shortcut iPhone',
            created_at: '2026-09-07T10:00:00Z',
            last_used_at: null,
            revoked_at: '2026-09-08T09:00:00Z',
            token_hash: 'another_secret_hash',
          },
        ],
        error: null,
      });

      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      const tokens = await listApiTokens('user-123');

      expect(supabase.from).toHaveBeenCalledWith('api_tokens');
      // Verify requested columns do not include token_hash
      expect(selectMock).toHaveBeenCalledWith('id, label, created_at, last_used_at, revoked_at');
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-123');

      expect(tokens).toHaveLength(2);
      for (const tok of tokens) {
        expect(tok).toHaveProperty('id');
        expect(tok).toHaveProperty('label');
        expect(tok).toHaveProperty('createdAt');
        expect(tok).toHaveProperty('lastUsedAt');
        expect(tok).toHaveProperty('revokedAt');
        expect((tok as any).token_hash).toBeUndefined();
        expect((tok as any).tokenHash).toBeUndefined();
      }
    });

    it('validates userId parameter', async () => {
      await expect(listApiTokens('')).rejects.toThrow(ApiTokenError);
    });

    it('throws ApiTokenError when supabase query fails', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database read failed' },
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any);

      await expect(listApiTokens('user-123')).rejects.toThrow(ApiTokenError);
    });
  });

  describe('revokeApiToken', () => {
    it('sets revoked_at timestamp and scopes query by user_id and tokenId', async () => {
      let updatedPayload: any = null;

      const singleMock = vi.fn().mockResolvedValue({
        data: {
          id: 'token-to-revoke',
          user_id: 'user-owner',
          label: 'Old Token',
          token_hash: 'hash123',
          created_at: '2026-09-01T00:00:00Z',
          last_used_at: null,
          revoked_at: '2026-09-08T15:00:00Z',
        },
        error: null,
      });

      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqUserMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqTokenMock = vi.fn().mockReturnValue({ eq: eqUserMock });

      const updateMock = vi.fn().mockImplementation((payload) => {
        updatedPayload = payload;
        return { eq: eqTokenMock };
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      const revoked = await revokeApiToken('user-owner', 'token-to-revoke');

      expect(updateMock).toHaveBeenCalled();
      expect(updatedPayload).not.toBeNull();
      expect(updatedPayload.revoked_at).toBeDefined();
      expect(eqTokenMock).toHaveBeenCalledWith('id', 'token-to-revoke');
      expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-owner');

      expect(revoked.id).toBe('token-to-revoke');
      expect(revoked.revokedAt).toBe('2026-09-08T15:00:00Z');
      expect((revoked as any).token_hash).toBeUndefined();
    });

    it('validates userId and tokenId parameters', async () => {
      await expect(revokeApiToken('', 'tok-1')).rejects.toThrow(ApiTokenError);
      await expect(revokeApiToken('user-1', '')).rejects.toThrow(ApiTokenError);
    });

    it('throws ApiTokenError if token is not found or user is unauthorized', async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Row not found' },
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqUserMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqTokenMock = vi.fn().mockReturnValue({ eq: eqUserMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqTokenMock });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
      } as any);

      await expect(revokeApiToken('user-wrong', 'tok-1')).rejects.toThrow(ApiTokenError);
    });
  });
});
