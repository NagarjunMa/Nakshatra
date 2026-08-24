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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      access_audit_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          grant_id: string | null
          id: number
          interest_request_id: string | null
          metadata: Json
          portfolio_id: string | null
          subject_user_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          grant_id?: string | null
          id?: never
          interest_request_id?: string | null
          metadata?: Json
          portfolio_id?: string | null
          subject_user_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          grant_id?: string | null
          id?: never
          interest_request_id?: string | null
          metadata?: Json
          portfolio_id?: string | null
          subject_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_audit_events_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "reveal_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_audit_events_interest_request_id_fkey"
            columns: ["interest_request_id"]
            isOneToOne: false
            referencedRelation: "interest_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_audit_events_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_requests: {
        Row: {
          attempts: number
          auth_deleted_at: string | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          last_error_code: string | null
          lease_expires_at: string | null
          lease_token: string | null
          processing_stage: string
          processing_started_at: string | null
          requested_at: string
          retention_until: string | null
          retry_after: string | null
          scheduled_for: string
          status: string
          subject_hash: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          auth_deleted_at?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          processing_stage?: string
          processing_started_at?: string | null
          requested_at?: string
          retention_until?: string | null
          retry_after?: string | null
          scheduled_for?: string
          status?: string
          subject_hash: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          auth_deleted_at?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error_code?: string | null
          lease_expires_at?: string | null
          lease_token?: string | null
          processing_stage?: string
          processing_started_at?: string | null
          requested_at?: string
          retention_until?: string | null
          retry_after?: string | null
          scheduled_for?: string
          status?: string
          subject_hash?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      approved_portfolio_snapshots: {
        Row: {
          data: Json
          portfolio_id: string
          published_at: string
          sun_sign: string | null
          template_id: number
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          data: Json
          portfolio_id: string
          published_at: string
          sun_sign?: string | null
          template_id: number
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          data?: Json
          portfolio_id?: string
          published_at?: string
          sun_sign?: string | null
          template_id?: number
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_portfolio_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: true
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_records: {
        Row: {
          candidate_id: string
          conflict_detected: boolean
          conflict_reason: string | null
          id: string
          interest_request_id: string
          locked_at: string
          metadata: Json
          prospect_key_hash: string | null
          winning_matchmaker_profile_id: string | null
          winning_organization_id: string | null
          winning_portfolio_link_id: string | null
        }
        Insert: {
          candidate_id: string
          conflict_detected?: boolean
          conflict_reason?: string | null
          id?: string
          interest_request_id: string
          locked_at?: string
          metadata?: Json
          prospect_key_hash?: string | null
          winning_matchmaker_profile_id?: string | null
          winning_organization_id?: string | null
          winning_portfolio_link_id?: string | null
        }
        Update: {
          candidate_id?: string
          conflict_detected?: boolean
          conflict_reason?: string | null
          id?: string
          interest_request_id?: string
          locked_at?: string
          metadata?: Json
          prospect_key_hash?: string | null
          winning_matchmaker_profile_id?: string | null
          winning_organization_id?: string | null
          winning_portfolio_link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_records_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_records_interest_request_id_fkey"
            columns: ["interest_request_id"]
            isOneToOne: true
            referencedRelation: "interest_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_records_winning_matchmaker_profile_id_fkey"
            columns: ["winning_matchmaker_profile_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_records_winning_organization_id_fkey"
            columns: ["winning_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_records_winning_portfolio_link_id_fkey"
            columns: ["winning_portfolio_link_id"]
            isOneToOne: false
            referencedRelation: "portfolio_links"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_clients: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          introduced_by: string | null
          matchmaker_profile_id: string | null
          notes: string | null
          organization_id: string
          relationship_status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          introduced_by?: string | null
          matchmaker_profile_id?: string | null
          notes?: string | null
          organization_id: string
          relationship_status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          introduced_by?: string | null
          matchmaker_profile_id?: string | null
          notes?: string | null
          organization_id?: string
          relationship_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_clients_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_clients_matchmaker_profile_id_fkey"
            columns: ["matchmaker_profile_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_portfolio_edges: {
        Row: {
          broker_id: string
          created_at: string
          id: string
          portfolio_id: string
          ref_token: string
          status: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          id?: string
          portfolio_id: string
          ref_token: string
          status?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          id?: string
          portfolio_id?: string
          ref_token?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_portfolio_edges_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_portfolio_edges_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          business_name: string
          contact_name: string
          created_at: string
          id: string
          is_verified: boolean
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          contact_name: string
          created_at?: string
          id?: string
          is_verified?: boolean
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          contact_name?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      candidate_astrology_details: {
        Row: {
          birth_place: string | null
          birth_time: string | null
          birth_timezone: string | null
          candidate_id: string
          chart_payload: Json
          gothram: string | null
          lagnam: string | null
          manglik_status: string | null
          maternal_gothram: string | null
          nakshatra: string | null
          pada: string | null
          rashi: string | null
          updated_at: string
        }
        Insert: {
          birth_place?: string | null
          birth_time?: string | null
          birth_timezone?: string | null
          candidate_id: string
          chart_payload?: Json
          gothram?: string | null
          lagnam?: string | null
          manglik_status?: string | null
          maternal_gothram?: string | null
          nakshatra?: string | null
          pada?: string | null
          rashi?: string | null
          updated_at?: string
        }
        Update: {
          birth_place?: string | null
          birth_time?: string | null
          birth_timezone?: string | null
          candidate_id?: string
          chart_payload?: Json
          gothram?: string | null
          lagnam?: string | null
          manglik_status?: string | null
          maternal_gothram?: string | null
          nakshatra?: string | null
          pada?: string | null
          rashi?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_astrology_details_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_career_entries: {
        Row: {
          annual_income: string | null
          candidate_id: string
          career_goals: string | null
          company: string | null
          created_at: string
          end_date: string | null
          id: string
          income_currency: string | null
          industry: string | null
          is_current: boolean
          job_type: string | null
          location: string | null
          sort_order: number
          start_date: string | null
          title: string | null
          updated_at: string
          wealth_stage: string | null
        }
        Insert: {
          annual_income?: string | null
          candidate_id: string
          career_goals?: string | null
          company?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          income_currency?: string | null
          industry?: string | null
          is_current?: boolean
          job_type?: string | null
          location?: string | null
          sort_order?: number
          start_date?: string | null
          title?: string | null
          updated_at?: string
          wealth_stage?: string | null
        }
        Update: {
          annual_income?: string | null
          candidate_id?: string
          career_goals?: string | null
          company?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          income_currency?: string | null
          industry?: string | null
          is_current?: boolean
          job_type?: string | null
          location?: string | null
          sort_order?: number
          start_date?: string | null
          title?: string | null
          updated_at?: string
          wealth_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_career_entries_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_education_entries: {
        Row: {
          candidate_id: string
          created_at: string
          degree: string | null
          end_year: number | null
          field_of_study: string | null
          id: string
          institution: string | null
          location: string | null
          qualification_level: string | null
          sort_order: number
          start_year: number | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          degree?: string | null
          end_year?: number | null
          field_of_study?: string | null
          id?: string
          institution?: string | null
          location?: string | null
          qualification_level?: string | null
          sort_order?: number
          start_year?: number | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          degree?: string | null
          end_year?: number | null
          field_of_study?: string | null
          id?: string
          institution?: string | null
          location?: string | null
          qualification_level?: string | null
          sort_order?: number
          start_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_education_entries_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_family_members: {
        Row: {
          business_name: string | null
          candidate_id: string
          created_at: string
          id: string
          location: string | null
          marital_status: string | null
          name: string | null
          occupation: string | null
          relationship: string
          sort_order: number
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          business_name?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          location?: string | null
          marital_status?: string | null
          name?: string | null
          occupation?: string | null
          relationship: string
          sort_order?: number
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          business_name?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          location?: string | null
          marital_status?: string | null
          name?: string | null
          occupation?: string | null
          relationship?: string
          sort_order?: number
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "candidate_family_members_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_lifestyle_details: {
        Row: {
          candidate_id: string
          diet: string | null
          drinking: string | null
          hobbies: string[]
          languages: string[]
          lifestyle_payload: Json
          music: string | null
          smoking: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          diet?: string | null
          drinking?: string | null
          hobbies?: string[]
          languages?: string[]
          lifestyle_payload?: Json
          music?: string | null
          smoking?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          diet?: string | null
          drinking?: string | null
          hobbies?: string[]
          languages?: string[]
          lifestyle_payload?: Json
          music?: string | null
          smoking?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_lifestyle_details_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_partner_preferences: {
        Row: {
          age_max: number | null
          age_min: number | null
          candidate_id: string
          community: string | null
          height_max_text: string | null
          height_min_text: string | null
          location_preference: string | null
          marital_status: string | null
          narrative: string | null
          preferences_payload: Json
          updated_at: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          candidate_id: string
          community?: string | null
          height_max_text?: string | null
          height_min_text?: string | null
          location_preference?: string | null
          marital_status?: string | null
          narrative?: string | null
          preferences_payload?: Json
          updated_at?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          candidate_id?: string
          community?: string | null
          height_max_text?: string | null
          height_min_text?: string | null
          location_preference?: string | null
          marital_status?: string | null
          narrative?: string | null
          preferences_payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_partner_preferences_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_personal_details: {
        Row: {
          about: string | null
          birthplace: string | null
          candidate_id: string
          citizenship: string | null
          community: string | null
          complexion: string | null
          height_text: string | null
          immigration_status: string | null
          long_term_goals: string | null
          marital_status: string | null
          parents_location: string | null
          preferred_name: string | null
          profile_for: string | null
          religion: string | null
          relocation_preference: string | null
          shared_life_plans: string | null
          sibling_count: number | null
          sibling_position: string | null
          sub_community: string | null
          updated_at: string
          values_statement: string | null
        }
        Insert: {
          about?: string | null
          birthplace?: string | null
          candidate_id: string
          citizenship?: string | null
          community?: string | null
          complexion?: string | null
          height_text?: string | null
          immigration_status?: string | null
          long_term_goals?: string | null
          marital_status?: string | null
          parents_location?: string | null
          preferred_name?: string | null
          profile_for?: string | null
          religion?: string | null
          relocation_preference?: string | null
          shared_life_plans?: string | null
          sibling_count?: number | null
          sibling_position?: string | null
          sub_community?: string | null
          updated_at?: string
          values_statement?: string | null
        }
        Update: {
          about?: string | null
          birthplace?: string | null
          candidate_id?: string
          citizenship?: string | null
          community?: string | null
          complexion?: string | null
          height_text?: string | null
          immigration_status?: string | null
          long_term_goals?: string | null
          marital_status?: string | null
          parents_location?: string | null
          preferred_name?: string | null
          profile_for?: string | null
          religion?: string | null
          relocation_preference?: string | null
          shared_life_plans?: string | null
          sibling_count?: number | null
          sibling_position?: string | null
          sub_community?: string | null
          updated_at?: string
          values_statement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_personal_details_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          birth_date: string | null
          created_at: string
          created_by: string | null
          current_city: string | null
          current_country: string | null
          current_organization_id: string | null
          current_region: string | null
          display_name: string
          gender: string | null
          id: string
          legal_name: string | null
          metadata: Json
          primary_owner_user_id: string | null
          source: Database["public"]["Enums"]["candidate_source"]
          status: Database["public"]["Enums"]["candidate_status"]
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          current_city?: string | null
          current_country?: string | null
          current_organization_id?: string | null
          current_region?: string | null
          display_name: string
          gender?: string | null
          id?: string
          legal_name?: string | null
          metadata?: Json
          primary_owner_user_id?: string | null
          source?: Database["public"]["Enums"]["candidate_source"]
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          current_city?: string | null
          current_country?: string | null
          current_organization_id?: string | null
          current_region?: string | null
          display_name?: string
          gender?: string | null
          id?: string
          legal_name?: string | null
          metadata?: Json
          primary_owner_user_id?: string | null
          source?: Database["public"]["Enums"]["candidate_source"]
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compatibility_reports: {
        Row: {
          candidate_id: string | null
          created_at: string
          id: string
          interest_request_id: string | null
          partner_birth_details: Json
          purchase_id: string | null
          purchased_at: string
          purchaser_portfolio_id: string
          report_data: Json
          report_payload: Json
          target_portfolio_id: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          interest_request_id?: string | null
          partner_birth_details?: Json
          purchase_id?: string | null
          purchased_at?: string
          purchaser_portfolio_id: string
          report_data: Json
          report_payload?: Json
          target_portfolio_id: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          id?: string
          interest_request_id?: string | null
          partner_birth_details?: Json
          purchase_id?: string | null
          purchased_at?: string
          purchaser_portfolio_id?: string
          report_data?: Json
          report_payload?: Json
          target_portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_reports_purchaser_portfolio_id_fkey"
            columns: ["purchaser_portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compatibility_reports_target_portfolio_id_fkey"
            columns: ["target_portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          feature_key: string
          feature_value: Json
          id: string
          organization_id: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          feature_key: string
          feature_value?: Json
          id?: string
          organization_id?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          feature_key?: string
          feature_value?: Json
          id?: string
          organization_id?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      handshakes: {
        Row: {
          created_at: string
          id: string
          portfolio_id: string
          prospect_name: string
          prospect_phone: string
          referring_broker_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          portfolio_id: string
          prospect_name: string
          prospect_phone: string
          referring_broker_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          portfolio_id?: string
          prospect_name?: string
          prospect_phone?: string
          referring_broker_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "handshakes_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handshakes_referring_broker_id_fkey"
            columns: ["referring_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_requests: {
        Row: {
          attribution_status: Database["public"]["Enums"]["attribution_status"]
          candidate_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          duplicate_of: string | null
          id: string
          message: string | null
          metadata: Json
          portfolio_id: string
          portfolio_link_id: string | null
          prospect_key_hash: string | null
          referring_matchmaker_profile_id: string | null
          referring_organization_id: string | null
          request_reason: string | null
          requested_sections: string[]
          requester_user_id: string | null
          status: Database["public"]["Enums"]["interest_status"]
          updated_at: string
          viewer_email: string | null
          viewer_family_context: string | null
          viewer_name: string | null
          viewer_phone: string | null
          viewer_session_id: string | null
        }
        Insert: {
          attribution_status?: Database["public"]["Enums"]["attribution_status"]
          candidate_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          duplicate_of?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          portfolio_id: string
          portfolio_link_id?: string | null
          prospect_key_hash?: string | null
          referring_matchmaker_profile_id?: string | null
          referring_organization_id?: string | null
          request_reason?: string | null
          requested_sections?: string[]
          requester_user_id?: string | null
          status?: Database["public"]["Enums"]["interest_status"]
          updated_at?: string
          viewer_email?: string | null
          viewer_family_context?: string | null
          viewer_name?: string | null
          viewer_phone?: string | null
          viewer_session_id?: string | null
        }
        Update: {
          attribution_status?: Database["public"]["Enums"]["attribution_status"]
          candidate_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          duplicate_of?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          portfolio_id?: string
          portfolio_link_id?: string | null
          prospect_key_hash?: string | null
          referring_matchmaker_profile_id?: string | null
          referring_organization_id?: string | null
          request_reason?: string | null
          requested_sections?: string[]
          requester_user_id?: string | null
          status?: Database["public"]["Enums"]["interest_status"]
          updated_at?: string
          viewer_email?: string | null
          viewer_family_context?: string | null
          viewer_name?: string | null
          viewer_phone?: string | null
          viewer_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interest_requests_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_requests_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "interest_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_requests_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_requests_portfolio_link_id_fkey"
            columns: ["portfolio_link_id"]
            isOneToOne: false
            referencedRelation: "portfolio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_requests_referring_matchmaker_profile_id_fkey"
            columns: ["referring_matchmaker_profile_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_requests_referring_organization_id_fkey"
            columns: ["referring_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_requests_viewer_session_id_fkey"
            columns: ["viewer_session_id"]
            isOneToOne: false
            referencedRelation: "viewer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_claims: {
        Row: {
          claim_fee_purchase_id: string | null
          claimed_by: string | null
          created_at: string
          id: string
          listing_id: string
          matchmaker_profile_id: string | null
          organization_id: string
          status: Database["public"]["Enums"]["lead_claim_status"]
          updated_at: string
        }
        Insert: {
          claim_fee_purchase_id?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          listing_id: string
          matchmaker_profile_id?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["lead_claim_status"]
          updated_at?: string
        }
        Update: {
          claim_fee_purchase_id?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          matchmaker_profile_id?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["lead_claim_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_claims_claim_fee_purchase_id_fkey"
            columns: ["claim_fee_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_claims_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_claims_matchmaker_profile_id_fkey"
            columns: ["matchmaker_profile_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          anonymized_snapshot: Json
          candidate_id: string
          created_at: string
          created_by: string | null
          id: string
          status: Database["public"]["Enums"]["marketplace_listing_status"]
          updated_at: string
          visibility_region: string | null
        }
        Insert: {
          anonymized_snapshot?: Json
          candidate_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["marketplace_listing_status"]
          updated_at?: string
          visibility_region?: string | null
        }
        Update: {
          anonymized_snapshot?: Json
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["marketplace_listing_status"]
          updated_at?: string
          visibility_region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaker_profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          id: string
          metadata: Json
          organization_id: string
          service_regions: string[]
          slug: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          metadata?: Json
          organization_id: string
          service_regions?: string[]
          slug?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          metadata?: Json
          organization_id?: string
          service_regions?: string[]
          slug?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "matchmaker_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["organization_member_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["organization_member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          name: string
          slug: string | null
          status: string
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name: string
          slug?: string | null
          status?: string
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          name?: string
          slug?: string | null
          status?: string
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          audience: string
          billing_interval: string | null
          code: string
          created_at: string
          currency: string
          features: Json
          id: string
          is_active: boolean
          name: string
          price_cents: number | null
          updated_at: string
        }
        Insert: {
          audience?: string
          billing_interval?: string | null
          code: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number | null
          updated_at?: string
        }
        Update: {
          audience?: string
          billing_interval?: string | null
          code?: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_events: {
        Row: {
          created_at: string
          event_payload: Json
          event_type: string
          id: string
          portfolio_id: string
          portfolio_link_id: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_payload?: Json
          event_type: string
          id?: string
          portfolio_id: string
          portfolio_link_id?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_payload?: Json
          event_type?: string
          id?: string
          portfolio_id?: string
          portfolio_link_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_events_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_events_portfolio_link_id_fkey"
            columns: ["portfolio_link_id"]
            isOneToOne: false
            referencedRelation: "portfolio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "viewer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_horoscopes: {
        Row: {
          byte_size: number
          created_at: string
          file_extension: string
          id: string
          language_label: string | null
          mime_type: string
          page_count: number | null
          portfolio_id: string
          published_at: string | null
          storage_path: string
          updated_at: string
        }
        Insert: {
          byte_size: number
          created_at?: string
          file_extension: string
          id?: string
          language_label?: string | null
          mime_type: string
          page_count?: number | null
          portfolio_id: string
          published_at?: string | null
          storage_path: string
          updated_at?: string
        }
        Update: {
          byte_size?: number
          created_at?: string
          file_extension?: string
          id?: string
          language_label?: string | null
          mime_type?: string
          page_count?: number | null
          portfolio_id?: string
          published_at?: string | null
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_horoscopes_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: true
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_links: {
        Row: {
          campaign_label: string | null
          channel: Database["public"]["Enums"]["link_channel"]
          created_at: string
          created_by_user_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          matchmaker_profile_id: string | null
          metadata: Json
          organization_id: string | null
          portfolio_id: string
          revoked_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          campaign_label?: string | null
          channel?: Database["public"]["Enums"]["link_channel"]
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          matchmaker_profile_id?: string | null
          metadata?: Json
          organization_id?: string | null
          portfolio_id: string
          revoked_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          campaign_label?: string | null
          channel?: Database["public"]["Enums"]["link_channel"]
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          matchmaker_profile_id?: string | null
          metadata?: Json
          organization_id?: string | null
          portfolio_id?: string
          revoked_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_links_matchmaker_profile_id_fkey"
            columns: ["matchmaker_profile_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_links_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_media: {
        Row: {
          alt_text: string | null
          candidate_id: string | null
          created_at: string
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          metadata: Json
          portfolio_id: string
          public_url: string | null
          sort_order: number
          storage_path: string
          thumbnail_path: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          alt_text?: string | null
          candidate_id?: string | null
          created_at?: string
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          portfolio_id: string
          public_url?: string | null
          sort_order?: number
          storage_path: string
          thumbnail_path?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          alt_text?: string | null
          candidate_id?: string | null
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          portfolio_id?: string
          public_url?: string | null
          sort_order?: number
          storage_path?: string
          thumbnail_path?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_media_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_media_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_enabled: boolean
          portfolio_id: string
          section_key: string
          sort_order: number
          title: string | null
          updated_at: string
          version_id: string | null
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          portfolio_id: string
          section_key: string
          sort_order?: number
          title?: string | null
          updated_at?: string
          version_id?: string | null
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          portfolio_id?: string
          section_key?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
          version_id?: string | null
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_sections_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_sections_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "portfolio_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_versions: {
        Row: {
          created_at: string
          created_by: string | null
          draft_data: Json
          id: string
          notes: string | null
          portfolio_id: string
          published_at: string | null
          published_by: string | null
          published_data: Json | null
          status: Database["public"]["Enums"]["portfolio_version_status"]
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          draft_data?: Json
          id?: string
          notes?: string | null
          portfolio_id: string
          published_at?: string | null
          published_by?: string | null
          published_data?: Json | null
          status?: Database["public"]["Enums"]["portfolio_version_status"]
          updated_at?: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          draft_data?: Json
          id?: string
          notes?: string | null
          portfolio_id?: string
          published_at?: string | null
          published_by?: string | null
          published_data?: Json | null
          status?: Database["public"]["Enums"]["portfolio_version_status"]
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_versions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_views: {
        Row: {
          id: string
          portfolio_id: string
          referring_broker_id: string | null
          viewed_at: string
          viewer_phone: string | null
        }
        Insert: {
          id?: string
          portfolio_id: string
          referring_broker_id?: string | null
          viewed_at?: string
          viewer_phone?: string | null
        }
        Update: {
          id?: string
          portfolio_id?: string
          referring_broker_id?: string | null
          viewed_at?: string
          viewer_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_views_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_views_referring_broker_id_fkey"
            columns: ["referring_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          candidate_id: string | null
          created_at: string
          draft_data: Json
          expires_at: string | null
          id: string
          is_published: boolean
          last_renewed_at: string | null
          owner_organization_id: string | null
          privacy_mode: Database["public"]["Enums"]["portfolio_privacy_mode"]
          public_slug: string | null
          published_at: string | null
          published_data: Json | null
          share_token: string | null
          subscription_tier: string
          sun_sign: string | null
          template_id: number
          theme_color: string | null
          updated_at: string
          user_id: string
          verification_status: string
          verified_attributes: Json
          visibility_settings: Json
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          draft_data?: Json
          expires_at?: string | null
          id?: string
          is_published?: boolean
          last_renewed_at?: string | null
          owner_organization_id?: string | null
          privacy_mode?: Database["public"]["Enums"]["portfolio_privacy_mode"]
          public_slug?: string | null
          published_at?: string | null
          published_data?: Json | null
          share_token?: string | null
          subscription_tier?: string
          sun_sign?: string | null
          template_id?: number
          theme_color?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_attributes?: Json
          visibility_settings?: Json
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          draft_data?: Json
          expires_at?: string | null
          id?: string
          is_published?: boolean
          last_renewed_at?: string | null
          owner_organization_id?: string | null
          privacy_mode?: Database["public"]["Enums"]["portfolio_privacy_mode"]
          public_slug?: string | null
          published_at?: string | null
          published_data?: Json | null
          share_token?: string | null
          subscription_tier?: string
          sun_sign?: string | null
          template_id?: number
          theme_color?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_attributes?: Json
          visibility_settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolios_owner_organization_id_fkey"
            columns: ["owner_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_portfolio_snapshots: {
        Row: {
          data: Json
          expires_at: string | null
          is_active: boolean
          portfolio_id: string
          published_at: string
          share_token: string
          sun_sign: string | null
          template_id: number
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          data?: Json
          expires_at?: string | null
          is_active?: boolean
          portfolio_id: string
          published_at?: string
          share_token: string
          sun_sign?: string | null
          template_id: number
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          data?: Json
          expires_at?: string | null
          is_active?: boolean
          portfolio_id?: string
          published_at?: string
          share_token?: string
          sun_sign?: string | null
          template_id?: number
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_portfolio_snapshots_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: true
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_cents: number
          candidate_id: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          organization_id: string | null
          product_code: string
          provider: string | null
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          candidate_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          product_code: string
          provider?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          candidate_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          product_code?: string
          provider?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_cities: {
        Row: {
          alternative_names: string[]
          ascii_name: string | null
          country_code: string
          geoname_id: number
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          population: number
          region_code: string | null
          updated_at: string
        }
        Insert: {
          alternative_names?: string[]
          ascii_name?: string | null
          country_code: string
          geoname_id: number
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          population?: number
          region_code?: string | null
          updated_at?: string
        }
        Update: {
          alternative_names?: string[]
          ascii_name?: string | null
          country_code?: string
          geoname_id?: number
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          population?: number
          region_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_cities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "reference_countries"
            referencedColumns: ["country_code"]
          },
        ]
      }
      reference_countries: {
        Row: {
          country_code: string
          geoname_id: number | null
          is_active: boolean
          name: string
          phone_code: string | null
          updated_at: string
        }
        Insert: {
          country_code: string
          geoname_id?: number | null
          is_active?: boolean
          name: string
          phone_code?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          geoname_id?: number | null
          is_active?: boolean
          name?: string
          phone_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reference_regions: {
        Row: {
          ascii_name: string | null
          country_code: string
          geoname_id: number
          is_active: boolean
          name: string
          region_code: string
          updated_at: string
        }
        Insert: {
          ascii_name?: string | null
          country_code: string
          geoname_id: number
          is_active?: boolean
          name: string
          region_code: string
          updated_at?: string
        }
        Update: {
          ascii_name?: string | null
          country_code?: string
          geoname_id?: number
          is_active?: boolean
          name?: string
          region_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_regions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "reference_countries"
            referencedColumns: ["country_code"]
          },
        ]
      }
      reveal_grants: {
        Row: {
          access_level: string
          created_at: string
          expires_at: string
          granted_by: string | null
          granted_field_keys: string[]
          granted_media_ids: string[]
          granted_sections: string[]
          id: string
          interest_request_id: string
          last_accessed_at: string | null
          portfolio_id: string
          renewed_at: string | null
          revocation_reason: string | null
          revoked_at: string | null
          viewer_session_id: string | null
          viewer_user_id: string | null
        }
        Insert: {
          access_level?: string
          created_at?: string
          expires_at?: string
          granted_by?: string | null
          granted_field_keys?: string[]
          granted_media_ids?: string[]
          granted_sections?: string[]
          id?: string
          interest_request_id: string
          last_accessed_at?: string | null
          portfolio_id: string
          renewed_at?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          viewer_session_id?: string | null
          viewer_user_id?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string
          expires_at?: string
          granted_by?: string | null
          granted_field_keys?: string[]
          granted_media_ids?: string[]
          granted_sections?: string[]
          id?: string
          interest_request_id?: string
          last_accessed_at?: string | null
          portfolio_id?: string
          renewed_at?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          viewer_session_id?: string | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reveal_grants_interest_request_id_fkey"
            columns: ["interest_request_id"]
            isOneToOne: false
            referencedRelation: "interest_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reveal_grants_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reveal_grants_viewer_session_id_fkey"
            columns: ["viewer_session_id"]
            isOneToOne: false
            referencedRelation: "viewer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          organization_id: string | null
          plan_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
          plan_id: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
          plan_id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          metadata: Json
          phone: string | null
          role_hint: Database["public"]["Enums"]["user_role_hint"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          phone?: string | null
          role_hint?: Database["public"]["Enums"]["user_role_hint"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          phone?: string | null
          role_hint?: Database["public"]["Enums"]["user_role_hint"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          badge_label: string | null
          candidate_id: string
          created_at: string
          evidence_payload: Json
          expires_at: string | null
          id: string
          provider: string | null
          purchase_id: string | null
          status: Database["public"]["Enums"]["verification_status"]
          type: Database["public"]["Enums"]["verification_type"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          badge_label?: string | null
          candidate_id: string
          created_at?: string
          evidence_payload?: Json
          expires_at?: string | null
          id?: string
          provider?: string | null
          purchase_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          type: Database["public"]["Enums"]["verification_type"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          badge_label?: string | null
          candidate_id?: string
          created_at?: string
          evidence_payload?: Json
          expires_at?: string | null
          id?: string
          provider?: string | null
          purchase_id?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          type?: Database["public"]["Enums"]["verification_type"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      viewer_sessions: {
        Row: {
          anonymous_viewer_id: string | null
          city: string | null
          country: string | null
          id: string
          ip_hash: string | null
          last_seen_at: string
          metadata: Json
          portfolio_id: string
          portfolio_link_id: string | null
          referrer: string | null
          region: string | null
          started_at: string
          user_agent_hash: string | null
        }
        Insert: {
          anonymous_viewer_id?: string | null
          city?: string | null
          country?: string | null
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          metadata?: Json
          portfolio_id: string
          portfolio_link_id?: string | null
          referrer?: string | null
          region?: string | null
          started_at?: string
          user_agent_hash?: string | null
        }
        Update: {
          anonymous_viewer_id?: string | null
          city?: string | null
          country?: string | null
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          metadata?: Json
          portfolio_id?: string
          portfolio_link_id?: string | null
          referrer?: string | null
          region?: string | null
          started_at?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viewer_sessions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewer_sessions_portfolio_link_id_fkey"
            columns: ["portfolio_link_id"]
            isOneToOne: false
            referencedRelation: "portfolio_links"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_rules: {
        Row: {
          blurred_teaser: string | null
          created_at: string
          id: string
          portfolio_id: string
          requires_interest: boolean
          requires_owner_approval: boolean
          section_key: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          blurred_teaser?: string | null
          created_at?: string
          id?: string
          portfolio_id: string
          requires_interest?: boolean
          requires_owner_approval?: boolean
          section_key: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          blurred_teaser?: string | null
          created_at?: string
          id?: string
          portfolio_id?: string
          requires_interest?: boolean
          requires_owner_approval?: boolean
          section_key?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "visibility_rules_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_account_deletion_stage: {
        Args: { p_claim_token: string; p_request_id: string; p_stage: string }
        Returns: boolean
      }
      can_manage_organization_member: {
        Args: {
          p_organization_id: string
          p_target_role: Database["public"]["Enums"]["organization_member_role"]
        }
        Returns: boolean
      }
      can_manage_portfolio: {
        Args: { p_portfolio_id: string }
        Returns: boolean
      }
      cancel_account_deletion: { Args: never; Returns: string }
      complete_account_deletion_reauth: {
        Args: { p_challenge_id: string; p_proof_hash: string }
        Returns: string
      }
      claim_account_deletion_batch: {
        Args: { p_limit?: number }
        Returns: {
          claim_token: string
          processing_stage: string
          request_id: string
          user_id: string
        }[]
      }
      complete_account_deletion: {
        Args: { p_claim_token: string; p_request_id: string }
        Returns: boolean
      }
      consume_api_rate_limit: {
        Args: { p_action: string; p_subject_hash?: string }
        Returns: Json
      }
      consume_account_deletion_reauth: { Args: { p_proof_hash: string }; Returns: Json }
      create_organization_with_owner: {
        Args: {
          p_name: string
          p_slug?: string
          p_type: Database["public"]["Enums"]["organization_type"]
        }
        Returns: Json
      }
      decide_interest_request: {
        Args: { p_decision: string; p_interest_request_id: string }
        Returns: string
      }
      export_my_account_data: { Args: never; Returns: Json }
      fail_account_deletion: {
        Args: {
          p_claim_token: string
          p_error_code: string
          p_request_id: string
        }
        Returns: boolean
      }
      has_organization_role: {
        Args: {
          p_organization_id: string
          p_roles: Database["public"]["Enums"]["organization_member_role"][]
        }
        Returns: boolean
      }
      is_current_session_active: { Args: never; Returns: boolean }
      is_organization_member: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      is_public_portfolio_media_path: {
        Args: { p_bucket_id: string; p_object_name: string }
        Returns: boolean
      }
      is_published_portfolio: {
        Args: { p_portfolio_id: string }
        Returns: boolean
      }
      list_portfolio_access: { Args: never; Returns: Json }
      manage_reveal_grant: {
        Args: { p_action: string; p_grant_id: string }
        Returns: Json
      }
      owns_candidate: { Args: { p_candidate_id: string }; Returns: boolean }
      prepare_account_deletion: {
        Args: { p_claim_token: string; p_request_id: string; p_user_id: string }
        Returns: Json
      }
      publish_portfolio_transaction: {
        Args: {
          p_approved_data: Json
          p_draft_data: Json
          p_expires_at: string
          p_portfolio_id: string
          p_public_data: Json
          p_share_token: string
          p_sun_sign: string
          p_template_id: number
          p_theme_color: string
        }
        Returns: Json
      }
      record_account_deletion_auth_deleted: {
        Args: { p_claim_token: string; p_request_id: string }
        Returns: boolean
      }
      record_public_portfolio_view: {
        Args: { p_share_token: string }
        Returns: boolean
      }
      renew_portfolio_transaction: {
        Args: { p_expires_at: string }
        Returns: Json
      }
      replace_candidate_relationships_and_timeline: {
        Args: {
          p_candidate_id: string
          p_career: Json
          p_education: Json
          p_family_members: Json
        }
        Returns: string
      }
      request_account_deletion: { Args: never; Returns: Json }
      start_account_deletion_reauth: {
        Args: { p_initiating_session_id: string }
        Returns: Json
      }
      resolve_approved_horoscope: {
        Args: { p_share_token: string }
        Returns: Json
      }
      resolve_approved_portfolio: {
        Args: { p_share_token: string }
        Returns: Json
      }
      resolve_public_portfolio: {
        Args: { p_share_token: string }
        Returns: Json
      }
      rotate_portfolio_transaction: {
        Args: { p_share_token: string }
        Returns: Json
      }
      run_data_retention: { Args: never; Returns: Json }
      set_portfolio_hero: { Args: { p_media_id: string }; Returns: boolean }
      submit_public_interest: {
        Args: {
          p_email: string
          p_family_context: string
          p_location: string
          p_message: string
          p_name: string
          p_phone: string
          p_portfolio_url?: string
          p_profile_for: string
          p_share_token: string
        }
        Returns: boolean
      }
      unpublish_portfolio_transaction: { Args: never; Returns: Json }
    }
    Enums: {
      attribution_status:
        | "original"
        | "duplicate_same_broker"
        | "conflict_different_broker"
        | "unattributed"
      candidate_source:
        | "self_signup"
        | "broker_invite"
        | "marketplace_claim"
        | "admin_created"
      candidate_status: "draft" | "active" | "paused" | "archived"
      interest_status:
        | "new"
        | "pending_review"
        | "approved"
        | "rejected"
        | "revealed"
        | "closed"
      lead_claim_status:
        | "requested"
        | "approved"
        | "rejected"
        | "paid"
        | "assigned"
        | "withdrawn"
      link_channel:
        | "whatsapp"
        | "email"
        | "manual"
        | "marketplace"
        | "social"
        | "other"
      marketplace_listing_status: "open" | "claimed" | "closed" | "paused"
      media_type:
        | "hero"
        | "gallery"
        | "family"
        | "horoscope"
        | "document"
        | "verification"
      member_status: "invited" | "active" | "suspended" | "removed"
      organization_member_role:
        | "owner"
        | "admin"
        | "editor"
        | "viewer"
        | "broker_agent"
      organization_type: "family" | "matchmaker_agency" | "platform"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      portfolio_privacy_mode: "open" | "balanced" | "private"
      portfolio_version_status: "draft" | "published" | "archived"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
      user_role_hint: "candidate" | "parent" | "broker" | "admin"
      verification_status: "pending" | "verified" | "failed" | "expired"
      verification_type: "identity" | "education" | "immigration" | "employment"
      visibility_level:
        | "public"
        | "blurred"
        | "interest_required"
        | "approved_only"
        | "owner_only"
        | "hidden"
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
      attribution_status: [
        "original",
        "duplicate_same_broker",
        "conflict_different_broker",
        "unattributed",
      ],
      candidate_source: [
        "self_signup",
        "broker_invite",
        "marketplace_claim",
        "admin_created",
      ],
      candidate_status: ["draft", "active", "paused", "archived"],
      interest_status: [
        "new",
        "pending_review",
        "approved",
        "rejected",
        "revealed",
        "closed",
      ],
      lead_claim_status: [
        "requested",
        "approved",
        "rejected",
        "paid",
        "assigned",
        "withdrawn",
      ],
      link_channel: [
        "whatsapp",
        "email",
        "manual",
        "marketplace",
        "social",
        "other",
      ],
      marketplace_listing_status: ["open", "claimed", "closed", "paused"],
      media_type: [
        "hero",
        "gallery",
        "family",
        "horoscope",
        "document",
        "verification",
      ],
      member_status: ["invited", "active", "suspended", "removed"],
      organization_member_role: [
        "owner",
        "admin",
        "editor",
        "viewer",
        "broker_agent",
      ],
      organization_type: ["family", "matchmaker_agency", "platform"],
      payment_status: ["pending", "paid", "failed", "refunded", "cancelled"],
      portfolio_privacy_mode: ["open", "balanced", "private"],
      portfolio_version_status: ["draft", "published", "archived"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ],
      user_role_hint: ["candidate", "parent", "broker", "admin"],
      verification_status: ["pending", "verified", "failed", "expired"],
      verification_type: ["identity", "education", "immigration", "employment"],
      visibility_level: [
        "public",
        "blurred",
        "interest_required",
        "approved_only",
        "owner_only",
        "hidden",
      ],
    },
  },
} as const
