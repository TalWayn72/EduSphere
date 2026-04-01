import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { SocialShareMenu } from './SocialShareMenu';

interface BadgeInfo {
  name: string;
  description: string;
  imageUrl?: string;
  shareUrl: string;
  issuerName: string;
}

interface ShareBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge: BadgeInfo;
}

export function ShareBadgeDialog({
  open,
  onOpenChange,
  badge,
}: ShareBadgeDialogProps) {
  const vcJsonUrl = `${badge.shareUrl}.json`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Badge</DialogTitle>
          <DialogDescription>
            Share your achievement with your network
          </DialogDescription>
        </DialogHeader>

        {/* Badge Preview Card */}
        <div
          className="rounded-lg border p-4 space-y-3"
          data-testid="badge-preview"
        >
          {badge.imageUrl && (
            <img
              src={badge.imageUrl}
              alt={badge.name}
              className="h-16 w-16 rounded-md object-cover"
            />
          )}
          <h3 className="font-semibold text-lg">{badge.name}</h3>
          <p className="text-sm text-muted-foreground">{badge.description}</p>
          <p className="text-xs text-muted-foreground">
            Issued by <span className="font-medium">{badge.issuerName}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <SocialShareMenu
            url={badge.shareUrl}
            title={`I earned the ${badge.name} badge!`}
          />
          <Button variant="outline" asChild>
            <a href={vcJsonUrl} download aria-label="Download Credential">
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Download Credential
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
