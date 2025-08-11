import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { notifications } from '@/lib/notifications';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDisplayName: string;
  userId: string;
  onSubmitRating: (rating: number, comment?: string) => Promise<{ success: boolean; error?: string }>;
  existingRating?: { rating_value: number; comment?: string };
}

export function RatingModal({
  isOpen,
  onClose,
  userDisplayName,
  userId,
  onSubmitRating,
  existingRating,
}: RatingModalProps) {
  const [rating, setRating] = useState(existingRating?.rating_value || 0);
  const [comment, setComment] = useState(existingRating?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      notifications.warning({
        title: 'Rating Required',
        description: 'Please select a star rating before submitting.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmitRating(rating, comment.trim() || undefined);
      
      if (result.success) {
        notifications.success({
          title: 'Rating Submitted',
          description: `Your rating for ${userDisplayName} has been ${existingRating ? 'updated' : 'submitted'}.`
        });
        onClose();
      } else {
        notifications.error({
          title: 'Error',
          description: result.error || 'Failed to submit rating.'
        });
      }
    } catch (error) {
      notifications.error({
        title: 'Error',
        description: 'An unexpected error occurred.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingRating ? 'Update Rating' : 'Rate Trader'}
          </DialogTitle>
          <DialogDescription>
            {existingRating 
              ? `Update your rating for ${userDisplayName}`
              : `How was your experience trading with ${userDisplayName}?`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Rating</Label>
            <div className="flex justify-center py-4">
              <StarRating
                rating={rating}
                interactive
                onRatingChange={setRating}
                size="lg"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {rating === 0 && 'Select a rating'}
              {rating === 1 && 'Poor experience'}
              {rating === 2 && 'Below average'}
              {rating === 3 && 'Average experience'}
              {rating === 4 && 'Good experience'}
              {rating === 5 && 'Excellent experience'}
            </p>
          </div>

          <div>
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share details about your trading experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              {comment.length}/500 characters
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}