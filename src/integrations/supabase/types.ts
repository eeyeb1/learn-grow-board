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
      company_access_requests: {
        Row: {
          company_id: string | null
          created_at: string
          department: string | null
          employee_name: string | null
          id: string
          job_title: string | null
          pathway: string
          requested_company: string | null
          requested_domain: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          work_email: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          employee_name?: string | null
          id?: string
          job_title?: string | null
          pathway: string
          requested_company?: string | null
          requested_domain?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
          work_email?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          employee_name?: string | null
          id?: string
          job_title?: string | null
          pathway?: string
          requested_company?: string | null
          requested_domain?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_access_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_admin_recoveries: {
        Row: {
          appointed_user_id: string
          authority_evidence: string
          company_id: string
          created_at: string
          id: string
          legitimacy_evidence: string
          platform_admin_id: string
        }
        Insert: {
          appointed_user_id: string
          authority_evidence: string
          company_id: string
          created_at?: string
          id?: string
          legitimacy_evidence: string
          platform_admin_id: string
        }
        Update: {
          appointed_user_id?: string
          authority_evidence?: string
          company_id?: string
          created_at?: string
          id?: string
          legitimacy_evidence?: string
          platform_admin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_admin_recoveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_domain_exclusions: {
        Row: {
          domain: string
          reason: string
        }
        Insert: {
          domain: string
          reason: string
        }
        Update: {
          domain?: string
          reason?: string
        }
        Relationships: []
      }
      company_domains: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          company_id: string
          domain: string
          id: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          domain: string
          id?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          domain?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          company_id: string
          created_at: string
          draft: boolean
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          responded_at: string | null
          scope: string
          status: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          draft?: boolean
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          responded_at?: string | null
          scope: string
          status?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          draft?: boolean
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          responded_at?: string | null
          scope?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_membership_reviews: {
        Row: {
          action: string
          company_id: string
          created_at: string
          id: string
          note: string
          request_id: string
          reviewer_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          id?: string
          note: string
          request_id: string
          reviewer_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          id?: string
          note?: string
          request_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_membership_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_membership_reviews_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_access_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_work_email: string | null
          company_id: string
          domain_bound: boolean
          id: string
          manage_placements: boolean
          role: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_work_email?: string | null
          company_id: string
          domain_bound?: boolean
          id?: string
          manage_placements?: boolean
          role: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_work_email?: string | null
          company_id?: string
          domain_bound?: boolean
          id?: string
          manage_placements?: boolean
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_page_settings: {
        Row: {
          accessibility_information: string
          company_id: string
          general_location: string
          is_public: boolean
          learning_opportunities: string
          logo_path: string | null
          public_contact_email: string
          public_contact_url: string
          show_verified_impact: boolean
          updated_at: string
          work_environment: string
        }
        Insert: {
          accessibility_information?: string
          company_id: string
          general_location?: string
          is_public?: boolean
          learning_opportunities?: string
          logo_path?: string | null
          public_contact_email?: string
          public_contact_url?: string
          show_verified_impact?: boolean
          updated_at?: string
          work_environment?: string
        }
        Update: {
          accessibility_information?: string
          company_id?: string
          general_location?: string
          is_public?: boolean
          learning_opportunities?: string
          logo_path?: string | null
          public_contact_email?: string
          public_contact_url?: string
          show_verified_impact?: boolean
          updated_at?: string
          work_environment?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_page_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_permission_events: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          company_id: string
          created_at: string
          id: string
          note: string | null
          resource_id: string | null
          subject_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          company_id: string
          created_at?: string
          id?: string
          note?: string | null
          resource_id?: string | null
          subject_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          company_id?: string
          created_at?: string
          id?: string
          note?: string | null
          resource_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_permission_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
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
      company_registration_reviews: {
        Row: {
          action: string
          applicant_message: string
          approved_domains: string[]
          authority_evidence: string
          company_id: string | null
          created_at: string
          id: string
          legitimacy_evidence: string
          private_notes: string
          reviewer_id: string
          submission_id: string
        }
        Insert: {
          action: string
          applicant_message: string
          approved_domains?: string[]
          authority_evidence: string
          company_id?: string | null
          created_at?: string
          id?: string
          legitimacy_evidence: string
          private_notes: string
          reviewer_id: string
          submission_id: string
        }
        Update: {
          action?: string
          applicant_message?: string
          approved_domains?: string[]
          authority_evidence?: string
          company_id?: string | null
          created_at?: string
          id?: string
          legitimacy_evidence?: string
          private_notes?: string
          reviewer_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_registration_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_registration_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "company_registration_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      company_registration_submissions: {
        Row: {
          business_location: string
          company_id: string | null
          decision_message: string | null
          id: string
          industry: string
          legal_name: string
          registration_identifier: string
          relationship: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          submitted_evidence: string
          trading_name: string
          user_id: string
          website: string
          work_email: string
        }
        Insert: {
          business_location: string
          company_id?: string | null
          decision_message?: string | null
          id?: string
          industry: string
          legal_name: string
          registration_identifier?: string
          relationship: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_evidence: string
          trading_name?: string
          user_id: string
          website: string
          work_email: string
        }
        Update: {
          business_location?: string
          company_id?: string | null
          decision_message?: string | null
          id?: string
          industry?: string
          legal_name?: string
          registration_identifier?: string
          relationship?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          submitted_evidence?: string
          trading_name?: string
          user_id?: string
          website?: string
          work_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_registration_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_resource_assignments: {
        Row: {
          company_id: string
          id: string
          job_id: string | null
          permissions: string[]
          placement_id: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          job_id?: string | null
          permissions: string[]
          placement_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          job_id?: string | null
          permissions?: string[]
          placement_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_resource_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_resource_assignments_company_id_user_id_fkey"
            columns: ["company_id", "user_id"]
            isOneToOne: false
            referencedRelation: "company_memberships"
            referencedColumns: ["company_id", "user_id"]
          },
          {
            foreignKeyName: "company_resource_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_resource_assignments_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
        ]
      }
      company_staff_scopes: {
        Row: {
          company_id: string
          permissions: string[]
          scope: string
          user_id: string
        }
        Insert: {
          company_id: string
          permissions?: string[]
          scope?: string
          user_id: string
        }
        Update: {
          company_id?: string
          permissions?: string[]
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_staff_scopes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_staff_scopes_company_id_user_id_fkey"
            columns: ["company_id", "user_id"]
            isOneToOne: true
            referencedRelation: "company_memberships"
            referencedColumns: ["company_id", "user_id"]
          },
        ]
      }
      company_verifications: {
        Row: {
          company_id: string
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_verifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_drafts: {
        Row: {
          bullets: Json
          created_at: string
          id: string
          placement_ids: string[]
          target: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bullets?: Json
          created_at?: string
          id?: string
          placement_ids?: string[]
          target: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bullets?: Json
          created_at?: string
          id?: string
          placement_ids?: string[]
          target?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_email_challenges: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          invalidated_at: string | null
          token_hash: string
          user_id: string
          work_email: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          token_hash: string
          user_id: string
          work_email: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          token_hash?: string
          user_id?: string
          work_email?: string
        }
        Relationships: []
      }
      employee_identities: {
        Row: {
          claimed_company: string
          full_name: string
          job_title: string
          matched_company_id: string | null
          updated_at: string
          user_id: string
          work_email: string
          work_email_verified_at: string | null
        }
        Insert: {
          claimed_company: string
          full_name: string
          job_title: string
          matched_company_id?: string | null
          updated_at?: string
          user_id: string
          work_email: string
          work_email_verified_at?: string | null
        }
        Update: {
          claimed_company?: string
          full_name?: string
          job_title?: string
          matched_company_id?: string | null
          updated_at?: string
          user_id?: string
          work_email?: string
          work_email_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_identities_matched_company_id_fkey"
            columns: ["matched_company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      job_publication_requests: {
        Row: {
          approved_snapshot: Json | null
          company_id: string
          created_at: string
          id: string
          job_id: string
          note: string | null
          platform_note: string | null
          platform_review_required: boolean
          platform_reviewed_at: string | null
          platform_reviewed_by: string | null
          platform_status: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          revision: number
          self_authored_approval: boolean
          status: string
        }
        Insert: {
          approved_snapshot?: Json | null
          company_id: string
          created_at?: string
          id?: string
          job_id: string
          note?: string | null
          platform_note?: string | null
          platform_review_required?: boolean
          platform_reviewed_at?: string | null
          platform_reviewed_by?: string | null
          platform_status?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision: number
          self_authored_approval?: boolean
          status?: string
        }
        Update: {
          approved_snapshot?: Json | null
          company_id?: string
          created_at?: string
          id?: string
          job_id?: string
          note?: string | null
          platform_note?: string | null
          platform_review_required?: boolean
          platform_reviewed_at?: string | null
          platform_reviewed_by?: string | null
          platform_status?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number
          self_authored_approval?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_publication_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_publication_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_review_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          company_id: string
          created_at: string
          from_status: string | null
          id: string
          job_id: string
          note: string | null
          request_id: string | null
          revision: number
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          company_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          job_id: string
          note?: string | null
          request_id?: string | null
          revision: number
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          company_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          job_id?: string
          note?: string | null
          request_id?: string | null
          revision?: number
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_review_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_review_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_review_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "job_publication_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_versions: {
        Row: {
          created_at: string
          id: string
          job_id: string
          saved_by: string | null
          snapshot: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          saved_by?: string | null
          snapshot: Json
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          saved_by?: string | null
          snapshot?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          duration: string | null
          expires_at: string | null
          hours_per_week: string | null
          id: string
          industry: string | null
          location: string | null
          location_type: string
          mentorship_details: string | null
          opportunity_details: Json
          publication_revision: number
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
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          duration?: string | null
          expires_at?: string | null
          hours_per_week?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          location_type?: string
          mentorship_details?: string | null
          opportunity_details?: Json
          publication_revision?: number
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
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration?: string | null
          expires_at?: string | null
          hours_per_week?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          location_type?: string
          mentorship_details?: string | null
          opportunity_details?: Json
          publication_revision?: number
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
      notification_preferences: {
        Row: {
          application: boolean
          deadline: boolean
          feedback: boolean
          hours: boolean
          placement: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          application?: boolean
          deadline?: boolean
          feedback?: boolean
          hours?: boolean
          placement?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          application?: boolean
          deadline?: boolean
          feedback?: boolean
          hours?: boolean
          placement?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          dedupe_key: string
          id: string
          link: string | null
          preview: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          dedupe_key: string
          id?: string
          link?: string | null
          preview: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          link?: string | null
          preview?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
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
      recommendation_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          job_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          job_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          job_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
      _job_event: {
        Args: {
          _action: string
          _from: string
          _job: Database["public"]["Tables"]["jobs"]["Row"]
          _note: string
          _request: string
          _role: string
          _to: string
        }
        Returns: undefined
      }
      _new_certificate_code: { Args: never; Returns: string }
      _notify: {
        Args: {
          _body: string
          _category: string
          _key: string
          _link: string
          _preview: string
          _title: string
          _uid: string
        }
        Returns: undefined
      }
      _notify_company_admins: {
        Args: {
          _body: string
          _company: string
          _except: string
          _key: string
          _link: string
          _preview: string
          _title: string
        }
        Returns: undefined
      }
      _ref_actor_role: { Args: { _placement_id: string }; Returns: string }
      _ref_check: {
        Args: { _label: string; _max: number; _min: number; _v: string }
        Returns: string
      }
      begin_employee_email_challenge: {
        Args: { _hash: string; _uid: string }
        Returns: Json
      }
      can_manage_listing: {
        Args: { _job_id: string; _uid: string }
        Returns: boolean
      }
      can_manage_placement: {
        Args: { _placement_id: string; _uid: string }
        Returns: boolean
      }
      cancel_company_invitation: { Args: { _id: string }; Returns: undefined }
      check_opportunity: {
        Args: {
          j: Database["public"]["Tables"]["jobs"]["Row"]
          strict: boolean
        }
        Returns: undefined
      }
      company_application_permission: {
        Args: { _application_id: string; _uid: string }
        Returns: boolean
      }
      company_application_read: {
        Args: { _application_id: string; _uid: string }
        Returns: boolean
      }
      company_can_draft: {
        Args: { _company_id: string; _uid: string }
        Returns: boolean
      }
      company_domain_match_allowed: {
        Args: { _domain: string }
        Returns: boolean
      }
      company_job_permission: {
        Args: { _job_id: string; _permission: string; _uid: string }
        Returns: boolean
      }
      company_logo_readable: { Args: { _path: string }; Returns: boolean }
      company_permission: {
        Args: { _company_id: string; _permission: string; _uid: string }
        Returns: boolean
      }
      confirm_employee_email: { Args: { _hash: string }; Returns: undefined }
      duplicate_job_as_draft: { Args: { _job_id: string }; Returns: string }
      employee_domain_company: { Args: { _email: string }; Returns: string }
      employee_email_valid: { Args: { _email: string }; Returns: boolean }
      get_company_access: { Args: never; Returns: Json }
      get_my_hours_summary: { Args: never; Returns: Json }
      get_placement_hours: { Args: { _placement_id: string }; Returns: Json }
      get_public_company: { Args: { _company_id: string }; Returns: Json }
      get_public_profile: { Args: { _slug: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_company_staff: {
        Args: {
          _company_id: string
          _draft: boolean
          _email: string
          _note: string
          _scope: string
        }
        Returns: string
      }
      is_placement_employer: {
        Args: { _application_id: string; _user_id: string }
        Returns: boolean
      }
      issue_certificate: { Args: { _placement_id: string }; Returns: string }
      job_material: {
        Args: { j: Database["public"]["Tables"]["jobs"]["Row"] }
        Returns: Json
      }
      list_companies_without_admin: { Args: never; Returns: Json }
      list_company_approval_requests: {
        Args: { _company_id: string }
        Returns: Json
      }
      list_company_review_candidates: { Args: never; Returns: Json }
      list_company_staff: { Args: { _company_id: string }; Returns: Json }
      list_employee_membership_requests: {
        Args: { _company_id?: string }
        Returns: Json
      }
      list_managed_opportunities: {
        Args: { _company_id: string }
        Returns: Json
      }
      list_my_company_invitations: { Args: never; Returns: Json }
      list_platform_job_reviews: { Args: never; Returns: Json }
      moderate_reference_report: {
        Args: { _decision: string; _note: string; _report_id: string }
        Returns: undefined
      }
      placement_action: {
        Args: { _action: string; _note?: string; _placement_id: string }
        Returns: undefined
      }
      platform_review_job: {
        Args: { _approve: boolean; _note: string; _request_id: string }
        Returns: undefined
      }
      recover_company_admin: {
        Args: {
          _authority: string
          _company_id: string
          _legitimacy: string
          _user_id: string
        }
        Returns: string
      }
      report_reference: {
        Args: { _details: string; _id: string; _reason: string }
        Returns: string
      }
      request_company_access: {
        Args: {
          _company_name?: string
          _department?: string
          _job_title?: string
          _pathway: string
          _website?: string
        }
        Returns: string
      }
      request_job_publication: { Args: { _job_id: string }; Returns: string }
      request_portfolio_removal: {
        Args: { _details: string; _item_id: string; _reason: string }
        Returns: string
      }
      requires_second_authoriser: {
        Args: { _category: string }
        Returns: boolean
      }
      resolve_portfolio_removal: {
        Args: { _decision: string; _note: string; _request_id: string }
        Returns: undefined
      }
      respond_company_invitation: {
        Args: { _accept: boolean; _id: string }
        Returns: undefined
      }
      restore_reference: {
        Args: { _id: string; _note: string }
        Returns: undefined
      }
      review_company_registration: {
        Args: {
          _authority_evidence: string
          _company_id?: string
          _decision: string
          _domains?: string[]
          _legitimacy_evidence: string
          _message: string
          _notes: string
          _submission_id: string
        }
        Returns: string
      }
      review_employee_membership: {
        Args: { _decision: string; _note: string; _request_id: string }
        Returns: undefined
      }
      review_job_publication: {
        Args: { _approve: boolean; _note: string; _request_id: string }
        Returns: undefined
      }
      review_job_submission: {
        Args: { _decision: string; _note: string; _request_id: string }
        Returns: string
      }
      revoke_certificate: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      revoke_company_admin: {
        Args: { _company_id: string; _note: string; _user_id: string }
        Returns: undefined
      }
      revoke_skill_verification: { Args: { _id: string }; Returns: undefined }
      route_manual_employee_request: {
        Args: { _company_id: string; _note: string; _request_id: string }
        Returns: undefined
      }
      save_company_page: {
        Args: { _company_id: string; _data: Json }
        Returns: undefined
      }
      save_employee_identity: {
        Args: {
          _company: string
          _job_title: string
          _name: string
          _work_email: string
        }
        Returns: undefined
      }
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
      set_company_admin_role: {
        Args: {
          _company_id: string
          _confirm_email: string
          _note: string
          _promote: boolean
          _user_id: string
        }
        Returns: undefined
      }
      set_company_resource_assignment: {
        Args: {
          _company_id: string
          _job_id: string
          _note: string
          _permissions: string[]
          _placement_id: string
          _user_id: string
        }
        Returns: undefined
      }
      set_company_staff_access: {
        Args: {
          _company_id: string
          _draft: boolean
          _note: string
          _revoke: boolean
          _scope: string
          _user_id: string
        }
        Returns: undefined
      }
      set_job_listing_state: {
        Args: { _action: string; _job_id: string; _note: string }
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
      submit_company_registration: { Args: { _details: Json }; Returns: string }
      submit_job_for_approval: { Args: { _job_id: string }; Returns: string }
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
      sync_my_deadline_notifications: { Args: never; Returns: undefined }
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
      withdraw_job_submission: { Args: { _job_id: string }; Returns: undefined }
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
