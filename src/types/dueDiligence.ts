// Comprehensive types for institutional due diligence

export interface StructuredAddress {
  street: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string; // ISO 3166-1 alpha-2
}

export interface Contact {
  id?: string;
  role: 'Compliance Officer' | 'MLRO' | 'CFO' | 'CTO' | 'Legal' | 'Operations' | 'Other';
  name: string;
  email: string;
  phone?: string; // E.164 format
  deputy_contact_id?: string;
}

export interface OwnershipEntry {
  id?: string;
  holder_name: string;
  holder_type: 'natural_person' | 'legal_entity';
  country?: string; // ISO 3166-1 alpha-2
  percentage: number; // 0-100
  is_ubo: boolean;
  date_of_birth?: Date; // For natural persons
  nationality?: string; // For natural persons
  residency?: string; // For natural persons
  documents: DocumentReference[];
}

export interface DocumentReference {
  name: string;
  url: string;
  type: string;
  uploaded_at: Date;
}

export interface CorporateProfile {
  id?: string;
  institution_id: string;
  legal_name: string;
  trading_name?: string;
  lei?: string; // 20 character LEI code
  legal_form?: string;
  registration_number: string;
  registry_name: string;
  incorporation_date?: Date;
  incorporation_country?: string; // ISO 3166-1 alpha-2
  principal_address?: StructuredAddress;
  website?: string;
  organizational_chart_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface RegulatoryStatus {
  id?: string;
  institution_id: string;
  primary_authority: string;
  license_number: string;
  license_categories: string[];
  operating_jurisdictions: string[]; // ISO 3166-1 alpha-2 codes
  passporting_enabled: boolean;
  passporting_details?: string;
  restrictions_conditions?: string;
  initial_issue_date?: Date;
  last_renewal_date?: Date;
  public_register_urls: string[];
  license_documents: DocumentReference[];
  created_at?: Date;
  updated_at?: Date;
}

export interface Governance {
  id?: string;
  institution_id: string;
  three_lines_implemented: boolean;
  three_lines_description?: string;
  compliance_officer?: string;
  compliance_qualifications?: string;
  compliance_reporting_line?: string;
  risk_officer?: string;
  risk_qualifications?: string;
  risk_reporting_line?: string;
  internal_audit_officer?: string;
  internal_audit_qualifications?: string;
  internal_audit_reporting_line?: string;
  board_committees: BoardCommittee[];
  core_policies: CorePolicies;
  created_at?: Date;
  updated_at?: Date;
}

export interface BoardCommittee {
  name: string;
  members: string[];
  independence: boolean;
  meeting_cadence: string;
}

export interface CorePolicies {
  risk_framework: boolean;
  compliance_manual: boolean;
  internal_audit_charter: boolean;
  conflicts_of_interest: boolean;
  remuneration: boolean;
  outsourcing: boolean;
  best_execution: boolean;
}

export interface Financials {
  id?: string;
  institution_id: string;
  regulatory_capital_amount?: number;
  regulatory_capital_currency?: string; // ISO 4217
  minimum_capital_requirement?: number;
  capital_requirement_currency?: string; // ISO 4217
  as_of_date?: Date;
  auditor_name?: string;
  auditor_regulation?: string;
  audit_opinion?: 'Unqualified' | 'Qualified' | 'Adverse' | 'Disclaimer';
  current_ratio?: number;
  quick_ratio?: number;
  financial_statements: FinancialStatement[];
  insurance_details: InsuranceDetails;
  created_at?: Date;
  updated_at?: Date;
}

export interface FinancialStatement {
  year: number;
  auditor: string;
  opinion: string;
  document_url?: string;
}

export interface InsuranceDetails {
  insurer?: string;
  coverage_amount?: number;
  currency?: string;
  expiry_date?: Date;
  policy_document_url?: string;
}

export interface Operations {
  id?: string;
  institution_id: string;
  it_operating_model?: 'On-prem' | 'Cloud' | 'Hybrid';
  primary_providers: string[];
  data_residency_locations: string[];
  security_certifications: string[];
  last_pentest_date?: Date;
  access_model?: 'RBAC' | 'ABAC';
  bcp_rto_minutes?: number;
  bcp_rpo_minutes?: number;
  last_bcp_test_date?: Date;
  bcp_test_results?: string;
  emergency_contacts: EmergencyContact[];
  reporting_interfaces: string[];
  regulatory_reporting_supported: boolean;
  outsourcing_arrangements: OutsourcingArrangement[];
  created_at?: Date;
  updated_at?: Date;
}

export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface OutsourcingArrangement {
  provider: string;
  service: string;
  country: string;
  criticality: 'Low' | 'Medium' | 'High' | 'Critical';
  contract_in_place: boolean;
  exit_plan_available: boolean;
}

export interface TradingProfile {
  id?: string;
  institution_id: string;
  asset_classes: string[];
  venues_methods: string[];
  best_execution_policy_url?: string;
  settlement_methods: string[];
  custody_model?: string;
  counterparties: string[];
  collateral_practices?: string;
  custodians: string[];
  rehypothecation_policy?: string;
  conflict_management_description?: string;
  conflict_policy_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface AMLProgram {
  id?: string;
  institution_id: string;
  aml_policy_url?: string;
  mlro_contact_id?: string;
  screening_tools: string[];
  sanctions_lists: string[];
  risk_assessment_methodology?: string;
  kyc_onboarding_checklist?: string;
  pep_screening_enabled: boolean;
  periodic_review_cycle?: string;
  retention_periods: Record<string, string>;
  expected_products_volumes?: string;
  client_types: string[];
  geographic_exposure: string[];
  source_of_funds_wealth?: string;
  kyt_monitoring_tool?: string;
  kyt_rule_coverage?: string;
  kyt_thresholds: Record<string, any>;
  kyt_alert_handling?: string;
  travel_rule_provider?: string;
  travel_rule_message_standard?: string;
  travel_rule_coverage_jurisdictions: string[];
  authorized_signatories: AuthorizedSignatory[];
  ubo_evidence_documents: DocumentReference[];
  created_at?: Date;
  updated_at?: Date;
}

export interface AuthorizedSignatory {
  name: string;
  role: string;
  specimen_signature_url?: string;
}

export interface LegalStatus {
  id?: string;
  institution_id: string;
  litigation_investigations: LegalCase[];
  regulatory_actions: RegulatoryAction[];
  adverse_media_check_date?: Date;
  adverse_media_method?: string;
  adverse_media_summary?: string;
  adverse_media_report_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface LegalCase {
  case_id: string;
  type: 'litigation' | 'investigation';
  status: 'open' | 'closed' | 'settled';
  description: string;
  documents: DocumentReference[];
}

export interface RegulatoryAction {
  action_id: string;
  authority: string;
  type: string;
  status: string;
  date: Date;
  description: string;
  documents: DocumentReference[];
}

export interface Declarations {
  id?: string;
  institution_id: string;
  information_truthful_complete: boolean;
  notification_obligation_accepted: boolean;
  notification_days_limit: number;
  signer_name?: string;
  signer_role?: string;
  signer_title?: string;
  signature_place?: string;
  signature_date?: Date;
  signature_level?: 'qualified' | 'advanced';
  created_at?: Date;
  updated_at?: Date;
}

export interface SectionCompletion {
  id?: string;
  institution_id: string;
  section_name: DueDiligenceSection;
  is_completed: boolean;
  completion_percentage: number;
  last_updated_at: Date;
  created_at?: Date;
}

export type DueDiligenceSection = 
  | 'corporate_profile'
  | 'regulatory_status'
  | 'governance'
  | 'financials'
  | 'operations'
  | 'trading_profile'
  | 'aml_program'
  | 'legal_status'
  | 'declarations';

export interface DueDiligenceData {
  corporate_profile?: CorporateProfile;
  contacts: Contact[];
  ownership: OwnershipEntry[];
  regulatory_status?: RegulatoryStatus;
  governance?: Governance;
  financials?: Financials;
  operations?: Operations;
  trading_profile?: TradingProfile;
  aml_program?: AMLProgram;
  legal_status?: LegalStatus;
  declarations?: Declarations;
  section_completion: Record<DueDiligenceSection, SectionCompletion>;
}

// Validation constants
export const LEI_REGEX = /^[A-Z0-9]{20}$/;
export const ISO_COUNTRY_REGEX = /^[A-Z]{2}$/;
export const ISO_CURRENCY_REGEX = /^[A-Z]{3}$/;
export const E164_PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

// License categories
export const LICENSE_CATEGORIES = [
  'Broker-Dealer',
  'Investment Firm',
  'MTF/OTF',
  'ATS',
  'VASP/Crypto Asset Service Provider',
  'Investment Advisor',
  'Commodity Trading Advisor',
  'Futures Commission Merchant',
  'Other'
] as const;

// Asset classes
export const ASSET_CLASSES = [
  'Spot',
  'Derivatives',
  'FX',
  'Fixed Income',
  'Equities',
  'Crypto/Digital Assets',
  'Commodities',
  'Other'
] as const;

// Venues and methods
export const VENUES_METHODS = [
  'CEX',
  'DEX',
  'OTC',
  'MTF',
  'OTF',
  'ATS',
  'Dark Pool',
  'Other'
] as const;

// Contact roles
export const CONTACT_ROLES = [
  'Compliance Officer',
  'MLRO',
  'CFO',
  'CTO',
  'Legal',
  'Operations',
  'Other'
] as const;

// Legal forms (can be extended per jurisdiction)
export const LEGAL_FORMS = [
  'Corporation',
  'Limited Liability Company',
  'Partnership',
  'Limited Partnership',
  'Limited Liability Partnership',
  'Sole Proprietorship',
  'Other'
] as const;

// Audit opinions
export const AUDIT_OPINIONS = [
  'Unqualified',
  'Qualified',
  'Adverse',
  'Disclaimer'
] as const;