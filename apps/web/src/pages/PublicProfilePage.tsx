import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'urql';
import { Flame, BookOpen, Award, Brain, Clock, Copy, Check, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FollowButton } from '@/components/FollowButton';
import { FollowersList } from '@/components/FollowersList';
import { PUBLIC_PROFILE_QUERY } from '@/lib/graphql/profile.queries';

interface PublicCourse {
  id: string;
  title: string;
  completedAt: string;
}

interface PublicProfileData {
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  currentStreak: number;
  longestStreak: number;
  completedCoursesCount: number;
  completedCourses: PublicCourse[];
  badgesCount: number;
  conceptsMastered: number;
  totalLearningMinutes: number;
  followersCount?: number;
  followingCount?: number;
  isFollowedByMe?: boolean;
}

interface PublicProfileResult {
  publicProfile: PublicProfileData | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2) || 'U';
}

function useCopyLink(userId: string) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = React.useCallback(() => {
    const url = `${window.location.origin}/u/${userId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [userId]);
  return { copied, copy };
}

type FollowListType = 'followers' | 'following' | null;

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { copied, copy } = useCopyLink(userId ?? '');
  const [followListOpen, setFollowListOpen] = React.useState<FollowListType>(null);

  const [{ data, fetching, error }] = useQuery<PublicProfileResult>({
    query: PUBLIC_PROFILE_QUERY,
    variables: { userId: userId ?? '' },
    pause: !userId,
    context: React.useMemo(() => ({ fetchOptions: {} }), []),
  });

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data?.publicProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
        <Lock className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Profile Not Available</h1>
        <p className="text-muted-foreground max-w-sm">
          This profile is private or does not exist.
        </p>
        <Button asChild variant="outline">
          <Link to="/courses">Browse Courses</Link>
        </Button>
      </div>
    );
  }

  const profile = data.publicProfile;
  const followersCount = profile.followersCount ?? 0;
  const followingCount = profile.followingCount ?? 0;

  const stats = [
    { icon: Flame, label: 'Current Streak', value: `${profile.currentStreak}d` },
    { icon: BookOpen, label: 'Courses Completed', value: String(profile.completedCoursesCount) },
    { icon: Award, label: 'Badges Earned', value: String(profile.badgesCount) },
    { icon: Brain, label: 'Concepts Mastered', value: String(profile.conceptsMastered) },
    { icon: Clock, label: 'Learning Minutes', value: String(profile.totalLearningMinutes) },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {/* Hero card */}
      <Card className="p-6 flex items-center gap-6">
        <Avatar className="h-20 w-20">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName} className="rounded-full object-cover" />
          ) : (
            <AvatarFallback className="text-2xl">{getInitials(profile.displayName)}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
          <p className="text-xs text-muted-foreground">Member since {formatDate(profile.joinedAt)}</p>
          {/* Follower / following counts */}
          <div className="flex gap-3 pt-1 text-xs">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setFollowListOpen('followers')}
            >
              <span className="font-semibold text-foreground">{followersCount}</span> followers
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setFollowListOpen('following')}
            >
              <span className="font-semibold text-foreground">{followingCount}</span> following
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {userId && (
            <FollowButton
              userId={userId}
              initialIsFollowing={profile.isFollowedByMe ?? false}
              followersCount={followersCount}
            />
          )}
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? 'Copied!' : 'Share'}
          </Button>
        </div>
      </Card>

      {/* Stats row */}
      <Card className="p-6">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center space-y-1">
              <div className="flex justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Completed courses */}
      {profile.completedCourses.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Completed Courses
          </h2>
          <ul className="space-y-2">
            {profile.completedCourses.slice(0, 10).map((course) => (
              <li key={course.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{course.title}</span>
                <span className="text-xs text-muted-foreground">{formatDate(course.completedAt)}</span>
              </li>
            ))}
          </ul>
          {profile.completedCoursesCount > 10 && (
            <p className="text-xs text-muted-foreground">
              +{profile.completedCoursesCount - 10} more courses
            </p>
          )}
        </Card>
      )}

      {/* Followers / Following dialog */}
      {userId && followListOpen && (
        <FollowersList
          userId={userId}
          type={followListOpen}
          isOpen={true}
          onClose={() => setFollowListOpen(null)}
        />
      )}
    </div>
  );
}
