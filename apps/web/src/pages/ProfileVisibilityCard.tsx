import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from 'urql';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UPDATE_PROFILE_VISIBILITY_MUTATION } from '@/lib/graphql/profile.queries';

interface UserPreferences {
  locale: string;
  theme: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  isPublicProfile?: boolean;
}

interface ProfileVisibilityCardProps {
  userId: string;
  preferences: UserPreferences | null;
}

interface VisibilityResult {
  updateProfileVisibility: UserPreferences;
}

export function ProfileVisibilityCard({ userId, preferences }: ProfileVisibilityCardProps) {
  const isPublic = preferences?.isPublicProfile ?? false;
  const [copied, setCopied] = React.useState(false);
  const [, executeMutation] = useMutation<VisibilityResult>(UPDATE_PROFILE_VISIBILITY_MUTATION);

  const toggle = React.useCallback(async () => {
    await executeMutation({ isPublic: !isPublic });
  }, [executeMutation, isPublic]);

  const copyLink = React.useCallback(() => {
    const url = `${window.location.origin}/u/${userId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    });
  }, [userId]);

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Public Profile
      </h3>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isPublic ? 'Your profile is public' : 'Your profile is private'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPublic
              ? 'Anyone with the link can view your learning activity.'
              : 'Only you can see your profile.'}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={isPublic}
          onClick={toggle}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary',
            isPublic ? 'bg-primary' : 'bg-input',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-5 w-5 rounded-full bg-background shadow ring-0',
              'transition-transform duration-200 ease-in-out',
              isPublic ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>

      {isPublic && (
        <div className="flex items-center gap-2 pt-1">
          <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
            <Link to={`/u/${userId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              View public profile
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={copyLink}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      )}
    </Card>
  );
}
