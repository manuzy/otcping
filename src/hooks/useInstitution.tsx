import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Institution, InstitutionMember, JobTitle, InstitutionCreationData, InstitutionWithMembers } from '@/types/institution';
import { logger } from '@/lib/logger';
import { errorHandler } from '@/lib/errorHandler';
import { auditLogger, AuditAction, ResourceType } from '@/lib/security/auditLogger';
import { monitorDataAccess } from '@/lib/security/monitoringEnhancement';

export const useInstitution = () => {
  const { user } = useAuth();
  const [institution, setInstitution] = useState<InstitutionWithMembers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInstitution = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      logger.debug('Fetching user institution', { userId: user.id });

      // First get the user's institution from their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.institution_id) {
        setInstitution(null);
        return;
      }

      // Fetch full institution data with members
      const { data: institutionData, error: institutionError } = await supabase
        .from('institutions')
        .select(`
          *,
          institution_members!inner (
            id,
            user_id,
            role,
            job_title,
            joined_at,
            added_by,
            profiles:user_id (
              id,
              display_name,
              avatar,
              wallet_address
            )
          )
        `)
        .eq('id', profile.institution_id)
        .single();

      if (institutionError) {
        throw institutionError;
      }

      // Log data access
      await monitorDataAccess(user.id, 'institution', profile.institution_id, 'read');

      // Check if user is admin
      const userMember = institutionData.institution_members.find(
        (member: any) => member.user_id === user.id
      );
      
      const enrichedInstitution: InstitutionWithMembers = {
        ...institutionData,
        created_at: new Date(institutionData.created_at),
        updated_at: new Date(institutionData.updated_at),
        kyb_verified_at: institutionData.kyb_verified_at ? new Date(institutionData.kyb_verified_at) : undefined,
        kyb_status: institutionData.kyb_status as 'not_verified' | 'pending' | 'verified',
        members: institutionData.institution_members.map((member: any) => ({
          ...member,
          joined_at: new Date(member.joined_at),
          user_profile: member.profiles
        })),
        member_count: institutionData.institution_members.length,
        is_member: !!userMember,
        is_admin: userMember?.role === 'admin'
      };

      setInstitution(enrichedInstitution);
      logger.info('Institution fetched successfully', { institutionId: institutionData.id });

    } catch (err: any) {
      const handledError = errorHandler.handle(err, false);
      setError(handledError.userMessage);
      logger.error('Failed to fetch institution', { userId: user.id }, err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserInstitution();
  }, [fetchUserInstitution]);

  return {
    institution,
    loading,
    error,
    refetch: fetchUserInstitution
  };
};

export const useInstitutionCreation = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInstitution = useCallback(async (data: InstitutionCreationData) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      logger.debug('Creating institution', { userId: user.id, name: data.name });

      // Check if user already belongs to an institution
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (existingProfile?.institution_id) {
        throw new Error('User already belongs to an institution');
      }

      const { data: newInstitution, error: createError } = await supabase
        .from('institutions')
        .insert({
          ...data,
          created_by: user.id
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      logger.info('Institution created successfully', { 
        institutionId: newInstitution.id, 
        userId: user.id 
      });

      // Log audit trail asynchronously (non-blocking)
      try {
        await auditLogger.logAdmin(
          'INSTITUTION_CREATED' as any,
          'INSTITUTION' as any,
          newInstitution.id,
          { institution_name: data.name }
        );
        logger.debug('Audit log recorded for institution creation', { institutionId: newInstitution.id });
      } catch (auditError: any) {
        // Don't fail the entire operation if audit logging fails
        logger.warn('Failed to record audit log for institution creation', 
          { institutionId: newInstitution.id }, 
          auditError
        );
        console.warn('Audit logging failed:', auditError);
      }

      return newInstitution;

    } catch (err: any) {
      const handledError = errorHandler.handle(err, true);
      setError(handledError.userMessage);
      logger.error('Failed to create institution', { userId: user.id }, err);
      throw handledError;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    createInstitution,
    loading,
    error
  };
};

export const useJobTitles = () => {
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobTitles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('institution_job_titles')
        .select('*')
        .eq('is_active', true)
        .order('title');

      if (fetchError) {
        throw fetchError;
      }

      setJobTitles((data || []).map(item => ({
        ...item,
        created_at: new Date(item.created_at)
      })));
      logger.debug('Job titles fetched successfully', { count: data?.length });

    } catch (err: any) {
      const handledError = errorHandler.handle(err, false);
      setError(handledError.userMessage);
      logger.error('Failed to fetch job titles', {}, err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobTitles();
  }, [fetchJobTitles]);

  return {
    jobTitles,
    loading,
    error,
    refetch: fetchJobTitles
  };
};

