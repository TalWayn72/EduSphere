/**
 * OpenBadgeCard — displays a W3C OpenBadge 3.0 assertion with verify + LinkedIn share (F-025)
 */
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Award, CheckCircle } from 'lucide-react';

export interface OpenBadgeAssertionProps {
  readonly id: string;
  readonly badgeDefinitionId: string;
  readonly badgeName: string;
  readonly badgeDescription: string;
  readonly issuedAt: string;
  readonly expiresAt?: string | null;
  readonly evidenceUrl?: string | null;
  readonly revoked: boolean;
  readonly verifyUrl: string;
  readonly shareUrl: string;
}

interface OpenBadgeCardProps {
  readonly assertion: OpenBadgeAssertionProps;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function OpenBadgeCard({ assertion }: OpenBadgeCardProps): React.ReactElement {
  const expired = isExpired(assertion.expiresAt);
  const invalid = assertion.revoked || expired;

  function handleVerify(): void {
    window.open(assertion.verifyUrl, '_blank', 'noopener,noreferrer');
  }

  function handleShareLinkedIn(): void {
    window.open(assertion.shareUrl, '_blank', 'noopener,noreferrer');
  }

  function handleEvidence(): void {
    if (assertion.evidenceUrl) {
      window.open(assertion.evidenceUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <Card className={`relative ${invalid ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Award className="h-8 w-8 text-yellow-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight truncate">
              {assertion.badgeName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {assertion.badgeDescription}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2 items-center">
          {assertion.revoked ? (
            <Badge variant="destructive">Revoked</Badge>
          ) : expired ? (
            <Badge variant="outline" className="text-muted-foreground">Expired</Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" aria-hidden="true" />
              Valid
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            Issued {formatDate(assertion.issuedAt)}
          </span>
          {assertion.expiresAt && (
            <span className="text-xs text-muted-foreground">
              Expires {formatDate(assertion.expiresAt)}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2 flex-wrap pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleVerify}
          aria-label={`Verify badge: ${assertion.badgeName}`}
          className="gap-1"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          Verify
        </Button>

        {!invalid && (
          <Button
            size="sm"
            variant="default"
            onClick={handleShareLinkedIn}
            aria-label={`Share ${assertion.badgeName} to LinkedIn`}
            className="gap-1 bg-[#0A66C2] hover:bg-[#004182] text-white"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            Share to LinkedIn
          </Button>
        )}

        {assertion.evidenceUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEvidence}
            aria-label="View evidence"
          >
            Evidence
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
