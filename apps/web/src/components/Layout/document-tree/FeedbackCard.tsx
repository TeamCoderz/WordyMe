'use client';

import * as React from 'react';
import { Card, CardContent } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { X } from '@repo/ui/components/icons';
import { alert } from '@/components/Layout/alert';
import { FeedbackDialog } from '../FeedbackDialog';
import { useLocalStorage } from '@repo/ui/hooks/use-local-storage';

export function FeedbackCard() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isHidden, setIsHidden] = useLocalStorage('feedback-card-hidden', false);

  const handleDismiss = () => {
    alert({
      title: 'Dismiss feedback card?',
      description: "This action cannot be undone. Once you dismiss it, you'll never see it again.",
      confirmText: 'Dismiss',
      cancelText: 'Cancel',
      onConfirm: () => {
        setIsHidden(true);
      },
      onCancel: () => {
        // Do nothing, just close the alert
      },
    });
  };

  if (isHidden) return null;

  return (
    <>
      <div className="p-2">
        {/* Feedback Card */}
        <Card
          className="bg-background border p-2 relative"
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDismiss();
          }}
        >
          <CardContent className="p-2">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-sm text-foreground">We need your feedback</h3>
                <button
                  type="button"
                  className="bg-transparent border-0 outline-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Dismiss feedback card"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDismiss();
                  }}
                >
                  <X className="size-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-[6px] mb-4 leading-relaxed">
                Feel free to give us your feedback and help us make Wordy the platform that you need
              </p>
              <Button
                size="lg"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setIsDialogOpen(true)}
              >
                Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <FeedbackDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
