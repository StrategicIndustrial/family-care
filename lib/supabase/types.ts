// Generated via Supabase MCP from project lxjxcvshifnjomjcnwts.
// Regenerate with: supabase gen types typescript --project-id lxjxcvshifnjomjcnwts
// (or via the Supabase MCP `generate_typescript_types` tool).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string;
          appointment_time: string | null;
          created_at: string;
          created_by: string;
          id: string;
          location: string | null;
          notes_after: string | null;
          notes_before: string | null;
          specialist: string | null;
          title: string;
        };
        Insert: {
          appointment_date: string;
          appointment_time?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          location?: string | null;
          notes_after?: string | null;
          notes_before?: string | null;
          specialist?: string | null;
          title: string;
        };
        Update: {
          appointment_date?: string;
          appointment_time?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          location?: string | null;
          notes_after?: string | null;
          notes_before?: string | null;
          specialist?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      checkins: {
        Row: {
          created_at: string;
          id: string;
          mood: Database["public"]["Enums"]["mood_type"];
          note: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mood: Database["public"]["Enums"]["mood_type"];
          note?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          mood?: Database["public"]["Enums"]["mood_type"];
          note?: string | null;
        };
        Relationships: [];
      };
      medication_logs: {
        Row: {
          id: string;
          logged_by: string;
          medication_id: string;
          notes: string | null;
          taken_at: string;
        };
        Insert: {
          id?: string;
          logged_by: string;
          medication_id: string;
          notes?: string | null;
          taken_at?: string;
        };
        Update: {
          id?: string;
          logged_by?: string;
          medication_id?: string;
          notes?: string | null;
          taken_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medication_logs_logged_by_fkey";
            columns: ["logged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medication_logs_medication_id_fkey";
            columns: ["medication_id"];
            isOneToOne: false;
            referencedRelation: "medications";
            referencedColumns: ["id"];
          },
        ];
      };
      medications: {
        Row: {
          created_at: string;
          dosage: string;
          frequency: string;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          prescriber: string | null;
        };
        Insert: {
          created_at?: string;
          dosage: string;
          frequency: string;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          prescriber?: string | null;
        };
        Update: {
          created_at?: string;
          dosage?: string;
          frequency?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          prescriber?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          phone: string | null;
          pin_enabled: boolean;
          pin_hash: string | null;
          preferred_name: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          phone?: string | null;
          pin_enabled?: boolean;
          pin_hash?: string | null;
          preferred_name: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          pin_enabled?: boolean;
          pin_hash?: string | null;
          preferred_name?: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          due_date: string | null;
          due_time: string | null;
          id: string;
          status: Database["public"]["Enums"]["task_status"];
          task_type: Database["public"]["Enums"]["task_type"];
          title: string;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["task_status"];
          task_type: Database["public"]["Enums"]["task_type"];
          title: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["task_status"];
          task_type?: Database["public"]["Enums"]["task_type"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      updates: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          is_flagged: boolean;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          is_flagged?: boolean;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          is_flagged?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "updates_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_my_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
    };
    Enums: {
      mood_type: "great" | "okay" | "not_great";
      task_status: "open" | "claimed" | "done";
      task_type: "visit" | "shopping" | "transport" | "appointment" | "other";
      user_role: "patient" | "primary_carer" | "family" | "extended";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience aliases used throughout the app.
export type UserRole   = Database["public"]["Enums"]["user_role"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskKind   = Database["public"]["Enums"]["task_type"];
export type Mood       = Database["public"]["Enums"]["mood_type"];

export type Profile        = Database["public"]["Tables"]["profiles"]["Row"];
export type Update         = Database["public"]["Tables"]["updates"]["Row"];
export type Task           = Database["public"]["Tables"]["tasks"]["Row"];
export type Appointment    = Database["public"]["Tables"]["appointments"]["Row"];
export type Medication     = Database["public"]["Tables"]["medications"]["Row"];
export type MedicationLog  = Database["public"]["Tables"]["medication_logs"]["Row"];
export type Checkin        = Database["public"]["Tables"]["checkins"]["Row"];
