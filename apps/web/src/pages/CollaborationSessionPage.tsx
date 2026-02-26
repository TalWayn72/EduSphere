import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useSubscription } from 'urql';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Users } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CollaborativeEditor } from '@/components/CollaborativeEditor';
import {
  DISCUSSION_QUERY,
  JOIN_DISCUSSION_MUTATION,
  MESSAGE_ADDED_SUBSCRIPTION,
} from '@/lib/graphql/collaboration.queries';

interface BackendMessage {
  id: string;
  discussionId: string;
  userId: string;
  content: string;
  messageType: string;
  parentMessageId: string | null;
  createdAt: string;
}

interface BackendDiscussion {
  id: string;
  title: string;
  participantCount: number;
  participants: { id: string; userId: string; joinedAt: string }[];
}

export function CollaborationSessionPage() {
  const { t } = useTranslation('collaboration');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const partnerName = searchParams.get('partner') ?? 'Partner';
  const topic = searchParams.get('topic') ?? '';
  const discussionId = searchParams.get('discussionId') ?? '';

  const [docTitle, setDocTitle] = useState(
    topic ? `${t('chavruta')}: ${topic}` : t('sharedStudyNotes')
  );
  const [saved, setSaved] = useState(false);

  // Fetch discussion + auto-join if we have a discussionId
  const [{ data: discussionData }] = useQuery({
    query: DISCUSSION_QUERY,
    variables: { id: discussionId },
    pause: !discussionId,
  });

  const [, executeJoin] = useMutation(JOIN_DISCUSSION_MUTATION);

  // Auto-join on mount when discussionId is present
  useEffect(() => {
    if (discussionId) {
      executeJoin({ discussionId });
    }
  }, [discussionId, executeJoin]);

  // Subscribe to new messages in real-time (GraphQL layer)
  const [{ data: subData }] = useSubscription({
    query: MESSAGE_ADDED_SUBSCRIPTION,
    variables: { discussionId },
    pause: !discussionId,
  });

  const discussion: BackendDiscussion | null =
    (discussionData as { discussion?: BackendDiscussion } | undefined)
      ?.discussion ?? null;

  const latestMessage: BackendMessage | null =
    (subData as { messageAdded?: BackendMessage } | undefined)?.messageAdded ??
    null;

  const participantCount = discussion?.participantCount ?? 1;

  // Show latest arriving message as a hint in the session info bar
  const infoNote = latestMessage
    ? t('newMessage', { userId: latestMessage.userId.slice(0, 8) })
    : partnerName !== 'Partner'
      ? t('studyingWith', { partner: partnerName })
      : null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const SAMPLE_CONTENT = `<h1>${docTitle}</h1>
<p>${t('sampleWelcome')}</p>
<h2>${t('sampleKeyTopics')}</h2>
<ul><li>${t('sampleFirstTopic')}</li></ul>`;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/collaboration')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('sessions')}
          </Button>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {saved ? t('saved') : t('save')}
          </Button>
        </div>

        {/* Session info bar */}
        <div className="flex items-center gap-3 py-2 px-3 bg-muted/50 rounded-lg text-sm">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">{t('chavrutaWith')}</span>
          <span className="font-semibold">
            {discussion?.title ?? partnerName}
          </span>
          {topic && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{topic}</span>
            </>
          )}
          {infoNote && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-blue-600 font-medium">
                {infoNote}
              </span>
            </>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {t('participants', { count: participantCount })}
            </span>
          </div>
        </div>

        {/* Document title */}
        <Input
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          className="text-xl font-bold border-0 border-b rounded-none px-0 h-auto py-1 focus-visible:ring-0 focus-visible:border-primary"
          placeholder={t('documentTitlePlaceholder')}
        />

        {/* Collaborative editor — documentId wires Yjs/Hocuspocus CRDT */}
        <CollaborativeEditor
          documentId={discussionId || undefined}
          initialContent={discussionId ? undefined : SAMPLE_CONTENT}
          placeholder={t('editorPlaceholder')}
        />

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center">
          {discussionId
            ? t('crdtSyncActive', { key: discussionId.slice(0, 8) })
            : t('crdtSyncInactive')}
        </p>
      </div>
    </Layout>
  );
}
