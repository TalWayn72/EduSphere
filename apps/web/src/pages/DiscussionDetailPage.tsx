/**
 * DiscussionDetailPage — Shows messages in a discussion thread with real-time updates.
 * Route: /discussions/:id
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useSubscription } from 'urql';
import { Layout } from '@/components/Layout';
import { ArrowLeft } from 'lucide-react';
import MessageItem from '@/components/social/MessageItem';
import MessageComposer from '@/components/social/MessageComposer';
import {
  DISCUSSION_MESSAGES_QUERY,
  MESSAGE_ADDED_SUBSCRIPTION,
} from '@/lib/graphql/discussion.queries';

interface DiscussionMessage {
  id: string;
  userId: string;
  content: string;
  messageType: string;
  parentMessageId?: string | null;
  likesCount: number;
  isLikedByMe: boolean;
  createdAt: string;
}

interface DiscussionMessagesData {
  discussionMessages: DiscussionMessage[];
}

export function DiscussionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  // Subscription pause state (memory safety: unsubscribe on unmount)
  const [subPaused, setSubPaused] = useState(false);
  useEffect(() => {
    return () => setSubPaused(true);
  }, []);

  const [{ data, fetching }] = useQuery<DiscussionMessagesData>({
    query: DISCUSSION_MESSAGES_QUERY,
    variables: { discussionId: id, limit: 50 },
    pause: !mounted || !id,
  });

  // Real-time subscription for new messages
  useSubscription({
    query: MESSAGE_ADDED_SUBSCRIPTION,
    variables: { discussionId: id },
    pause: !mounted || subPaused || !id,
  });

  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);

  const messages = data?.discussionMessages ?? [];

  const handleReply = (msgId: string, content: string) => {
    setReplyTo({ id: msgId, content });
  };

  const handleReplyClear = () => {
    setReplyTo(null);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-3xl space-y-6">
        {/* Back link */}
        <Link
          to="/discussions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Discussions
        </Link>

        {/* Messages list */}
        <div
          role="log"
          aria-live="polite"
          aria-label="Discussion messages"
          className="space-y-4"
        >
          {fetching && (
            <p className="text-muted-foreground text-sm">Loading messages...</p>
          )}

          {!fetching && messages.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">
              No messages yet. Be the first to say something!
            </p>
          )}

          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onReply={handleReply}
              indent={message.parentMessageId ? 1 : 0}
            />
          ))}
        </div>

        {/* Composer */}
        {id && (
          <MessageComposer
            discussionId={id}
            replyToId={replyTo?.id ?? null}
            replyToContent={replyTo?.content ?? null}
            onReplyCleared={handleReplyClear}
          />
        )}
      </div>
    </Layout>
  );
}
