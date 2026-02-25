/**
 * BadgeVerifierPage — public page to verify a W3C OpenBadge 3.0 credential (F-025)
 * Route: /verify/badge/:assertionId — no auth required
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Award, Loader2 } from 'lucide-react';
import { gqlClient } from '@/lib/graphql';
import { VERIFY_BADGE_QUERY } from '@/lib/graphql/badge.queries';

interface BadgeAssertionResult {
  readonly id: string;
  readonly badgeName: string;
  readonly badgeDescription: string;
  readonly recipientId: string;
  readonly issuedAt: string;
  readonly expiresAt?: string | null;
  readonly revoked: boolean;
  readonly verifyUrl: string;
}

interface VerifyBadgeResponse {
  readonly verifyBadge: {
    readonly valid: boolean;
    readonly error?: string | null;
    readonly assertion?: BadgeAssertionResult | null;
  };
}

function anonymizeRecipient(recipientId: string): string {
  if (recipientId.length <= 8) return '****';
  return recipientId.substring(0, 4) + '****' + recipientId.substring(recipientId.length - 4);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function BadgeVerifierPage(): React.ReactElement {
  const { assertionId } = useParams<{ assertionId: string }>();

  const { data, isLoading, isError } = useQuery<VerifyBadgeResponse>({
    queryKey: ['verifyBadge', assertionId],
    queryFn: async () =>
      gqlClient.request<VerifyBadgeResponse>(VERIFY_BADGE_QUERY, { assertionId }),
    enabled: Boolean(assertionId),
    staleTime: 30_000,
    retry: 1,
  });

  const result = data?.verifyBadge;
  const assertion = result?.assertion;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <Award className="h-12 w-12 text-yellow-500 mx-auto mb-2" aria-hidden="true" />
          <h1 className="text-2xl font-bold">Badge Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Powered by W3C OpenBadges 3.0 + Ed25519
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Verification Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Verifying credential...</span>
              </div>
            )}

            {isError && (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" aria-hidden="true" />
                <span>Unable to verify — network error</span>
              </div>
            )}

            {result && (
              <>
                <div className="flex items-center gap-2">
                  {result.valid ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-500" aria-hidden="true" />
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        Valid Credential
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
                      <Badge variant="destructive">
                        {result.error ?? 'Invalid Credential'}
                      </Badge>
                    </>
                  )}
                </div>

                {assertion && (
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-muted-foreground">Badge</dt>
                      <dd className="font-semibold">{assertion.badgeName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Description</dt>
                      <dd>{assertion.badgeDescription}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Recipient</dt>
                      <dd className="font-mono">{anonymizeRecipient(assertion.recipientId)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Issued</dt>
                      <dd>{formatDate(assertion.issuedAt)}</dd>
                    </div>
                    {assertion.expiresAt && (
                      <div>
                        <dt className="font-medium text-muted-foreground">Expires</dt>
                        <dd>{formatDate(assertion.expiresAt)}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="font-medium text-muted-foreground">Issuer</dt>
                      <dd>EduSphere Platform</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Proof Type</dt>
                      <dd className="font-mono text-xs">Ed25519Signature2020</dd>
                    </div>
                  </dl>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Credential ID: <span className="font-mono">{assertionId}</span>
        </p>
      </div>
    </div>
  );
}
