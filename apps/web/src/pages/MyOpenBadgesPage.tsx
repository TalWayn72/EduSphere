import { useQuery } from 'urql';
import { Trophy } from 'lucide-react';
import { Layout } from '@/components/Layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Download } from 'lucide-react';
import { MY_OPEN_BADGES_QUERY } from '@/lib/graphql/badges.queries';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface OpenBadgeAssertion {
  id: string;
  badgeDefinitionId: string;
  badgeName: string;
  badgeDescription: string;
  imageUrl: string | null;
  recipientId: string;
  issuedAt: string;
  expiresAt: string | null;
  evidenceUrl: string | null;
  revoked: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  verifyUrl: string;
  shareUrl: string;
  vcDocument: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function downloadVC(id: string, vcDocument: string): void {
  const blob = new Blob([vcDocument], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `badge-${id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function BadgeSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-3 w-1/3 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

// ── Badge Card ────────────────────────────────────────────────────────────────
function BadgeCard({ assertion }: { assertion: OpenBadgeAssertion }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {assertion.imageUrl ? (
            <img
              src={assertion.imageUrl}
              alt={assertion.badgeName}
              className="h-12 w-12 rounded-lg object-cover shrink-0 border"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Award className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base leading-tight">
                {assertion.badgeName}
              </CardTitle>
              {assertion.revoked ? (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                  Revoked
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                  Valid
                </span>
              )}
            </div>
            <CardDescription className="mt-1 line-clamp-2">
              {assertion.badgeDescription}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Issued: {formatDate(assertion.issuedAt)}</p>
            {assertion.revokedAt && assertion.revokedReason && (
              <p className="text-destructive">
                Revoked: {formatDate(assertion.revokedAt)} —{' '}
                {assertion.revokedReason}
              </p>
            )}
          </div>
          {assertion.vcDocument && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => downloadVC(assertion.id, assertion.vcDocument!)}
            >
              <Download className="h-3.5 w-3.5" />
              Download VC
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function MyOpenBadgesPage() {
  const [result] = useQuery({ query: MY_OPEN_BADGES_QUERY });
  const { data, fetching, error } = result;
  const badges: OpenBadgeAssertion[] =
    (data as { myOpenBadges?: OpenBadgeAssertion[] } | undefined)
      ?.myOpenBadges ?? [];

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">My Open Badges</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your earned Open Badges 3.0 credentials with verifiable VC
            documents.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load badges: {error.message}
          </div>
        )}

        {fetching && (
          <div className="grid gap-4">
            <BadgeSkeleton />
            <BadgeSkeleton />
            <BadgeSkeleton />
          </div>
        )}

        {!fetching && !error && badges.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">
              You haven&apos;t earned any Open Badges yet
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Complete courses and activities to earn your first badge.
            </p>
          </div>
        )}

        {!fetching && badges.length > 0 && (
          <div className="grid gap-4">
            {badges.map((assertion) => (
              <BadgeCard key={assertion.id} assertion={assertion} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
