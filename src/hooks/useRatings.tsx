import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

export interface Rating {
  id: string;
  rater_id: string;
  rated_user_id: string;
  trade_id?: string;
  rating_value: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export function useRatings(userId?: string) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const { user } = useAuth();

  const fetchRatings = async (targetUserId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('rated_user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRatings(data || []);

      // Check if current user has already rated this user
      if (user) {
        const existingRating = data?.find(rating => rating.rater_id === user.id);
        setUserRating(existingRating || null);
      }
    } catch (error) {
      logger.error('Error fetching ratings', {
        operation: 'fetch_ratings',
        metadata: { targetUserId }
      }, error as Error);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async (
    ratedUserId: string, 
    ratingValue: number, 
    comment?: string,
    tradeId?: string
  ) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const ratingData = {
        rater_id: user.id,
        rated_user_id: ratedUserId,
        rating_value: ratingValue,
        comment: comment || null,
        trade_id: tradeId || null,
      };

      let result;
      if (userRating) {
        // Update existing rating
        result = await supabase
          .from('ratings')
          .update(ratingData)
          .eq('id', userRating.id)
          .select()
          .single();
      } else {
        // Create new rating
        result = await supabase
          .from('ratings')
          .insert(ratingData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Refresh ratings
      if (userId) {
        await fetchRatings(userId);
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      logger.error('Error submitting rating', {
        operation: 'submit_rating',
        metadata: { ratedUserId, ratingValue, tradeId }
      }, error);
      return { 
        success: false, 
        error: error.message || 'Failed to submit rating' 
      };
    }
  };

  const deleteRating = async (ratingId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('ratings')
        .delete()
        .eq('id', ratingId)
        .eq('rater_id', user.id); // Ensure user can only delete their own ratings

      if (error) throw error;

      // Refresh ratings
      if (userId) {
        await fetchRatings(userId);
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Error deleting rating', {
        operation: 'delete_rating',
        metadata: { ratingId }
      }, error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete rating' 
      };
    }
  };

  useEffect(() => {
    if (userId) {
      fetchRatings(userId);
    }
  }, [userId, user]);

  const averageRating = ratings.length > 0 
    ? ratings.reduce((sum, rating) => sum + rating.rating_value, 0) / ratings.length
    : 0;

  const ratingCounts = ratings.reduce((counts, rating) => {
    counts[rating.rating_value] = (counts[rating.rating_value] || 0) + 1;
    return counts;
  }, {} as Record<number, number>);

  return {
    ratings,
    loading,
    userRating,
    averageRating,
    ratingCounts,
    totalRatings: ratings.length,
    submitRating,
    deleteRating,
    refetch: () => userId ? fetchRatings(userId) : Promise.resolve(),
  };
}