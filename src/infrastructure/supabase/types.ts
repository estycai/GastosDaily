// Database shape for the provisioned Supabase project (ref vsniofvjuminnkjladdi).
// Mirrors `supabase gen types typescript`. The `__InternalSupabase` marker and the
// per-table `Relationships` key are required: without them supabase-js cannot resolve
// the schema and collapses every insert/update argument to `never`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      api_tokens: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          last_used_at: string | null;
          revoked_at: string | null;
          token_hash: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          token_hash: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cycles: {
        Row: {
          calc_mode: string;
          created_at: string;
          end_date: string;
          id: string;
          is_active: boolean;
          start_date: string;
          total_budget: number;
          user_id: string;
        };
        Insert: {
          calc_mode?: string;
          created_at?: string;
          end_date: string;
          id?: string;
          is_active?: boolean;
          start_date?: string;
          total_budget: number;
          user_id: string;
        };
        Update: {
          calc_mode?: string;
          created_at?: string;
          end_date?: string;
          id?: string;
          is_active?: boolean;
          start_date?: string;
          total_budget?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          concept: string | null;
          created_at: string;
          cycle_id: string;
          expense_date: string;
          id: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          category?: string;
          concept?: string | null;
          created_at?: string;
          cycle_id: string;
          expense_date?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          concept?: string | null;
          created_at?: string;
          cycle_id?: string;
          expense_date?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_cycle_id_fkey';
            columns: ['cycle_id'];
            isOneToOne: false;
            referencedRelation: 'cycles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicTables = Database['public']['Tables'];

/**
 * `calc_mode` is a text column guarded by a CHECK constraint, so Postgres reports it as
 * `string`. This narrows it back to the two values the constraint actually allows.
 */
export type CalcMode = 'dynamic' | 'fixed';

export type CycleRow = Omit<PublicTables['cycles']['Row'], 'calc_mode'> & {
  calc_mode: CalcMode;
};
export type CycleInsert = Omit<PublicTables['cycles']['Insert'], 'calc_mode'> & {
  calc_mode?: CalcMode;
};
export type CycleUpdate = Omit<PublicTables['cycles']['Update'], 'calc_mode'> & {
  calc_mode?: CalcMode;
};

export type ExpenseRow = PublicTables['expenses']['Row'];
export type ExpenseInsert = PublicTables['expenses']['Insert'];
export type ExpenseUpdate = PublicTables['expenses']['Update'];

export type ApiTokenRow = PublicTables['api_tokens']['Row'];
export type ApiTokenInsert = PublicTables['api_tokens']['Insert'];
export type ApiTokenUpdate = PublicTables['api_tokens']['Update'];
