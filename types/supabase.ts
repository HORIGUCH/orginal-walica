export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string;
          name: string;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          currency?: string;
          created_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          group_id: string;
          name: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          paid_by: string;
          title: string;
          amount: number;
          split_type: "EQUAL" | "EXACT";
          date: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          paid_by: string;
          title: string;
          amount: number;
          split_type: "EQUAL" | "EXACT";
          date?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          paid_by?: string;
          title?: string;
          amount?: number;
          split_type?: "EQUAL" | "EXACT";
          date?: string;
        };
      };
      expense_splits: {
        Row: {
          id: string;
          expense_id: string;
          member_id: string;
          amount_owed: number;
        };
        Insert: {
          id?: string;
          expense_id: string;
          member_id: string;
          amount_owed: number;
        };
        Update: {
          id?: string;
          expense_id?: string;
          member_id?: string;
          amount_owed?: number;
        };
      };
    };
  };
}
