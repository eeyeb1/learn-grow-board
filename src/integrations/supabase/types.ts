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
      certificates: {
        Row: {
          approved_minutes: number
          code: string
          company_id: string
          company_name: string
          created_at: string
          end_date: string | null
          id: string
          issued_at: string
          placement_id: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          role_title: string
          seeker_name: string
          show_hours: boolean
          show_name: boolean
          show_skills: boolean
          skills: string[]
          start_date: string | null
          updated_at: string
          user_id: string
          verification_enabled: boolean
        }
        Insert: {
          approved_minutes?: number
          code: string
          company_id: string
          company_name: string
          created_at?: string
          end_date?: string | null
          id?: string
          issued_at?: string
          placement_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_title: string
          seeker_name: string
          show_hours?: boolean
          show_name?: boolean
          show_skills?: boolean
          skills?: string[]
          start_date?: string | null
          updated_at?: string
          user_id: string
          verification_enabled?: boolean
        }
        Update: {
          approved_minutes?: number
          code?: string
          company_id?: string
          company_name?: string
          created_at?: string
          end_date?: string | null
          id?: string
          issued_at?: string
          placement_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_title?: string
          seeker_name?: string
          show_hours?: boolean
          show_name?: boolean
          show_skills?: boolean
          skills?: string[]
          start_date?: string | null
          updated_at?: string
          user_id?: string
          verification_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: true
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
        ]
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
      placement_references: {
        Row: {
          author_id: string
          author_name: string
          author_role: string | null
          company_id: string | null
          content: string
          created_at: string
          duties: string | null
          id: string
          improvement_areas: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          placement_id: string
          seeker_approved: boolean
          skills_demonstrated: string | null
          status: string
          strengths: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          author_role?: string | null
          company_id?: string | null
          content: string
          created_at?: string
          duties?: string | null
          id?: string
          improvement_areas?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          placement_id: string
          seeker_approved?: boolean
          skills_demonstrated?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_role?: string | null
          company_id?: string | null
          content?: string
          created_at?: string
          duties?: string | null
          id?: string
          improvement_areas?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          placement_id?: string
          seeker_approved?: boolean
          skills_demonstrated?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_references_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_references_placement_id_fkey"
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
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          file_mime: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_public: boolean
          link_url: string | null
          outcomes: string | null
          permission_confirmed: boolean
          permission_confirmed_at: string | null
          placement_id: string | null
          skills: string[]
          start_date: string | null
          status: string
          task_summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_public?: boolean
          link_url?: string | null
          outcomes?: string | null
          permission_confirmed?: boolean
          permission_confirmed_at?: string | null
          placement_id?: string | null
          skills?: string[]
          start_date?: string | null
          status?: string
          task_summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_public?: boolean
          link_url?: string | null
          outcomes?: string | null
          permission_confirmed?: boolean
          permission_confirmed_at?: string | null
          placement_id?: string | null
          skills?: string[]
          start_date?: string | null
          status?: string
          task_summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_removal_requests: {
        Row: {
          created_at: string
          details: string | null
          id: string
          item_id: string | null
          item_title: string
          owner_id: string
          placement_id: string | null
          reason: string
          requester_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          item_id?: string | null
          item_title: string
          owner_id: string
          placement_id?: string | null
          reason: string
          requester_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          item_id?: string | null
          item_title?: string
          owner_id?: string
          placement_id?: string | null
          reason?: string
          requester_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_removal_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
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
          guardian_acknowledged: boolean
          headline: string | null
          is_minor: boolean
          is_public: boolean
          links: Json
          location: string | null
          preferred_industries: string[]
          published_at: string | null
          show_availability: boolean
          show_avatar: boolean
          show_education: boolean
          show_experiences: boolean
          show_hours: boolean
          show_interests: boolean
          show_links: boolean
          show_location: boolean
          show_portfolio: boolean
          show_references: boolean
          show_self_skills: boolean
          show_summary: boolean
          show_verified_skills: boolean
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
          guardian_acknowledged?: boolean
          headline?: string | null
          is_minor?: boolean
          is_public?: boolean
          links?: Json
          location?: string | null
          preferred_industries?: string[]
          published_at?: string | null
          show_availability?: boolean
          show_avatar?: boolean
          show_education?: boolean
          show_experiences?: boolean
          show_hours?: boolean
          show_interests?: boolean
          show_links?: boolean
          show_location?: boolean
          show_portfolio?: boolean
          show_references?: boolean
          show_self_skills?: boolean
          show_summary?: boolean
          show_verified_skills?: boolean
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
          guardian_acknowledged?: boolean
          headline?: string | null
          is_minor?: boolean
          is_public?: boolean
          links?: Json
          location?: string | null
          preferred_industries?: string[]
          published_at?: string | null
          show_availability?: boolean
          show_avatar?: boolean
          show_education?: boolean
          show_experiences?: boolean
          show_hours?: boolean
          show_interests?: boolean
          show_links?: boolean
          show_location?: boolean
          show_portfolio?: boolean
          show_references?: boolean
          show_self_skills?: boolean
          show_summary?: boolean
          show_verified_skills?: boolean
          skills?: string[]
          slug?: string
          updated_at?: string
          user_id?: string
          work_preference?: string | null
        }
        Relationships: []
      }
      reference_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reference_id: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reference_id: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reference_id?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_reports_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "placement_references"
            referencedColumns: ["id"]
          },
        ]
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
      skill_verifications: {
        Row: {
          category: string
          company_id: string
          created_at: string
          example: string | null
          id: string
          placement_id: string
          show_on_profile: boolean
          skill: string
          user_id: string
          verified_at: string
          verified_by: string
          verifier_name: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          example?: string | null
          id?: string
          placement_id: string
          show_on_profile?: boolean
          skill: string
          user_id: string
          verified_at?: string
          verified_by: string
          verifier_name: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          example?: string | null
          id?: string
          placement_id?: string
          show_on_profile?: boolean
          skill?: string
          user_id?: string
          verified_at?: string
          verified_by?: string
          verifier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_verifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_verifications_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
        ]
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
      _new_certificate_code: { Args: never; Returns: string }
      _ref_actor_role: { Args: { _placement_id: string }; Returns: string }
      _ref_check: {
        Args: { _label: string; _max: number; _min: number; _v: string }
        Returns: string
      }
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
      issue_certificate: { Args: { _placement_id: string }; Returns: string }
      moderate_reference_report: {
        Args: { _decision: string; _note: string; _report_id: string }
        Returns: undefined
      }
      placement_action: {
        Args: { _action: string; _note?: string; _placement_id: string }
        Returns: undefined
      }
      report_reference: {
        Args: { _details: string; _id: string; _reason: string }
        Returns: string
      }
      request_portfolio_removal: {
        Args: { _details: string; _item_id: string; _reason: string }
        Returns: string
      }
      resolve_portfolio_removal: {
        Args: { _decision: string; _note: string; _request_id: string }
        Returns: undefined
      }
      restore_reference: {
        Args: { _id: string; _note: string }
        Returns: undefined
      }
      revoke_certificate: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      revoke_skill_verification: { Args: { _id: string }; Returns: undefined }
      set_certificate_privacy: {
        Args: {
          _id: string
          _show_hours: boolean
          _show_name: boolean
          _show_skills: boolean
          _verification_enabled: boolean
        }
        Returns: undefined
      }
      set_reference_approval: {
        Args: { _approved: boolean; _id: string }
        Returns: undefined
      }
      set_skill_visibility: {
        Args: { _id: string; _visible: boolean }
        Returns: undefined
      }
      submit_reference: {
        Args: {
          _author_name: string
          _author_role: string
          _duties: string
          _improvements: string
          _placement_id: string
          _skills: string
          _strengths: string
        }
        Returns: string
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
      update_reference: {
        Args: {
          _author_name: string
          _author_role: string
          _duties: string
          _id: string
          _improvements: string
          _skills: string
          _strengths: string
        }
        Returns: undefined
      }
      verify_certificate: { Args: { _code: string }; Returns: Json }
      verify_placement_skill: {
        Args: {
          _category: string
          _directly_observed: boolean
          _example: string
          _placement_id: string
          _skill: string
        }
        Returns: string
      }
      withdraw_reference: { Args: { _id: string }; Returns: undefined }
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
