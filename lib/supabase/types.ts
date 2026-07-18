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
      ai_insights: {
        Row: {
          data_hash: string;
          filters_hash: string;
          generated_at: string;
          id: string;
          range: string;
          summary: string;
        };
        Insert: {
          data_hash: string;
          filters_hash: string;
          generated_at?: string;
          id?: string;
          range: string;
          summary: string;
        };
        Update: {
          data_hash?: string;
          filters_hash?: string;
          generated_at?: string;
          id?: string;
          range?: string;
          summary?: string;
        };
        Relationships: [];
      };
      appointment_questions: {
        Row: {
          answer_text: string | null;
          appointment_id: string;
          created_at: string;
          created_by: string;
          id: string;
          question_text: string;
          visibility: string;
        };
        Insert: {
          answer_text?: string | null;
          appointment_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          question_text: string;
          visibility?: string;
        };
        Update: {
          answer_text?: string | null;
          appointment_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          question_text?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointment_questions_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointment_questions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          appointment_date: string;
          appointment_time: string | null;
          appt_type: Database["public"]["Enums"]["appt_type"];
          created_at: string;
          created_by: string;
          family_notes_after: string | null;
          family_notes_before: string | null;
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
          appt_type?: Database["public"]["Enums"]["appt_type"];
          created_at?: string;
          created_by: string;
          family_notes_after?: string | null;
          family_notes_before?: string | null;
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
          appt_type?: Database["public"]["Enums"]["appt_type"];
          created_at?: string;
          created_by?: string;
          family_notes_after?: string | null;
          family_notes_before?: string | null;
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
      appointment_calendar_events: {
        Row: {
          appointment_id: string;
          created_at: string;
          external_etag: string | null;
          external_event_id: string;
          id: string;
          provider: Database["public"]["Enums"]["calendar_provider"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          appointment_id: string;
          created_at?: string;
          external_etag?: string | null;
          external_event_id: string;
          id?: string;
          provider: Database["public"]["Enums"]["calendar_provider"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          appointment_id?: string;
          created_at?: string;
          external_etag?: string | null;
          external_event_id?: string;
          id?: string;
          provider?: Database["public"]["Enums"]["calendar_provider"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointment_calendar_events_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointment_calendar_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_connections: {
        Row: {
          access_token_encrypted: string | null;
          apple_app_password_encrypted: string | null;
          apple_username: string | null;
          caldav_calendar_url: string | null;
          created_at: string;
          external_calendar_id: string | null;
          id: string;
          last_error: string | null;
          provider: Database["public"]["Enums"]["calendar_provider"];
          refresh_token_encrypted: string | null;
          status: Database["public"]["Enums"]["calendar_connection_status"];
          token_expires_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token_encrypted?: string | null;
          apple_app_password_encrypted?: string | null;
          apple_username?: string | null;
          caldav_calendar_url?: string | null;
          created_at?: string;
          external_calendar_id?: string | null;
          id?: string;
          last_error?: string | null;
          provider: Database["public"]["Enums"]["calendar_provider"];
          refresh_token_encrypted?: string | null;
          status?: Database["public"]["Enums"]["calendar_connection_status"];
          token_expires_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token_encrypted?: string | null;
          apple_app_password_encrypted?: string | null;
          apple_username?: string | null;
          caldav_calendar_url?: string | null;
          created_at?: string;
          external_calendar_id?: string | null;
          id?: string;
          last_error?: string | null;
          provider?: Database["public"]["Enums"]["calendar_provider"];
          refresh_token_encrypted?: string | null;
          status?: Database["public"]["Enums"]["calendar_connection_status"];
          token_expires_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_role_defaults: {
        Row: {
          appt_type: Database["public"]["Enums"]["appt_type"];
          enabled: boolean;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          appt_type: Database["public"]["Enums"]["appt_type"];
          enabled?: boolean;
          role: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          appt_type?: Database["public"]["Enums"]["appt_type"];
          enabled?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      calendar_sync_prefs: {
        Row: {
          appt_type: Database["public"]["Enums"]["appt_type"];
          enabled: boolean;
          user_id: string;
        };
        Insert: {
          appt_type: Database["public"]["Enums"]["appt_type"];
          enabled: boolean;
          user_id: string;
        };
        Update: {
          appt_type?: Database["public"]["Enums"]["appt_type"];
          enabled?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_sync_prefs_user_id_fkey";
            columns: ["user_id"];
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
      documents: {
        Row: {
          author: string;
          created_at: string;
          filename: string;
          id: string;
          linked_at: string | null;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
        };
        Insert: {
          author: string;
          created_at?: string;
          filename: string;
          id?: string;
          linked_at?: string | null;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
        };
        Update: {
          author?: string;
          created_at?: string;
          filename?: string;
          id?: string;
          linked_at?: string | null;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_author_fkey";
            columns: ["author"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invite_codes: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          label: string | null;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          label?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          label?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      medical_notes: {
        Row: {
          author_id: string;
          body: string;
          category: string;
          created_at: string;
          date: string;
          document_id: string | null;
          id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          category: string;
          created_at?: string;
          date?: string;
          document_id?: string | null;
          id?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          category?: string;
          created_at?: string;
          date?: string;
          document_id?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medical_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "medical_notes_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
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
          reminder_times: string[];
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
          reminder_times?: string[];
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
          reminder_times?: string[];
        };
        Relationships: [];
      };
      observations: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          type: Database["public"]["Enums"]["observation_type"];
          visibility: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          type: Database["public"]["Enums"]["observation_type"];
          visibility?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          type?: Database["public"]["Enums"]["observation_type"];
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "observations_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          is_admin: boolean;
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
          is_admin?: boolean;
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
          is_admin?: boolean;
          phone?: string | null;
          pin_enabled?: boolean;
          pin_hash?: string | null;
          preferred_name?: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          attending_user_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          due_date: string | null;
          due_time: string | null;
          id: string;
          priority: Database["public"]["Enums"]["task_priority"];
          status: Database["public"]["Enums"]["task_status"];
          task_type: Database["public"]["Enums"]["task_type"];
          title: string;
          visibility: Database["public"]["Enums"]["task_visibility"];
        };
        Insert: {
          assigned_to?: string | null;
          attending_user_id?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          task_type: Database["public"]["Enums"]["task_type"];
          title: string;
          visibility?: Database["public"]["Enums"]["task_visibility"];
        };
        Update: {
          assigned_to?: string | null;
          attending_user_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          task_type?: Database["public"]["Enums"]["task_type"];
          title?: string;
          visibility?: Database["public"]["Enums"]["task_visibility"];
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
            foreignKeyName: "tasks_attending_user_id_fkey";
            columns: ["attending_user_id"];
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
      disable_my_pin: { Args: never; Returns: undefined };
      get_my_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      hook_before_user_created: { Args: { event: Json }; Returns: Json };
      set_my_pin: { Args: { new_pin: string }; Returns: undefined };
      verify_my_pin: { Args: { candidate: string }; Returns: boolean };
    };
    Enums: {
      appt_type:
        | "gp"
        | "specialist"
        | "scan_test"
        | "dental"
        | "allied_health"
        | "other";
      calendar_connection_status: "active" | "error" | "revoked";
      calendar_provider: "google" | "apple";
      mood_type: "great" | "okay" | "not_great";
      observation_type: "behaviour" | "symptom" | "mood";
      task_priority: "low" | "medium" | "high";
      task_status: "open" | "claimed" | "done";
      task_type: "visit" | "shopping" | "transport" | "appointment" | "other";
      task_visibility: "everyone" | "family_only" | "private";
      user_role: "patient" | "primary_carer" | "family" | "extended";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience aliases used throughout the app.
export type UserRole         = Database["public"]["Enums"]["user_role"];
export type TaskStatus       = Database["public"]["Enums"]["task_status"];
export type TaskKind         = Database["public"]["Enums"]["task_type"];
export type TaskPriority     = Database["public"]["Enums"]["task_priority"];
export type TaskVisibility   = Database["public"]["Enums"]["task_visibility"];
export type Mood             = Database["public"]["Enums"]["mood_type"];
export type ApptType         = Database["public"]["Enums"]["appt_type"];
export type ObservationType  = Database["public"]["Enums"]["observation_type"];

export type Profile             = Database["public"]["Tables"]["profiles"]["Row"];
export type Update              = Database["public"]["Tables"]["updates"]["Row"];
export type Task                = Database["public"]["Tables"]["tasks"]["Row"];
export type Appointment         = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentQuestion = Database["public"]["Tables"]["appointment_questions"]["Row"];
export type Medication          = Database["public"]["Tables"]["medications"]["Row"];
export type MedicationLog       = Database["public"]["Tables"]["medication_logs"]["Row"];
export type Checkin             = Database["public"]["Tables"]["checkins"]["Row"];
export type Observation         = Database["public"]["Tables"]["observations"]["Row"];
export type MedicalNote         = Database["public"]["Tables"]["medical_notes"]["Row"];
export type DocumentRow         = Database["public"]["Tables"]["documents"]["Row"];
export type AiInsight           = Database["public"]["Tables"]["ai_insights"]["Row"];
export type InviteCode          = Database["public"]["Tables"]["invite_codes"]["Row"];
export type PushSubscription    = Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type CalendarConnection       = Database["public"]["Tables"]["calendar_connections"]["Row"];
export type CalendarRoleDefault      = Database["public"]["Tables"]["calendar_role_defaults"]["Row"];
export type CalendarSyncPref         = Database["public"]["Tables"]["calendar_sync_prefs"]["Row"];
export type AppointmentCalendarEvent = Database["public"]["Tables"]["appointment_calendar_events"]["Row"];
export type CalendarProvider         = Database["public"]["Enums"]["calendar_provider"];
export type CalendarConnectionStatus = Database["public"]["Enums"]["calendar_connection_status"];
