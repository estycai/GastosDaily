import { supabase } from './client.ts';
import type { CycleInsert, CycleRow, CycleUpdate } from './types.ts';

export interface CycleEntity {
  id: string;
  userId: string;
  totalBudgetCents: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCycleParams {
  totalBudgetCents: number;
  startDate?: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateCycleParams {
  totalBudgetCents?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function centsToDollars(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function mapCycleRowToEntity(row: CycleRow): CycleEntity {
  return {
    id: row.id,
    userId: row.user_id,
    totalBudgetCents: dollarsToCents(Number(row.total_budget)),
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function getActiveCycle(userId: string): Promise<CycleEntity | null> {
  if (!userId) {
    throw new Error('userId is required to get active cycle');
  }

  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to fetch active cycle: ' + error.message);
  }

  if (!data) {
    return null;
  }

  return mapCycleRowToEntity(data as CycleRow);
}

export async function createCycle(userId: string, params: CreateCycleParams): Promise<CycleEntity> {
  if (!userId) {
    throw new Error('userId is required to create a cycle');
  }
  if (params.totalBudgetCents <= 0) {
    throw new Error('totalBudgetCents must be greater than 0');
  }
  if (!params.endDate) {
    throw new Error('endDate is required to create a cycle');
  }

  const insertPayload: CycleInsert = {
    user_id: userId,
    total_budget: centsToDollars(params.totalBudgetCents),
    end_date: params.endDate,
    calc_mode: 'dynamic',
    is_active: params.isActive ?? true,
  };
  if (params.startDate) {
    insertPayload.start_date = params.startDate;
  }

  const { data, error } = await supabase
    .from('cycles')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create cycle: ' + error.message);
  }

  return mapCycleRowToEntity(data as CycleRow);
}

export async function updateCycle(
  userId: string,
  cycleId: string,
  params: UpdateCycleParams
): Promise<CycleEntity> {
  if (!userId) {
    throw new Error('userId is required to update a cycle');
  }
  if (!cycleId) {
    throw new Error('cycleId is required to update a cycle');
  }

  const updatePayload: CycleUpdate = {};
  if (params.totalBudgetCents !== undefined) {
    if (params.totalBudgetCents <= 0) {
      throw new Error('totalBudgetCents must be greater than 0');
    }
    updatePayload.total_budget = centsToDollars(params.totalBudgetCents);
  }
  if (params.startDate !== undefined) {
    updatePayload.start_date = params.startDate;
  }
  if (params.endDate !== undefined) {
    updatePayload.end_date = params.endDate;
  }
  if (params.isActive !== undefined) {
    updatePayload.is_active = params.isActive;
  }

  const { data, error } = await supabase
    .from('cycles')
    .update(updatePayload)
    .eq('id', cycleId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update cycle: ' + error.message);
  }

  return mapCycleRowToEntity(data as CycleRow);
}
