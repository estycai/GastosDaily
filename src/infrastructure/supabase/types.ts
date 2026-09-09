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
      cycle_days: {
        Row: {
          allowance_cents: number;
          cycle_id: string;
          day: string;
          id: string;
          saved_cents: number;
          sealed_at: string;
          spent_cents: number;
          user_id: string;
        };
        Insert: {
          allowance_cents: number;
          cycle_id: string;
          day: string;
          id?: string;
          saved_cents?: never;
          sealed_at?: string;
          spent_cents: number;
          user_id: string;
        };
        Update: {
          allowance_cents?: number;
          cycle_id?: string;
          day?: string;
          id?: string;
          saved_cents?: never;
          sealed_at?: string;
          spent_cents?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cycle_days_cycle_id_fkey';
            columns: ['cycle_id'];
            isOneToOne: false;
            referencedRelation: 'cycles';
            referencedColumns: ['id'];
          },
        ];
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

export type CycleRow = PublicTables['cycles']['Row'];
export type CycleInsert = PublicTables['cycles']['Insert'];
export type CycleUpdate = PublicTables['cycles']['Update'];

export type ExpenseRow = PublicTables['expenses']['Row'];
export type ExpenseInsert = PublicTables['expenses']['Insert'];
export type ExpenseUpdate = PublicTables['expenses']['Update'];

export type ApiTokenRow = PublicTables['api_tokens']['Row'];
export type ApiTokenInsert = PublicTables['api_tokens']['Insert'];
export type ApiTokenUpdate = PublicTables['api_tokens']['Update'];

export type CycleDayRow = PublicTables['cycle_days']['Row'];
export type CycleDayInsert = PublicTables['cycle_days']['Insert'];
export type CycleDayUpdate = PublicTables['cycle_days']['Update'];
