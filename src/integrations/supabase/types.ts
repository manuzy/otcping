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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          id: string
          skip_approval: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          skip_approval?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          skip_approval?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          severity: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          severity: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          severity?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_folder_assignments: {
        Row: {
          chat_id: string
          created_at: string
          folder_id: string
          id: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          folder_id: string
          id?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          folder_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_folder_assignments_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_folder_assignments_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "chat_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string
          unread_count: number
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string
          unread_count?: number
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_public: boolean
          name: string
          trade_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          is_public?: boolean
          name: string
          trade_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_public?: boolean
          name?: string
          trade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_chains: {
        Row: {
          chain_id: number
          chain_id_hex: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          chain_id: number
          chain_id_hex: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          chain_id?: number
          chain_id_hex?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_licenses: {
        Row: {
          created_at: string
          description: string
          id: string
          license_name: string
          region: string
          region_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          license_name: string
          region: string
          region_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          license_name?: string
          region?: string
          region_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_tokens: {
        Row: {
          address: string
          chain_id: number
          created_at: string
          decimals: number
          id: string
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          address: string
          chain_id: number
          created_at?: string
          decimals?: number
          id?: string
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          address?: string
          chain_id?: number
          created_at?: string
          decimals?: number
          id?: string
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_tokens_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "data_chains"
            referencedColumns: ["chain_id"]
          },
        ]
      }
      institution_aml_program: {
        Row: {
          aml_policy_url: string | null
          authorized_signatories: Json | null
          client_types: string[] | null
          created_at: string
          expected_products_volumes: string | null
          geographic_exposure: string[] | null
          id: string
          institution_id: string
          kyc_onboarding_checklist: string | null
          kyt_alert_handling: string | null
          kyt_monitoring_tool: string | null
          kyt_rule_coverage: string | null
          kyt_thresholds: Json | null
          mlro_contact_id: string | null
          pep_screening_enabled: boolean | null
          periodic_review_cycle: string | null
          retention_periods: Json | null
          risk_assessment_methodology: string | null
          sanctions_lists: string[] | null
          screening_tools: string[] | null
          source_of_funds_wealth: string | null
          travel_rule_coverage_jurisdictions: string[] | null
          travel_rule_message_standard: string | null
          travel_rule_provider: string | null
          ubo_evidence_documents: Json | null
          updated_at: string
        }
        Insert: {
          aml_policy_url?: string | null
          authorized_signatories?: Json | null
          client_types?: string[] | null
          created_at?: string
          expected_products_volumes?: string | null
          geographic_exposure?: string[] | null
          id?: string
          institution_id: string
          kyc_onboarding_checklist?: string | null
          kyt_alert_handling?: string | null
          kyt_monitoring_tool?: string | null
          kyt_rule_coverage?: string | null
          kyt_thresholds?: Json | null
          mlro_contact_id?: string | null
          pep_screening_enabled?: boolean | null
          periodic_review_cycle?: string | null
          retention_periods?: Json | null
          risk_assessment_methodology?: string | null
          sanctions_lists?: string[] | null
          screening_tools?: string[] | null
          source_of_funds_wealth?: string | null
          travel_rule_coverage_jurisdictions?: string[] | null
          travel_rule_message_standard?: string | null
          travel_rule_provider?: string | null
          ubo_evidence_documents?: Json | null
          updated_at?: string
        }
        Update: {
          aml_policy_url?: string | null
          authorized_signatories?: Json | null
          client_types?: string[] | null
          created_at?: string
          expected_products_volumes?: string | null
          geographic_exposure?: string[] | null
          id?: string
          institution_id?: string
          kyc_onboarding_checklist?: string | null
          kyt_alert_handling?: string | null
          kyt_monitoring_tool?: string | null
          kyt_rule_coverage?: string | null
          kyt_thresholds?: Json | null
          mlro_contact_id?: string | null
          pep_screening_enabled?: boolean | null
          periodic_review_cycle?: string | null
          retention_periods?: Json | null
          risk_assessment_methodology?: string | null
          sanctions_lists?: string[] | null
          screening_tools?: string[] | null
          source_of_funds_wealth?: string | null
          travel_rule_coverage_jurisdictions?: string[] | null
          travel_rule_message_standard?: string | null
          travel_rule_provider?: string | null
          ubo_evidence_documents?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_aml_program_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_aml_program_mlro_contact_id_fkey"
            columns: ["mlro_contact_id"]
            isOneToOne: false
            referencedRelation: "institution_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_contacts: {
        Row: {
          created_at: string
          deputy_contact_id: string | null
          email: string
          id: string
          institution_id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deputy_contact_id?: string | null
          email: string
          id?: string
          institution_id: string
          name: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deputy_contact_id?: string | null
          email?: string
          id?: string
          institution_id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_contacts_deputy_contact_id_fkey"
            columns: ["deputy_contact_id"]
            isOneToOne: false
            referencedRelation: "institution_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_contacts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_corporate_profile: {
        Row: {
          created_at: string
          id: string
          incorporation_country: string | null
          incorporation_date: string | null
          institution_id: string
          legal_form: string | null
          legal_name: string
          lei: string | null
          organizational_chart_url: string | null
          principal_address: Json | null
          registration_number: string
          registry_name: string
          trading_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          incorporation_country?: string | null
          incorporation_date?: string | null
          institution_id: string
          legal_form?: string | null
          legal_name: string
          lei?: string | null
          organizational_chart_url?: string | null
          principal_address?: Json | null
          registration_number: string
          registry_name: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          incorporation_country?: string | null
          incorporation_date?: string | null
          institution_id?: string
          legal_form?: string | null
          legal_name?: string
          lei?: string | null
          organizational_chart_url?: string | null
          principal_address?: Json | null
          registration_number?: string
          registry_name?: string
          trading_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_corporate_profile_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_declarations: {
        Row: {
          created_at: string
          id: string
          information_truthful_complete: boolean | null
          institution_id: string
          notification_days_limit: number | null
          notification_obligation_accepted: boolean | null
          signature_date: string | null
          signature_level: string | null
          signature_place: string | null
          signer_name: string | null
          signer_role: string | null
          signer_title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          information_truthful_complete?: boolean | null
          institution_id: string
          notification_days_limit?: number | null
          notification_obligation_accepted?: boolean | null
          signature_date?: string | null
          signature_level?: string | null
          signature_place?: string | null
          signer_name?: string | null
          signer_role?: string | null
          signer_title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          information_truthful_complete?: boolean | null
          institution_id?: string
          notification_days_limit?: number | null
          notification_obligation_accepted?: boolean | null
          signature_date?: string | null
          signature_level?: string | null
          signature_place?: string | null
          signer_name?: string | null
          signer_role?: string | null
          signer_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_declarations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_financials: {
        Row: {
          as_of_date: string | null
          audit_opinion: string | null
          auditor_name: string | null
          auditor_regulation: string | null
          capital_requirement_currency: string | null
          created_at: string
          current_ratio: number | null
          financial_statements: Json | null
          id: string
          institution_id: string
          insurance_details: Json | null
          minimum_capital_requirement: number | null
          quick_ratio: number | null
          regulatory_capital_amount: number | null
          regulatory_capital_currency: string | null
          updated_at: string
        }
        Insert: {
          as_of_date?: string | null
          audit_opinion?: string | null
          auditor_name?: string | null
          auditor_regulation?: string | null
          capital_requirement_currency?: string | null
          created_at?: string
          current_ratio?: number | null
          financial_statements?: Json | null
          id?: string
          institution_id: string
          insurance_details?: Json | null
          minimum_capital_requirement?: number | null
          quick_ratio?: number | null
          regulatory_capital_amount?: number | null
          regulatory_capital_currency?: string | null
          updated_at?: string
        }
        Update: {
          as_of_date?: string | null
          audit_opinion?: string | null
          auditor_name?: string | null
          auditor_regulation?: string | null
          capital_requirement_currency?: string | null
          created_at?: string
          current_ratio?: number | null
          financial_statements?: Json | null
          id?: string
          institution_id?: string
          insurance_details?: Json | null
          minimum_capital_requirement?: number | null
          quick_ratio?: number | null
          regulatory_capital_amount?: number | null
          regulatory_capital_currency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_financials_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_governance: {
        Row: {
          board_committees: Json | null
          compliance_officer: string | null
          compliance_qualifications: string | null
          compliance_reporting_line: string | null
          core_policies: Json | null
          created_at: string
          id: string
          institution_id: string
          internal_audit_officer: string | null
          internal_audit_qualifications: string | null
          internal_audit_reporting_line: string | null
          risk_officer: string | null
          risk_qualifications: string | null
          risk_reporting_line: string | null
          three_lines_description: string | null
          three_lines_implemented: boolean | null
          updated_at: string
        }
        Insert: {
          board_committees?: Json | null
          compliance_officer?: string | null
          compliance_qualifications?: string | null
          compliance_reporting_line?: string | null
          core_policies?: Json | null
          created_at?: string
          id?: string
          institution_id: string
          internal_audit_officer?: string | null
          internal_audit_qualifications?: string | null
          internal_audit_reporting_line?: string | null
          risk_officer?: string | null
          risk_qualifications?: string | null
          risk_reporting_line?: string | null
          three_lines_description?: string | null
          three_lines_implemented?: boolean | null
          updated_at?: string
        }
        Update: {
          board_committees?: Json | null
          compliance_officer?: string | null
          compliance_qualifications?: string | null
          compliance_reporting_line?: string | null
          core_policies?: Json | null
          created_at?: string
          id?: string
          institution_id?: string
          internal_audit_officer?: string | null
          internal_audit_qualifications?: string | null
          internal_audit_reporting_line?: string | null
          risk_officer?: string | null
          risk_qualifications?: string | null
          risk_reporting_line?: string | null
          three_lines_description?: string | null
          three_lines_implemented?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_governance_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_job_titles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      institution_legal_status: {
        Row: {
          adverse_media_check_date: string | null
          adverse_media_method: string | null
          adverse_media_report_url: string | null
          adverse_media_summary: string | null
          created_at: string
          id: string
          institution_id: string
          litigation_investigations: Json | null
          regulatory_actions: Json | null
          updated_at: string
        }
        Insert: {
          adverse_media_check_date?: string | null
          adverse_media_method?: string | null
          adverse_media_report_url?: string | null
          adverse_media_summary?: string | null
          created_at?: string
          id?: string
          institution_id: string
          litigation_investigations?: Json | null
          regulatory_actions?: Json | null
          updated_at?: string
        }
        Update: {
          adverse_media_check_date?: string | null
          adverse_media_method?: string | null
          adverse_media_report_url?: string | null
          adverse_media_summary?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          litigation_investigations?: Json | null
          regulatory_actions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_legal_status_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_members: {
        Row: {
          added_by: string
          id: string
          institution_id: string
          job_title: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          added_by: string
          id?: string
          institution_id: string
          job_title: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          added_by?: string
          id?: string
          institution_id?: string
          job_title?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_operations: {
        Row: {
          access_model: string | null
          bcp_rpo_minutes: number | null
          bcp_rto_minutes: number | null
          bcp_test_results: string | null
          created_at: string
          data_residency_locations: string[] | null
          emergency_contacts: Json | null
          id: string
          institution_id: string
          it_operating_model: string | null
          last_bcp_test_date: string | null
          last_pentest_date: string | null
          outsourcing_arrangements: Json | null
          primary_providers: string[] | null
          regulatory_reporting_supported: boolean | null
          reporting_interfaces: string[] | null
          security_certifications: string[] | null
          updated_at: string
        }
        Insert: {
          access_model?: string | null
          bcp_rpo_minutes?: number | null
          bcp_rto_minutes?: number | null
          bcp_test_results?: string | null
          created_at?: string
          data_residency_locations?: string[] | null
          emergency_contacts?: Json | null
          id?: string
          institution_id: string
          it_operating_model?: string | null
          last_bcp_test_date?: string | null
          last_pentest_date?: string | null
          outsourcing_arrangements?: Json | null
          primary_providers?: string[] | null
          regulatory_reporting_supported?: boolean | null
          reporting_interfaces?: string[] | null
          security_certifications?: string[] | null
          updated_at?: string
        }
        Update: {
          access_model?: string | null
          bcp_rpo_minutes?: number | null
          bcp_rto_minutes?: number | null
          bcp_test_results?: string | null
          created_at?: string
          data_residency_locations?: string[] | null
          emergency_contacts?: Json | null
          id?: string
          institution_id?: string
          it_operating_model?: string | null
          last_bcp_test_date?: string | null
          last_pentest_date?: string | null
          outsourcing_arrangements?: Json | null
          primary_providers?: string[] | null
          regulatory_reporting_supported?: boolean | null
          reporting_interfaces?: string[] | null
          security_certifications?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_operations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_ownership: {
        Row: {
          country: string | null
          created_at: string
          date_of_birth: string | null
          documents: Json | null
          holder_name: string
          holder_type: string
          id: string
          institution_id: string
          is_ubo: boolean | null
          nationality: string | null
          percentage: number
          residency: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          documents?: Json | null
          holder_name: string
          holder_type: string
          id?: string
          institution_id: string
          is_ubo?: boolean | null
          nationality?: string | null
          percentage: number
          residency?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          documents?: Json | null
          holder_name?: string
          holder_type?: string
          id?: string
          institution_id?: string
          is_ubo?: boolean | null
          nationality?: string | null
          percentage?: number
          residency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_ownership_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_regulatory_status: {
        Row: {
          created_at: string
          id: string
          initial_issue_date: string | null
          institution_id: string
          last_renewal_date: string | null
          license_categories: string[] | null
          license_documents: Json | null
          license_number: string
          operating_jurisdictions: string[] | null
          passporting_details: string | null
          passporting_enabled: boolean | null
          primary_authority: string
          public_register_urls: string[] | null
          restrictions_conditions: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          initial_issue_date?: string | null
          institution_id: string
          last_renewal_date?: string | null
          license_categories?: string[] | null
          license_documents?: Json | null
          license_number: string
          operating_jurisdictions?: string[] | null
          passporting_details?: string | null
          passporting_enabled?: boolean | null
          primary_authority: string
          public_register_urls?: string[] | null
          restrictions_conditions?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          initial_issue_date?: string | null
          institution_id?: string
          last_renewal_date?: string | null
          license_categories?: string[] | null
          license_documents?: Json | null
          license_number?: string
          operating_jurisdictions?: string[] | null
          passporting_details?: string | null
          passporting_enabled?: boolean | null
          primary_authority?: string
          public_register_urls?: string[] | null
          restrictions_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_regulatory_status_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_section_completion: {
        Row: {
          completion_percentage: number | null
          created_at: string
          id: string
          institution_id: string
          is_completed: boolean | null
          last_updated_at: string | null
          section_name: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          id?: string
          institution_id: string
          is_completed?: boolean | null
          last_updated_at?: string | null
          section_name: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          id?: string
          institution_id?: string
          is_completed?: boolean | null
          last_updated_at?: string | null
          section_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_section_completion_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_trading_profile: {
        Row: {
          asset_classes: string[] | null
          best_execution_policy_url: string | null
          collateral_practices: string | null
          conflict_management_description: string | null
          conflict_policy_url: string | null
          counterparties: string[] | null
          created_at: string
          custodians: string[] | null
          custody_model: string | null
          id: string
          institution_id: string
          rehypothecation_policy: string | null
          settlement_methods: string[] | null
          updated_at: string
          venues_methods: string[] | null
        }
        Insert: {
          asset_classes?: string[] | null
          best_execution_policy_url?: string | null
          collateral_practices?: string | null
          conflict_management_description?: string | null
          conflict_policy_url?: string | null
          counterparties?: string[] | null
          created_at?: string
          custodians?: string[] | null
          custody_model?: string | null
          id?: string
          institution_id: string
          rehypothecation_policy?: string | null
          settlement_methods?: string[] | null
          updated_at?: string
          venues_methods?: string[] | null
        }
        Update: {
          asset_classes?: string[] | null
          best_execution_policy_url?: string | null
          collateral_practices?: string | null
          conflict_management_description?: string | null
          conflict_policy_url?: string | null
          counterparties?: string[] | null
          created_at?: string
          custodians?: string[] | null
          custody_model?: string | null
          id?: string
          institution_id?: string
          rehypothecation_policy?: string | null
          settlement_methods?: string[] | null
          updated_at?: string
          venues_methods?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_trading_profile_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          kyb_provider: string | null
          kyb_status: string
          kyb_verified_at: string | null
          logo: string | null
          name: string
          private_description: string | null
          public_description: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          kyb_provider?: string | null
          kyb_status?: string
          kyb_verified_at?: string | null
          logo?: string | null
          name: string
          private_description?: string | null
          public_description?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          kyb_provider?: string | null
          kyb_status?: string
          kyb_verified_at?: string | null
          logo?: string | null
          name?: string
          private_description?: string | null
          public_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          created_at: string | null
          id: string
          review_status: string | null
          sumsub_applicant_id: string | null
          updated_at: string | null
          user_id: string
          verification_level: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          review_status?: string | null
          sumsub_applicant_id?: string | null
          updated_at?: string | null
          user_id: string
          verification_level?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          review_status?: string | null
          sumsub_applicant_id?: string | null
          updated_at?: string | null
          user_id?: string
          verification_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_kyc_verifications_user_id"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          parent_message_id: string | null
          search_vector: unknown | null
          sender_id: string
          thread_root_id: string | null
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          search_vector?: unknown | null
          sender_id: string
          thread_root_id?: string | null
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          search_vector?: unknown | null
          sender_id?: string
          thread_root_id?: string | null
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_root_id_fkey"
            columns: ["thread_root_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          email: string | null
          email_frequency: string | null
          enable_email: boolean
          enable_slack: boolean
          enable_sms: boolean
          enable_telegram: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_frequency?: string | null
          enable_email?: boolean
          enable_slack?: boolean
          enable_sms?: boolean
          enable_telegram?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          email_frequency?: string | null
          enable_email?: boolean
          enable_slack?: boolean
          enable_sms?: boolean
          enable_telegram?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          institution_id: string | null
          is_public: boolean
          kyb_provider: string | null
          kyb_status: Database["public"]["Enums"]["kyb_status"] | null
          kyb_verification_type:
            | Database["public"]["Enums"]["kyb_verification_type"]
            | null
          kyb_verified_at: string | null
          kyc_documents_status: Json | null
          kyc_level: Database["public"]["Enums"]["kyc_level"]
          kyc_verification_date: string | null
          licenses: string[]
          reputation: number
          successful_trades: number
          sumsub_applicant_id: string | null
          total_trades: number
          trader_type: Database["public"]["Enums"]["trader_type"]
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          id: string
          institution_id?: string | null
          is_public?: boolean
          kyb_provider?: string | null
          kyb_status?: Database["public"]["Enums"]["kyb_status"] | null
          kyb_verification_type?:
            | Database["public"]["Enums"]["kyb_verification_type"]
            | null
          kyb_verified_at?: string | null
          kyc_documents_status?: Json | null
          kyc_level?: Database["public"]["Enums"]["kyc_level"]
          kyc_verification_date?: string | null
          licenses?: string[]
          reputation?: number
          successful_trades?: number
          sumsub_applicant_id?: string | null
          total_trades?: number
          trader_type?: Database["public"]["Enums"]["trader_type"]
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          institution_id?: string | null
          is_public?: boolean
          kyb_provider?: string | null
          kyb_status?: Database["public"]["Enums"]["kyb_status"] | null
          kyb_verification_type?:
            | Database["public"]["Enums"]["kyb_verification_type"]
            | null
          kyb_verified_at?: string | null
          kyc_documents_status?: Json | null
          kyc_level?: Database["public"]["Enums"]["kyc_level"]
          kyc_verification_date?: string | null
          licenses?: string[]
          reputation?: number
          successful_trades?: number
          sumsub_applicant_id?: string | null
          total_trades?: number
          trader_type?: Database["public"]["Enums"]["trader_type"]
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rated_user_id: string
          rater_id: string
          rating_value: number
          trade_id: string | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_user_id: string
          rater_id: string
          rating_value: number
          trade_id?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_user_id?: string
          rater_id?: string
          rating_value?: number
          trade_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          buy_asset: string | null
          chain: string
          chain_id: number | null
          created_at: string
          created_by: string
          expected_execution: string | null
          expiry_timestamp: string | null
          expiry_type: string | null
          id: string
          limit_price: string | null
          pair: string
          price: string
          sell_asset: string | null
          size: string
          status: Database["public"]["Enums"]["trade_status"]
          token_amount: string | null
          trigger_asset: string | null
          trigger_condition: string | null
          trigger_price: string | null
          type: Database["public"]["Enums"]["trade_type"]
          updated_at: string
          usd_amount: string | null
        }
        Insert: {
          buy_asset?: string | null
          chain: string
          chain_id?: number | null
          created_at?: string
          created_by: string
          expected_execution?: string | null
          expiry_timestamp?: string | null
          expiry_type?: string | null
          id?: string
          limit_price?: string | null
          pair: string
          price: string
          sell_asset?: string | null
          size: string
          status?: Database["public"]["Enums"]["trade_status"]
          token_amount?: string | null
          trigger_asset?: string | null
          trigger_condition?: string | null
          trigger_price?: string | null
          type: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
          usd_amount?: string | null
        }
        Update: {
          buy_asset?: string | null
          chain?: string
          chain_id?: number | null
          created_at?: string
          created_by?: string
          expected_execution?: string | null
          expiry_timestamp?: string | null
          expiry_type?: string | null
          id?: string
          limit_price?: string | null
          pair?: string
          price?: string
          sell_asset?: string | null
          size?: string
          status?: Database["public"]["Enums"]["trade_status"]
          token_amount?: string | null
          trigger_asset?: string | null
          trigger_condition?: string | null
          trigger_price?: string | null
          type?: Database["public"]["Enums"]["trade_type"]
          updated_at?: string
          usd_amount?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_trades_chain_id"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "data_chains"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "trades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          message: string
          nonce: string
          signature: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          message: string
          nonce: string
          signature: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string
          nonce?: string
          signature?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_uid_test: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      authenticate_wallet: {
        Args: {
          nonce_value: string
          signature_msg: string
          user_signature: string
          wallet_addr: string
        }
        Returns: Json
      }
      calculate_user_reputation: {
        Args: { user_id: string }
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_wallet_challenge: {
        Args: { wallet_addr: string }
        Returns: Json
      }
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
      increment_unread_count: {
        Args: { chat_id: string; sender_id: string }
        Returns: undefined
      }
      user_is_chat_member: {
        Args: { check_chat_id: string; check_user_id: string }
        Returns: boolean
      }
      user_is_institution_creator: {
        Args: { institution_id: string }
        Returns: boolean
      }
      user_is_institution_member: {
        Args: { institution_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      kyb_status: "verified" | "not_verified" | "pending"
      kyb_verification_type: "basic" | "full"
      kyc_level: "Level 0" | "Level 1" | "Level 2"
      message_type: "message" | "trade_action" | "system"
      trade_status: "active" | "completed" | "cancelled"
      trade_type: "buy" | "sell"
      trader_type: "Degen" | "Institutional"
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
      app_role: ["admin", "moderator", "user"],
      kyb_status: ["verified", "not_verified", "pending"],
      kyb_verification_type: ["basic", "full"],
      kyc_level: ["Level 0", "Level 1", "Level 2"],
      message_type: ["message", "trade_action", "system"],
      trade_status: ["active", "completed", "cancelled"],
      trade_type: ["buy", "sell"],
      trader_type: ["Degen", "Institutional"],
    },
  },
} as const
