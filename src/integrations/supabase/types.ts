export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          journey_id: string | null
          message: string
          priority: number
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          journey_id?: string | null
          message: string
          priority?: number
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          journey_id?: string | null
          message?: string
          priority?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          provides_therapy: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          provides_therapy?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          provides_therapy?: boolean
          user_id?: string
        }
        Relationships: []
      }
      journeys: {
        Row: {
          created_at: string
          doctor_id: string | null
          id: string
          patient_id: string
          status: string
          total_sittings: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          id?: string
          patient_id: string
          status?: string
          total_sittings?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          id?: string
          patient_id?: string
          status?: string
          total_sittings?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journeys_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journeys_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          journey_id: string
          taken: boolean
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          journey_id: string
          taken?: boolean
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          journey_id?: string
          taken?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      nudge_logs: {
        Row: {
          created_at: string
          id: string
          journey_id: string | null
          message: string
          patient_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          journey_id?: string | null
          message: string
          patient_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          journey_id?: string | null
          message?: string
          patient_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudge_logs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudge_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sittings: {
        Row: {
          completed: boolean
          created_at: string
          date: string | null
          id: string
          journey_id: string
          number: number
          therapist_id: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date?: string | null
          id?: string
          journey_id: string
          number: number
          therapist_id?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string | null
          id?: string
          journey_id?: string
          number?: number
          therapist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sittings_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sittings_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists: {
        Row: {
          best_streak: number
          created_at: string
          current_streak: number
          id: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN_DOCTOR" | "DOCTOR" | "THERAPIST" | "PATIENT"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["ADMIN_DOCTOR", "DOCTOR", "THERAPIST", "PATIENT"],
    },
  },
} as const
