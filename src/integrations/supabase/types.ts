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
      application_drafts: {
        Row: {
          created_at: string
          form_data: Json
          id: string
          job_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          form_data?: Json
          id?: string
          job_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          form_data?: Json
          id?: string
          job_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          form_data: Json
          id: string
          job_id: string
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          form_data?: Json
          id?: string
          job_id: string
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          form_data?: Json
          id?: string
          job_id?: string
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          blog_id: string
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blog_id: string
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      company_profiles: {
        Row: {
          company_description: string | null
          company_name: string
          company_website: string | null
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_description?: string | null
          company_name: string
          company_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_description?: string | null
          company_name?: string
          company_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: []
      }
      hour_entries: {
        Row: {
          application_id: string
          created_at: string
          description: string
          id: string
          minutes: number
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: string
          updated_at: string
          user_id: string
          work_date: string
        }
        Insert: {
          application_id: string
          created_at?: string
          description: string
          id?: string
          minutes: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          updated_at?: string
          user_id: string
          work_date: string
        }
        Update: {
          application_id?: string
          created_at?: string
          description?: string
          id?: string
          minutes?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hour_entries_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_id: string
          created_at: string
          description: string
          duration: string | null
          expires_at: string | null
          hours_per_week: string | null
          id: string
          industry: string | null
          location: string | null
          location_type: string
          mentorship_details: string | null
          requirements: string[] | null
          responsibilities: string[] | null
          skill_level: string
          skills: string[] | null
          status: string
          title: string
          updated_at: string
          what_you_will_learn: string[] | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          duration?: string | null
          expires_at?: string | null
          hours_per_week?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          location_type?: string
          mentorship_details?: string | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          skill_level?: string
          skills?: string[] | null
          status?: string
          title: string
          updated_at?: string
          what_you_will_learn?: string[] | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          duration?: string | null
          expires_at?: string | null
          hours_per_week?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          location_type?: string
          mentorship_details?: string | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          skill_level?: string
          skills?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          what_you_will_learn?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_diary: {
        Row: {
          content: string
          created_at: string
          entry_date: string
          id: string
          placement_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          entry_date?: string
          id?: string
          placement_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          placement_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_diary_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          placement_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          placement_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          placement_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placement_events_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
        ]
      }
      placements: {
        Row: {
          application_id: string
          certificate_issued_at: string | null
          company_id: string
          confirmed_skills: string[]
          created_at: string
          employer_feedback: string | null
          end_date: string | null
          id: string
          job_id: string
          learning_objectives: string[]
          start_date: string | null
          status: string
          supervisor_contact: string | null
          supervisor_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          certificate_issued_at?: string | null
          company_id: string
          confirmed_skills?: string[]
          created_at?: string
          employer_feedback?: string | null
          end_date?: string | null
          id?: string
          job_id: string
          learning_objectives?: string[]
          start_date?: string | null
          status?: string
          supervisor_contact?: string | null
          supervisor_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          certificate_issued_at?: string | null
          company_id?: string
          confirmed_skills?: string[]
          created_at?: string
          employer_feedback?: string | null
          end_date?: string | null
          id?: string
          job_id?: string
          learning_objectives?: string[]
          start_date?: string | null
          status?: string
          supervisor_contact?: string | null
          supervisor_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          application_updates: boolean | null
          avatar_url: string | null
          created_at: string
          email: string | null
          email_notifications: boolean | null
          full_name: string | null
          id: string
          marketing_emails: boolean | null
          new_opportunities: boolean | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          application_updates?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          marketing_emails?: boolean | null
          new_opportunities?: boolean | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          application_updates?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          marketing_emails?: boolean | null
          new_opportunities?: boolean | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          availability: string | null
          bio: string | null
          career_interests: string[]
          created_at: string
          display_name: string | null
          education_level: string | null
          headline: string | null
          is_public: boolean
          links: Json
          location: string | null
          preferred_industries: string[]
          show_availability: boolean
          show_avatar: boolean
          show_education: boolean
          show_links: boolean
          show_location: boolean
          skills: string[]
          slug: string
          updated_at: string
          user_id: string
          work_preference: string | null
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          career_interests?: string[]
          created_at?: string
          display_name?: string | null
          education_level?: string | null
          headline?: string | null
          is_public?: boolean
          links?: Json
          location?: string | null
          preferred_industries?: string[]
          show_availability?: boolean
          show_avatar?: boolean
          show_education?: boolean
          show_links?: boolean
          show_location?: boolean
          skills?: string[]
          slug: string
          updated_at?: string
          user_id: string
          work_preference?: string | null
        }
        Update: {
          availability?: string | null
          bio?: string | null
          career_interests?: string[]
          created_at?: string
          display_name?: string | null
          education_level?: string | null
          headline?: string | null
          is_public?: boolean
          links?: Json
          location?: string | null
          preferred_industries?: string[]
          show_availability?: boolean
          show_avatar?: boolean
          show_education?: boolean
          show_links?: boolean
          show_location?: boolean
          skills?: string[]
          slug?: string
          updated_at?: string
          user_id?: string
          work_preference?: string | null
        }
        Relationships: []
      }
      saved_blogs: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      can_manage_placement: {
        Args: { _placement_id: string; _uid: string }
        Returns: boolean
      }
      get_my_hours_summary: { Args: never; Returns: Json }
      get_placement_hours: { Args: { _placement_id: string }; Returns: Json }
      get_public_profile: { Args: { _slug: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_placement_employer: {
        Args: { _application_id: string; _user_id: string }
        Returns: boolean
      }
      placement_action: {
        Args: { _action: string; _note?: string; _placement_id: string }
        Returns: undefined
      }
      update_placement_details: {
        Args: {
          _confirmed_skills: string[]
          _employer_feedback: string
          _end_date: string
          _learning_objectives: string[]
          _placement_id: string
          _start_date: string
          _supervisor_contact: string
          _supervisor_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
