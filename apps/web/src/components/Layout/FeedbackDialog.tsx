'use client';

import * as React from 'react';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group';
import { Star } from '@repo/ui/components/icons';
import { submitFeedback } from '@repo/backend/sdk/feedback.js';
import { useSelector } from '@/store';
import { toast } from 'sonner';
import { cn } from '@repo/ui/lib/utils';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FeedbackType = 'Issue' | 'Feature' | 'General';

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const user = useSelector((state) => state.user);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [hoveredRating, setHoveredRating] = React.useState<number | null>(null);
  const [content, setContent] = React.useState('');
  const [feedbackType, setFeedbackType] = React.useState<FeedbackType>('General');

  const feedbackTypeDescriptions: Record<FeedbackType, string> = {
    General: 'Please share your general thoughts and feedback about Wordy.',
    Feature: "Please describe the feature you'd like to see in Wordy.",
    Issue: 'Please describe the issue you encountered and the steps to reproduce it.',
  };

  const handleFeedbackTypeChange = (value: string) => {
    const type = value as FeedbackType;
    setFeedbackType(type);
    // Auto-insert feedback type description into content
    const description = feedbackTypeDescriptions[type];
    setContent(description);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form
    setRating(0);
    setContent('');
    setHoveredRating(null);
    setFeedbackType('General');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      toast.error('You must be logged in to submit feedback');
      return;
    }

    if (!content.trim()) {
      toast.error('Please provide feedback content');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await submitFeedback({
        content: content.trim(),
        rating,
        feedback_type: feedbackType,
      });

      if (error) {
        throw error;
      }

      toast.success('Thank you for your feedback!');
      handleClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    const displayRating = hoveredRating !== null ? hoveredRating : rating;

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          className={cn(
            'p-1 rounded transition-colors hover:bg-muted',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          )}
          onMouseEnter={() => setHoveredRating(i)}
          onMouseLeave={() => setHoveredRating(null)}
          onClick={() => setRating(i)}
        >
          <Star
            className={cn(
              'size-6 transition-colors',
              i <= displayRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground',
            )}
          />
        </button>,
      );
    }

    return stars;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>We'd love your feedback!</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Feedback Type Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                What type of feedback are you providing?
              </Label>
              <RadioGroup value={feedbackType} onValueChange={handleFeedbackTypeChange}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="General" id="general" />
                  <Label htmlFor="general" className="cursor-pointer font-normal">
                    General Feedback
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Feature" id="feature" />
                  <Label htmlFor="feature" className="cursor-pointer font-normal">
                    Feature Request
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Issue" id="issue" />
                  <Label htmlFor="issue" className="cursor-pointer font-normal">
                    Issue
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Rating Section */}
            {feedbackType === 'General' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">How would you rate your experience?</Label>
                <div className="flex items-center gap-1">
                  {renderStars()}
                  <span className="ml-2 text-sm text-muted-foreground">{rating} out of 5</span>
                </div>
              </div>
            )}

            {/* Feedback Content */}
            <div className="space-y-3">
              <Label htmlFor="feedback-content" className="text-sm font-medium">
                Tell us more about your experience
              </Label>
              <Textarea
                id="feedback-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What did you like? What could be improved? Any suggestions?"
                className="min-h-[120px] resize-none"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
