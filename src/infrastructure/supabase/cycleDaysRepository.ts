import { supabase } from './client.ts';
import type { CycleDayInsert, CycleDayRow } from './types.ts';

export interface CycleDayEntity {
  id: string;
  cycleId: string;
  userId: string;
  day: string;
  allowanceCents: number;
  spentCents: number;
  savedCents: number;
  sealedAt: string;
}

export type CreateCycleDayParams = Omit<CycleDayInsert, 'id' | 'user_id' | 'saved_cents'>;

function mapCycleDayRowToEntity(row: CycleDayRow): CycleDayEntity {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    userId: row.user_id,
    day: row.day,
    allowanceCents: row.allowance_cents,
    spentCents: row.spent_cents,
    savedCents: row.saved_cents,
    sealedAt: row.sealed_at,
  };
}

export async function listCycleDays(
  userId: string,
  cycleId: string
): Promise<CycleDayEntity[]> {
  if (!userId) {
    throw new Error('userId is required to list cycle days');
  }
  if (!cycleId) {
    throw new Error('cycleId is required to list cycle days');
  }

  const { data, error } = await supabase
    .from('cycle_days')
    .select('*')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .order('day', { ascending: true });

  if (error) {
    throw new Error('Failed to list cycle days: ' + error.message);
  }

  return (data as CycleDayRow[]).map(mapCycleDayRowToEntity);
}

export async function upsertCycleDays(
  userId: string,
  rows: CreateCycleDayParams[]
): Promise<CycleDayEntity[]> {
  if (!userId) {
    throw new Error('userId is required to upsert cycle days');
  }
  if (rows.length === 0) {
    return [];
  }

  const payload: CycleDayInsert[] = rows.map((r) => ({
    cycle_id: r.cycle_id,
    user_id: userId,
    day: r.day,
    allowance_cents: r.allowance_cents,
    spent_cents: r.spent_cents,
    ...(r.sealed_at ? { sealed_at: r.sealed_at } : {}),
  }));

  const { data, error } = await supabase
    .from('cycle_days')
    .upsert(payload, { onConflict: 'cycle_id,day' })
    .select();

  if (error) {
    throw new Error('Failed to upsert cycle days: ' + error.message);
  }

  return (data as CycleDayRow[]).map(mapCycleDayRowToEntity);
}