export const useInstitutionMembers = (institutionId?: string) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMember = useCallback(async (walletAddress: string, jobTitle: string) => {
    if (!user?.id || !institutionId) {
      throw new Error('Missing required parameters');
    }

    try {
      setLoading(true);
      setError(null);

      logger.debug('Adding institution member', { 
        institutionId, 
        walletAddress: walletAddress.slice(0, 8) + '...', 
        jobTitle 
      });

      // Find user by wallet address
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id, institution_id')
        .eq('wallet_address', walletAddress)
        .single();

      if (userError || !targetUser) {
        throw new Error('User with this wallet address not found');
      }

      if (targetUser.institution_id) {
        throw new Error('User already belongs to an institution');
      }

      // Add member
      const { data: newMember, error: memberError } = await supabase
        .from('institution_members')
        .insert({
          institution_id: institutionId,
          user_id: targetUser.id,
          role: 'member',
          job_title: jobTitle,
          added_by: user.id
        })
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      logger.info('Institution member added successfully', { 
        memberId: newMember.id,
        institutionId 
      });

      // Log audit trail asynchronously (non-blocking)
      try {
        await auditLogger.logAdmin(
          'INSTITUTION_MEMBER_ADDED' as any,
          'INSTITUTION_MEMBER' as any,
          newMember.id,
          { 
            institution_id: institutionId,
            target_user_id: targetUser.id,
            wallet_address: walletAddress,
            job_title: jobTitle 
          }
        );
        logger.debug('Audit log recorded for member addition', { memberId: newMember.id });
      } catch (auditError: any) {
        // Don't fail the entire operation if audit logging fails
        logger.warn('Failed to record audit log for member addition', 
          { memberId: newMember.id }, 
          auditError
        );
        console.warn('Audit logging failed:', auditError);
      }

      return newMember;

    } catch (err: any) {
      const handledError = errorHandler.handle(err, true);
      setError(handledError.userMessage);
      logger.error('Failed to add institution member', { institutionId }, err);
      throw handledError;
    } finally {
      setLoading(false);
    }
  }, [user?.id, institutionId]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!user?.id || !institutionId) {
      throw new Error('Missing required parameters');
    }

    try {
      setLoading(true);
      setError(null);

      logger.debug('Removing institution member', { memberId, institutionId });

      const { error: deleteError } = await supabase
        .from('institution_members')
        .delete()
        .eq('id', memberId)
        .eq('institution_id', institutionId);

      if (deleteError) {
        throw deleteError;
      }

      logger.info('Institution member removed successfully', { memberId, institutionId });

      // Log audit trail asynchronously (non-blocking)
      try {
        await auditLogger.logAdmin(
          'INSTITUTION_MEMBER_REMOVED' as any,
          'INSTITUTION_MEMBER' as any,
          memberId,
          { institution_id: institutionId }
        );
        logger.debug('Audit log recorded for member removal', { memberId });
      } catch (auditError: any) {
        // Don't fail the entire operation if audit logging fails
        logger.warn('Failed to record audit log for member removal', 
          { memberId }, 
          auditError
        );
        console.warn('Audit logging failed:', auditError);
      }

    } catch (err: any) {
      const handledError = errorHandler.handle(err, true);
      setError(handledError.userMessage);
      logger.error('Failed to remove institution member', { memberId, institutionId }, err);
      throw handledError;
    } finally {
      setLoading(false);
    }
  }, [user?.id, institutionId]);

  return {
    addMember,
    removeMember,
    loading,
    error
  };
};