import { supabase } from './client.ts';
import type { ExpenseInsert, ExpenseRow } from './types.ts';

export interface ExpenseEntity {
  id: string;
  cycleId: string;
  userId: string;
  amountCents: number;
  concept: string | null;
  category: string;
  expenseDate: string;
  createdAt: string;
}

export interface CreateExpenseParams {
  cycleId: string;
  amountCents: number;
  concept?: string | null;
  category?: string;
  expenseDate?: string;
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function centsToDollars(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function mapExpenseRowToEntity(row: ExpenseRow): ExpenseEntity {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    userId: row.user_id,
    amountCents: dollarsToCents(Number(row.amount)),
    concept: row.concept,
    category: row.category,
    expenseDate: row.expense_date,
    createdAt: row.created_at,
  };
}

export async function listExpensesForCycle(
  userId: string,
  cycleId: string
): Promise<ExpenseEntity[]> {
  if (!userId) {
    throw new Error('userId is required to list cycle expenses');
  }
  if (!cycleId) {
    throw new Error('cycleId is required to list cycle expenses');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to list expenses for cycle: ' + error.message);
  }

  return (data as ExpenseRow[]).map(mapExpenseRowToEntity);
}

export async function listExpensesForDate(
  userId: string,
  cycleId: string,
  date: string
): Promise<ExpenseEntity[]> {
  if (!userId) {
    throw new Error('userId is required to list expenses for date');
  }
  if (!cycleId) {
    throw new Error('cycleId is required to list expenses for date');
  }
  if (!date) {
    throw new Error('date is required to list expenses for date');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('cycle_id', cycleId)
    .eq('expense_date', date)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to list expenses for date: ' + error.message);
  }

  return (data as ExpenseRow[]).map(mapExpenseRowToEntity);
}

export async function createExpense(
  userId: string,
  params: CreateExpenseParams
): Promise<ExpenseEntity> {
  if (!userId) {
    throw new Error('userId is required to create an expense');
  }
  if (!params.cycleId) {
    throw new Error('cycleId is required to create an expense');
  }
  if (params.amountCents <= 0) {
    throw new Error('amountCents must be greater than 0');
  }

  const insertPayload: ExpenseInsert = {
    cycle_id: params.cycleId,
    user_id: userId,
    amount: centsToDollars(params.amountCents),
    concept: params.concept ?? null,
    category: params.category ?? 'varios',
  };
  if (params.expenseDate) {
    insertPayload.expense_date = params.expenseDate;
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create expense: ' + error.message);
  }

  return mapExpenseRowToEntity(data as ExpenseRow);
}

export async function deleteExpense(userId: string, expenseId: string): Promise<void> {
  if (!userId) {
    throw new Error('userId is required to delete an expense');
  }
  if (!expenseId) {
    throw new Error('expenseId is required to delete an expense');
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', userId);

  if (error) {
    throw new Error('Failed to delete expense: ' + error.message);
  }
}
