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

  console.log('🔍 useInstitution hook called', { 
    user: user ? { id: user.id } : null,
    currentInstitution: institution,
    loading,
    error 
  });

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
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      console.log('Profile data:', profile);

      if (!profile?.institution_id) {
        console.log('No institution_id found in profile');
        setInstitution(null);
        return;
      }

      console.log('Found institution_id:', profile.institution_id);

      // Step 1: Fetch institution basic data
      const { data: institutionData, error: institutionError } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', profile.institution_id)
        .single();

      if (institutionError) {
        console.error('Institution fetch error:', institutionError);
        throw institutionError;
      }

      console.log('Institution data:', institutionData);

      // Step 2: Fetch members with profiles manually (with fallback for RLS issues)
      let membersData = null;
      let membersError = null;
      
      try {
        const result = await supabase
          .from('institution_members')
          .select(`
            id,
            institution_id,
            user_id,
            role,
            job_title,
            joined_at,
            added_by
          `)
          .eq('institution_id', profile.institution_id);
        
        membersData = result.data;
        membersError = result.error;
      } catch (err) {
        console.warn('⚠️ Members fetch failed (likely RLS issue), continuing without members:', err);
        membersError = err;
      }

      if (membersError) {
        console.error('⚠️ Members fetch error, proceeding with institution-only data:', membersError);
        // Don't throw - continue with institution data only
        membersData = null;
      }

      console.log('Members data (basic):', membersData);

      // Step 3: Fetch profile data for each member
      let membersWithProfiles = [];
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(member => member.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar, wallet_address')
          .in('id', userIds);

        if (profilesError) {
          console.error('Profiles fetch error:', profilesError);
          throw profilesError;
        }

        console.log('Profiles data:', profilesData);

        // Manually join the data
        membersWithProfiles = membersData.map(member => ({
          ...member,
          user_profile: profilesData?.find(profile => profile.id === member.user_id)
        }));
      }

      console.log('Members with profiles:', membersWithProfiles);

      // Log data access
      await monitorDataAccess(user.id, 'institution', profile.institution_id, 'read');

      // Check if user is admin - fallback to creator check if members unavailable
      const userMember = membersWithProfiles?.find(
        (member: any) => member.user_id === user.id
      );
      
      // If members data is unavailable due to RLS, check if user is the creator
      const isCreator = institutionData.created_by === user.id;
      const isAdmin = userMember?.role === 'admin' || isCreator;
      const isMember = !!userMember || isCreator;
      
      console.log('User role determination:', {
        userMember,
        isCreator,
        isAdmin,
        isMember,
        institutionCreatedBy: institutionData.created_by,
        currentUserId: user.id
      });

      const enrichedInstitution: InstitutionWithMembers = {
        ...institutionData,
        created_at: new Date(institutionData.created_at),
        updated_at: new Date(institutionData.updated_at),
        kyb_verified_at: institutionData.kyb_verified_at ? new Date(institutionData.kyb_verified_at) : undefined,
        kyb_status: institutionData.kyb_status as 'not_verified' | 'pending' | 'verified',
        members: (membersWithProfiles || []).map((member: any) => ({
          ...member,
          joined_at: new Date(member.joined_at),
          user_profile: member.user_profile
        })),
        member_count: membersWithProfiles?.length || 0,
        is_member: isMember,
        is_admin: isAdmin
      };

      console.log('✅ Final enriched institution:', enrichedInstitution);
      console.log('✅ Setting institution state to:', enrichedInstitution);
      setInstitution(enrichedInstitution);
      logger.info('Institution fetched successfully', { institutionId: institutionData.id });

    } catch (err: any) {
      console.error('Full institution fetch error:', err);
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

export const useInstitutionUpdate = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateInstitution = useCallback(async (institutionId: string, data: Partial<InstitutionCreationData>) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      logger.debug('Updating institution', { institutionId, userId: user.id });

      const { data: updatedInstitution, error: updateError } = await supabase
        .from('institutions')
        .update(data)
        .eq('id', institutionId)
        .eq('created_by', user.id) // Ensure only creator can update
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      logger.info('Institution updated successfully', { 
        institutionId, 
        userId: user.id 
      });

      // Log audit trail asynchronously (non-blocking)
      try {
        await auditLogger.logAdmin(
          'INSTITUTION_UPDATED' as any,
          'INSTITUTION' as any,
          institutionId,
          { changes: data }
        );
        logger.debug('Audit log recorded for institution update', { institutionId });
      } catch (auditError: any) {
        // Don't fail the entire operation if audit logging fails
        logger.warn('Failed to record audit log for institution update', 
          { institutionId }, 
          auditError
        );
        console.warn('Audit logging failed:', auditError);
      }

      return updatedInstitution;

    } catch (err: any) {
      const handledError = errorHandler.handle(err, true);
      setError(handledError.userMessage);
      logger.error('Failed to update institution', { institutionId, userId: user.id }, err);
      throw handledError;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    updateInstitution,
    loading,
    error
  };
};