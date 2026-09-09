import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCycleDays, upsertCycleDays } from './cycleDaysRepository.ts';
import { supabase } from './client.ts';

vi.mock('./client.ts', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('cycleDaysRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listCycleDays', () => {
    it('throws if userId or cycleId is missing', async () => {
      await expect(listCycleDays('', 'cycle-123')).rejects.toThrow('userId is required');
      await expect(listCycleDays('user-123', '')).rejects.toThrow('cycleId is required');
    });

    it('queries cycle_days filtering by user_id and cycle_id ordered by day asc', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'row-1',
            cycle_id: 'cycle-123',
            user_id: 'user-123',
            day: '2026-09-01',
            allowance_cents: 100000,
            spent_cents: 50000,
            saved_cents: 50000,
            sealed_at: '2026-09-02T00:00:00Z',
          },
        ],
        error: null,
      });

      const mockEqCycle = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqCycle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      const res = await listCycleDays('user-123', 'cycle-123');

      expect(supabase.from).toHaveBeenCalledWith('cycle_days');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEqUser).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockEqCycle).toHaveBeenCalledWith('cycle_id', 'cycle-123');
      expect(mockOrder).toHaveBeenCalledWith('day', { ascending: true });

      expect(res).toEqual([
        {
          id: 'row-1',
          cycleId: 'cycle-123',
          userId: 'user-123',
          day: '2026-09-01',
          allowanceCents: 100000,
          spentCents: 50000,
          savedCents: 50000,
          sealedAt: '2026-09-02T00:00:00Z',
        },
      ]);
    });

    it('throws when supabase returns an error', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' },
      });
      const mockEqCycle = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqCycle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

      await expect(listCycleDays('user-123', 'cycle-123')).rejects.toThrow(
        'Failed to list cycle days: Database connection error'
      );
    });
  });

  describe('upsertCycleDays', () => {
    it('throws if userId is missing', async () => {
      await expect(upsertCycleDays('', [{ cycle_id: 'c1', day: '2026-09-01', allowance_cents: 100, spent_cents: 50 }])).rejects.toThrow('userId is required');
    });

    it('returns empty array if rows are empty without making network call', async () => {
      const res = await upsertCycleDays('user-123', []);
      expect(res).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('upserts rows with onConflict cycle_id,day', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'row-1',
            cycle_id: 'cycle-123',
            user_id: 'user-123',
            day: '2026-09-01',
            allowance_cents: 100000,
            spent_cents: 50000,
            saved_cents: 50000,
            sealed_at: '2026-09-02T00:00:00Z',
          },
        ],
        error: null,
      });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
      vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);

      const res = await upsertCycleDays('user-123', [
        {
          cycle_id: 'cycle-123',
          day: '2026-09-01',
          allowance_cents: 100000,
          spent_cents: 50000,
        },
      ]);

      expect(supabase.from).toHaveBeenCalledWith('cycle_days');
      expect(mockUpsert).toHaveBeenCalledWith(
        [
          {
            cycle_id: 'cycle-123',
            user_id: 'user-123',
            day: '2026-09-01',
            allowance_cents: 100000,
            spent_cents: 50000,
          },
        ],
        { onConflict: 'cycle_id,day' }
      );
      expect(res).toEqual([
        {
          id: 'row-1',
          cycleId: 'cycle-123',
          userId: 'user-123',
          day: '2026-09-01',
          allowanceCents: 100000,
          spentCents: 50000,
          savedCents: 50000,
          sealedAt: '2026-09-02T00:00:00Z',
        },
      ]);
    });

    it('throws when upsert returns an error', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Conflict constraint violation' },
      });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
      vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);

      await expect(
        upsertCycleDays('user-123', [
          {
            cycle_id: 'cycle-123',
            day: '2026-09-01',
            allowance_cents: 100000,
            spent_cents: 50000,
          },
        ])
      ).rejects.toThrow('Failed to upsert cycle days: Conflict constraint violation');
    });
  });
});
