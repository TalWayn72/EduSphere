/**
 * Collaboration — shared types and helper functions.
 */

export interface BackendDiscussion {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  creatorId: string;
  discussionType: 'FORUM' | 'CHAVRUTA' | 'DEBATE';
  participantCount: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type MatchState = 'idle' | 'searching' | 'found';

export function toSessionUrl(title: string, id: string): string {
  const params = new URLSearchParams({ partner: title, discussionId: id });
  return `/collaboration/session?${params.toString()}`;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
