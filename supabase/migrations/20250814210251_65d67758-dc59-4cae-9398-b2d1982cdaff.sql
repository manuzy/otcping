-- Create comprehensive due diligence tables for institutional trading firms

-- Corporate profile table
CREATE TABLE public.institution_corporate_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  lei TEXT, -- 20 character LEI code
  legal_form TEXT,
  registration_number TEXT NOT NULL,
  registry_name TEXT NOT NULL,
  incorporation_date DATE,
  incorporation_country TEXT, -- ISO 3166-1 alpha-2
  principal_address JSONB, -- Structured address
  website TEXT,
  organizational_chart_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contacts table
CREATE TABLE public.institution_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- Compliance Officer, MLRO, CFO, CTO, Legal, Operations
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT, -- E.164 format
  deputy_contact_id UUID REFERENCES public.institution_contacts(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ownership structure table
CREATE TABLE public.institution_ownership (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  holder_name TEXT NOT NULL,
  holder_type TEXT NOT NULL, -- natural_person, legal_entity
  country TEXT, -- ISO 3166-1 alpha-2
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  is_ubo BOOLEAN DEFAULT FALSE,
  date_of_birth DATE, -- For natural persons
  nationality TEXT, -- For natural persons
  residency TEXT, -- For natural persons
  documents JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Regulatory status table
CREATE TABLE public.institution_regulatory_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  primary_authority TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_categories TEXT[] DEFAULT '{}',
  operating_jurisdictions TEXT[] DEFAULT '{}', -- ISO 3166-1 alpha-2 codes
  passporting_enabled BOOLEAN DEFAULT FALSE,
  passporting_details TEXT,
  restrictions_conditions TEXT,
  initial_issue_date DATE,
  last_renewal_date DATE,
  public_register_urls TEXT[] DEFAULT '{}',
  license_documents JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Governance and control functions table
CREATE TABLE public.institution_governance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  three_lines_implemented BOOLEAN DEFAULT FALSE,
  three_lines_description TEXT,
  compliance_officer TEXT,
  compliance_qualifications TEXT,
  compliance_reporting_line TEXT,
  risk_officer TEXT,
  risk_qualifications TEXT,
  risk_reporting_line TEXT,
  internal_audit_officer TEXT,
  internal_audit_qualifications TEXT,
  internal_audit_reporting_line TEXT,
  board_committees JSONB DEFAULT '[]',
  core_policies JSONB DEFAULT '{}', -- Risk Framework, Compliance Manual, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Financial soundness table
CREATE TABLE public.institution_financials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  regulatory_capital_amount DECIMAL(20,2),
  regulatory_capital_currency TEXT, -- ISO 4217
  minimum_capital_requirement DECIMAL(20,2),
  capital_requirement_currency TEXT, -- ISO 4217
  as_of_date DATE,
  auditor_name TEXT,
  auditor_regulation TEXT,
  audit_opinion TEXT, -- Unqualified, Qualified, Adverse, Disclaimer
  current_ratio DECIMAL(10,4),
  quick_ratio DECIMAL(10,4),
  financial_statements JSONB DEFAULT '[]', -- Last 3 years
  insurance_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Operations (IT, BCP/DRP, etc.) table
CREATE TABLE public.institution_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  it_operating_model TEXT, -- On-prem, Cloud, Hybrid
  primary_providers TEXT[] DEFAULT '{}',
  data_residency_locations TEXT[] DEFAULT '{}',
  security_certifications TEXT[] DEFAULT '{}', -- ISO 27001, SOC 2
  last_pentest_date DATE,
  access_model TEXT, -- RBAC, ABAC
  bcp_rto_minutes INTEGER,
  bcp_rpo_minutes INTEGER,
  last_bcp_test_date DATE,
  bcp_test_results TEXT,
  emergency_contacts JSONB DEFAULT '[]',
  reporting_interfaces TEXT[] DEFAULT '{}', -- FIX, REST API, SFTP, CSV
  regulatory_reporting_supported BOOLEAN DEFAULT FALSE,
  outsourcing_arrangements JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trading and execution profile table
CREATE TABLE public.institution_trading_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  asset_classes TEXT[] DEFAULT '{}', -- spot, derivatives, FX, fixed income, equities, crypto
  venues_methods TEXT[] DEFAULT '{}', -- CEX, DEX, OTC, MTF, OTF, ATS
  best_execution_policy_url TEXT,
  settlement_methods TEXT[] DEFAULT '{}', -- T+0, T+1, T+2, on-chain
  custody_model TEXT,
  counterparties TEXT[] DEFAULT '{}',
  collateral_practices TEXT,
  custodians TEXT[] DEFAULT '{}',
  rehypothecation_policy TEXT,
  conflict_management_description TEXT,
  conflict_policy_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AML/KYC/KYT program table
CREATE TABLE public.institution_aml_program (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  aml_policy_url TEXT,
  mlro_contact_id UUID REFERENCES public.institution_contacts(id),
  screening_tools TEXT[] DEFAULT '{}',
  sanctions_lists TEXT[] DEFAULT '{}', -- UN, EU, OFAC, HMT
  risk_assessment_methodology TEXT,
  kyc_onboarding_checklist TEXT,
  pep_screening_enabled BOOLEAN DEFAULT FALSE,
  periodic_review_cycle TEXT,
  retention_periods JSONB DEFAULT '{}',
  expected_products_volumes TEXT,
  client_types TEXT[] DEFAULT '{}', -- retail, professional, institutional
  geographic_exposure TEXT[] DEFAULT '{}',
  source_of_funds_wealth TEXT,
  kyt_monitoring_tool TEXT,
  kyt_rule_coverage TEXT,
  kyt_thresholds JSONB DEFAULT '{}',
  kyt_alert_handling TEXT,
  travel_rule_provider TEXT,
  travel_rule_message_standard TEXT,
  travel_rule_coverage_jurisdictions TEXT[] DEFAULT '{}',
  authorized_signatories JSONB DEFAULT '[]',
  ubo_evidence_documents JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Legal and reputational table
CREATE TABLE public.institution_legal_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  litigation_investigations JSONB DEFAULT '[]',
  regulatory_actions JSONB DEFAULT '[]',
  adverse_media_check_date DATE,
  adverse_media_method TEXT,
  adverse_media_summary TEXT,
  adverse_media_report_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Declarations and attestations table
CREATE TABLE public.institution_declarations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  information_truthful_complete BOOLEAN DEFAULT FALSE,
  notification_obligation_accepted BOOLEAN DEFAULT FALSE,
  notification_days_limit INTEGER DEFAULT 30,
  signer_name TEXT,
  signer_role TEXT,
  signer_title TEXT,
  signature_place TEXT,
  signature_date TIMESTAMP WITH TIME ZONE,
  signature_level TEXT, -- qualified, advanced
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Section completion tracking
CREATE TABLE public.institution_section_completion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL, -- corporate_profile, regulatory_status, etc.
  is_completed BOOLEAN DEFAULT FALSE,
  completion_percentage INTEGER DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(institution_id, section_name)
);

-- Enable RLS on all tables
ALTER TABLE public.institution_corporate_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_regulatory_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_governance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_trading_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_aml_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_legal_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_section_completion ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Institution members can view/edit their institution's data
CREATE POLICY "Institution members can view corporate profile" 
ON public.institution_corporate_profile 
FOR SELECT 
USING (user_is_institution_member(institution_id, auth.uid()));

CREATE POLICY "Institution creators can manage corporate profile" 
ON public.institution_corporate_profile 
FOR ALL 
USING (user_is_institution_creator(institution_id));

-- Apply similar policies to all tables
CREATE POLICY "Institution members can view contacts" ON public.institution_contacts FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage contacts" ON public.institution_contacts FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view ownership" ON public.institution_ownership FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage ownership" ON public.institution_ownership FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view regulatory status" ON public.institution_regulatory_status FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage regulatory status" ON public.institution_regulatory_status FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view governance" ON public.institution_governance FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage governance" ON public.institution_governance FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view financials" ON public.institution_financials FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage financials" ON public.institution_financials FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view operations" ON public.institution_operations FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage operations" ON public.institution_operations FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view trading profile" ON public.institution_trading_profile FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage trading profile" ON public.institution_trading_profile FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view AML program" ON public.institution_aml_program FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage AML program" ON public.institution_aml_program FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view legal status" ON public.institution_legal_status FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage legal status" ON public.institution_legal_status FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view declarations" ON public.institution_declarations FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage declarations" ON public.institution_declarations FOR ALL USING (user_is_institution_creator(institution_id));

CREATE POLICY "Institution members can view completion status" ON public.institution_section_completion FOR SELECT USING (user_is_institution_member(institution_id, auth.uid()));
CREATE POLICY "Institution creators can manage completion status" ON public.institution_section_completion FOR ALL USING (user_is_institution_creator(institution_id));

-- Add triggers for updated_at columns
CREATE TRIGGER update_institution_corporate_profile_updated_at BEFORE UPDATE ON public.institution_corporate_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_contacts_updated_at BEFORE UPDATE ON public.institution_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_ownership_updated_at BEFORE UPDATE ON public.institution_ownership FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_regulatory_status_updated_at BEFORE UPDATE ON public.institution_regulatory_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_governance_updated_at BEFORE UPDATE ON public.institution_governance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_financials_updated_at BEFORE UPDATE ON public.institution_financials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_operations_updated_at BEFORE UPDATE ON public.institution_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_trading_profile_updated_at BEFORE UPDATE ON public.institution_trading_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_aml_program_updated_at BEFORE UPDATE ON public.institution_aml_program FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_legal_status_updated_at BEFORE UPDATE ON public.institution_legal_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_institution_declarations_updated_at BEFORE UPDATE ON public.institution_declarations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();