'use client';
import { Card, CardContent } from '@repo/ui/components/card';
import { Button } from '@repo/ui/components/button';
import { X } from '@repo/ui/components/icons';
import { useCallback, useState } from 'react';
import { linkGuestToOAuth } from '@repo/backend/sdk/guests.js';
import { toast } from 'sonner';

export function GuestUserCard() {
  const [isHidden, setIsHidden] = useState(false);

  const handleDismiss = () => {
    setIsHidden(true);
  };

  const handleLinkAccount = useCallback(async () => {
    const { error } = await linkGuestToOAuth('google', window.location.href);
    if (error) toast.error("Couldn't link your account!");
  }, []);

  if (isHidden) return null;

  return (
    <div className="p-2">
      {/* Guest User Card */}
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
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground">
                  Want to keep your documents
                </h3>
              </div>
              <button
                type="button"
                className="bg-transparent border-0 outline-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss guest user card"
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
              You are logged in as a guest now. You will lose your documents if you log out!
            </p>
            <Button
              size="lg"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              onClick={handleLinkAccount}
            >
              Link your account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
