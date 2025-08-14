export interface Institution {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  public_description?: string;
  private_description?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  kyb_status: 'not_verified' | 'pending' | 'verified';
  kyb_provider?: string;
  kyb_verified_at?: Date;
}

export interface InstitutionMember {
  id: string;
  institution_id: string;
  user_id: string;
  role: 'admin' | 'member';
  job_title: string;
  joined_at: Date;
  added_by: string;
  // Include user profile data for display
  user_profile?: {
    id: string;
    display_name: string;
    avatar?: string;
    wallet_address?: string;
  };
}

export interface JobTitle {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
}

export interface InstitutionCreationData {
  name: string;
  description?: string;
  logo?: string;
  public_description?: string;
  private_description?: string;
}

export interface InstitutionWithMembers extends Institution {
  members: InstitutionMember[];
  member_count: number;
  is_member: boolean;
  is_admin: boolean;
}

// Extended error types for institutions
export interface InstitutionError {
  type: 'INSTITUTION_NOT_FOUND' | 'INSTITUTION_ACCESS_DENIED' | 'INSTITUTION_MEMBER_LIMIT_EXCEEDED' | 'INVALID_WALLET_ADDRESS' | 'USER_ALREADY_IN_INSTITUTION';
  message: string;
  details?: any;
}