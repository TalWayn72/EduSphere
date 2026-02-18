import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Wifi,
  WifiOff,
  Users,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CollaborativeEditor, type PresenceUser } from '@/components/CollaborativeEditor';
import { getCurrentUser } from '@/lib/auth';

// Mock collaborators — real impl uses Yjs + Hocuspocus
const MOCK_PRESENCE: PresenceUser[] = [
  { id: 'u2', name: 'Sarah M.', color: '#6366f1', initials: 'SM', isTyping: true },
  { id: 'u3', name: 'David K.', color: '#ec4899', initials: 'DK', isTyping: false },
];

// Sample initial content for the shared document
const SAMPLE_CONTENT = `<h1>Study Session Notes</h1>
<p>Welcome to your collaborative study session. Write your notes, questions, and insights here.</p>
<h2>Key Topics</h2>
<ul><li>Add your first topic...</li></ul>`;

export function CollaborationSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const partnerName = searchParams.get('partner') ?? 'Partner';
  const topic = searchParams.get('topic') ?? '';

  const user = getCurrentUser();
  const [docTitle, setDocTitle] = useState(
    topic ? `Chavruta: ${topic}` : 'Shared Study Notes'
  );
  const [saved, setSaved] = useState(false);
  const [isOnline] = useState(true);

  // Include self in presence list
  const selfUser: PresenceUser = {
    id: user?.id ?? 'self',
    name: `${user?.firstName ?? 'You'} (You)`,
    color: '#10b981',
    initials: `${user?.firstName?.[0] ?? 'Y'}${user?.lastName?.[0] ?? ''}`.toUpperCase(),
    isTyping: false,
  };

  const presence: PresenceUser[] = [selfUser, ...MOCK_PRESENCE];

  const handleSave = () => {
    // In production: document auto-saves via Yjs CRDT
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/collaboration')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sessions
          </Button>

          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs">
            {isOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-600">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-destructive" />
                <span className="text-destructive">Offline — changes buffered</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>

        {/* Session info bar */}
        <div className="flex items-center gap-3 py-2 px-3 bg-muted/50 rounded-lg text-sm">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Chavruta with</span>
          <span className="font-semibold">{partnerName}</span>
          {topic && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{topic}</span>
            </>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {presence.length} participants
            </span>
          </div>
        </div>

        {/* Document title */}
        <Input
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          className="text-xl font-bold border-0 border-b rounded-none px-0 h-auto py-1 focus-visible:ring-0 focus-visible:border-primary"
          placeholder="Document title..."
        />

        {/* Collaborative editor */}
        <CollaborativeEditor
          initialContent={SAMPLE_CONTENT}
          presence={presence}
          placeholder="Start writing your study notes, questions, or insights..."
        />

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center">
          Changes sync in real-time via Yjs CRDT when the collaboration server is running.
          Offline changes are buffered and synced on reconnect.
        </p>
      </div>
    </Layout>
  );
}
