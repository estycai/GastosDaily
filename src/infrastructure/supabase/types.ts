export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CalcMode = 'dynamic' | 'fixed';

export interface CycleRow {
  id: string;
  user_id: string;
  total_budget: number;
  start_date: string;
  end_date: string;
  calc_mode: CalcMode;
  is_active: boolean;
  created_at: string;
}

export interface CycleInsert {
  id?: string;
  user_id: string;
  total_budget: number;
  start_date?: string;
  end_date: string;
  calc_mode?: CalcMode;
  is_active?: boolean;
  created_at?: string;
}

export interface CycleUpdate {
  id?: string;
  user_id?: string;
  total_budget?: number;
  start_date?: string;
  end_date?: string;
  calc_mode?: CalcMode;
  is_active?: boolean;
  created_at?: string;
}

export interface ExpenseRow {
  id: string;
  cycle_id: string;
  user_id: string;
  amount: number;
  concept: string | null;
  category: string;
  expense_date: string;
  created_at: string;
}

export interface ExpenseInsert {
  id?: string;
  cycle_id: string;
  user_id: string;
  amount: number;
  concept?: string | null;
  category?: string;
  expense_date?: string;
  created_at?: string;
}

export interface ExpenseUpdate {
  id?: string;
  cycle_id?: string;
  user_id?: string;
  amount?: number;
  concept?: string | null;
  category?: string;
  expense_date?: string;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      cycles: {
        Row: CycleRow;
        Insert: CycleInsert;
        Update: CycleUpdate;
      };
      expenses: {
        Row: ExpenseRow;
        Insert: ExpenseInsert;
        Update: ExpenseUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
