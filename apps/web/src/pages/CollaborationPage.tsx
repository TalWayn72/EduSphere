import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  BookOpen,
  Bot,
  Clock,
  Loader2,
  CheckCircle,
} from 'lucide-react';

const ACTIVE_SESSIONS = [
  {
    id: 's1',
    partner: 'Sarah M.',
    content: 'Introduction to Talmud Study',
    duration: '14 min',
    topic: 'Kal vachomer',
    status: 'active',
  },
  {
    id: 's2',
    partner: 'David K.',
    content: 'Maimonidean Philosophy',
    duration: '32 min',
    topic: 'Free will debate',
    status: 'active',
  },
];

const RECENT_SESSIONS = [
  {
    id: 'r1',
    partner: 'Michael L.',
    content: 'Knowledge Graph Navigation',
    duration: '45 min',
    topic: 'Contradiction analysis',
    date: '2 hours ago',
  },
  {
    id: 'r2',
    partner: 'Rachel T.',
    content: 'Ethics in Jewish Thought',
    duration: '28 min',
    topic: 'Moral imperatives',
    date: 'Yesterday',
  },
  {
    id: 'r3',
    partner: 'AI Chavruta',
    content: 'Introduction to Talmud Study',
    duration: '20 min',
    topic: 'Pilpul method',
    date: '2 days ago',
  },
];

type MatchState = 'idle' | 'searching' | 'found';

export function CollaborationPage() {
  const navigate = useNavigate();
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [matchMode, setMatchMode] = useState<'human' | 'ai'>('human');

  const handleStartMatching = (mode: 'human' | 'ai') => {
    setMatchMode(mode);
    setMatchState('searching');
    if (mode === 'ai') {
      setTimeout(() => {
        setMatchState('found');
        setTimeout(() => navigate('/learn/content-1'), 1500);
      }, 1000);
    } else {
      setTimeout(() => setMatchState('found'), 3000);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Collaboration</h1>
          <p className="text-sm text-muted-foreground">
            Study with partners in real-time Chavruta sessions
          </p>
        </div>

        {/* Match panel */}
        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Human Chavruta */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Human Chavruta</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get matched with another student studying the same content.
                  Debate, question, and learn together in real-time.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>12 students currently available</span>
                </div>
                {matchState === 'idle' || matchMode !== 'human' ? (
                  <Button
                    className="w-full"
                    onClick={() => handleStartMatching('human')}
                  >
                    Find a Chavruta Partner
                  </Button>
                ) : matchState === 'searching' ? (
                  <Button className="w-full" variant="outline" disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching for partner...
                  </Button>
                ) : (
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Partner found! Join session →
                  </Button>
                )}
              </div>

              {/* AI Chavruta */}
              <div className="space-y-3 border-l pl-6">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">AI Chavruta</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Practice with an AI partner available 24/7. The AI uses
                  contradiction detection to challenge your thinking.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span>Always available · Instant match</span>
                </div>
                {matchState === 'idle' || matchMode !== 'ai' ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleStartMatching('ai')}
                  >
                    Start AI Chavruta
                  </Button>
                ) : matchState === 'searching' ? (
                  <Button className="w-full" variant="outline" disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting to AI agent...
                  </Button>
                ) : (
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Opening session...
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active sessions */}
        {ACTIVE_SESSIONS.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Active Sessions
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {ACTIVE_SESSIONS.map((session) => (
                <Card
                  key={session.id}
                  className="border-green-200 bg-green-50/50"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-sm font-semibold">
                            {session.partner}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          {session.content}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {session.duration} · {session.topic}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-green-600 hover:bg-green-700"
                      >
                        Rejoin
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent sessions */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Recent Sessions
          </h2>
          <div className="space-y-2">
            {RECENT_SESSIONS.map((session) => (
              <Card
                key={session.id}
                className="hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <CardContent className="p-3 flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm">
                    {session.partner === 'AI Chavruta' ? '🤖' : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.partner}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session.content} · {session.topic}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {session.date}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.duration}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
