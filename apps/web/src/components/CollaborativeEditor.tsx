import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Mention from '@tiptap/extension-mention';
import Mathematics from '@tiptap/extension-mathematics';
import { createLowlight } from 'lowlight';
const lowlight = createLowlight();
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { getToken, getCurrentUser } from '@/lib/auth';
import { CollaborativeEditorToolbar } from './CollaborativeEditorToolbar';
import 'katex/dist/katex.min.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  initials: string;
  isTyping?: boolean;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// ─── Random user color ────────────────────────────────────────────────────────

const USER_COLORS = [
  '#10b981',
  '#6366f1',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length] ?? '#6366f1';
}

// ─── Mention suggestion items ─────────────────────────────────────────────────
// Returns an empty list for now; real user lookup can be wired in later.
const mentionSuggestionItems = ({ query }: { query: string }) =>
  ([] as string[])
    .filter((item) => item.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

// ─── Component ────────────────────────────────────────────────────────────────

interface CollaborativeEditorProps {
  documentId?: string;
  initialContent?: string;
  presence?: PresenceUser[];
  placeholder?: string;
}

export function CollaborativeEditor({
  documentId,
  initialContent = '<p></p>',
  presence: externalPresence = [],
  placeholder = 'Start writing your study notes...',
}: CollaborativeEditorProps) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const providerRef = useRef<HocuspocusProvider | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [liveUsers, setLiveUsers] = useState<PresenceUser[]>([]);

  // ── UndoManager ─────────────────────────────────────────────────────────────
  const undoManager = useMemo(
    () => new Y.UndoManager(ydocRef.current.getXmlFragment('default')),
    []
  );

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const update = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };
    undoManager.on('stack-item-added', update);
    undoManager.on('stack-item-popped', update);
    return () => {
      undoManager.off('stack-item-added', update);
      undoManager.off('stack-item-popped', update);
    };
  }, [undoManager]);

  const handleUndo = useCallback(() => {
    undoManager.undo();
  }, [undoManager]);
  const handleRedo = useCallback(() => {
    undoManager.redo();
  }, [undoManager]);

  const hocuspocusUrl =
    import.meta.env.VITE_HOCUSPOCUS_URL ?? 'ws://localhost:1234';

  // ── Provider setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!documentId) return;

    const token = getToken();
    const ydoc = ydocRef.current;

    setStatus('connecting');

    const provider = new HocuspocusProvider({
      url: hocuspocusUrl,
      name: `discussion:${documentId}`,
      document: ydoc,
      token: token ?? undefined,

      onOpen() {
        setStatus('connecting');
      },
      onConnect() {
        setStatus('connected');
      },
      onClose() {
        setStatus('disconnected');
      },
      onDisconnect() {
        setStatus('disconnected');
      },
    });

    const currentUser = getCurrentUser();
    if (currentUser && provider.awareness) {
      const color = getUserColor(currentUser.id);
      provider.awareness.setLocalStateField('user', {
        id: currentUser.id,
        name:
          `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() ||
          currentUser.username,
        color,
        initials:
          `${currentUser.firstName?.[0] ?? ''}${currentUser.lastName?.[0] ?? ''}`.toUpperCase() ||
          'U',
      });
    }

    const updatePresence = () => {
      if (!provider.awareness) return;
      const states = Array.from(
        provider.awareness.getStates().values()
      ) as Array<{ user?: PresenceUser }>;
      setLiveUsers(
        states.filter((s) => s.user?.id).map((s) => s.user as PresenceUser)
      );
    };

    provider.awareness?.on('change', updatePresence);
    providerRef.current = provider;

    return () => {
      provider.awareness?.off('change', updatePresence);
      provider.destroy();
      providerRef.current = null;
      setStatus('disconnected');
    };
  }, [documentId, hocuspocusUrl]);

  // ── TipTap extensions ───────────────────────────────────────────────────────
  const richExtensions = useMemo(
    () => [
      CodeBlockLowlight.configure({ lowlight }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Mathematics,
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: { items: mentionSuggestionItems },
      }),
    ],
    []
  );

  const extensions = useMemo(() => {
    const base = [Placeholder.configure({ placeholder }), ...richExtensions];

    if (documentId && providerRef.current) {
      const currentUser = getCurrentUser();
      return [
        ...base,
        StarterKit.configure({ history: false } as object),
        Collaboration.configure({ document: ydocRef.current }),
        CollaborationCursor.configure({
          provider: providerRef.current,
          user: currentUser
            ? {
                name:
                  `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() ||
                  currentUser.username,
                color: getUserColor(currentUser.id),
              }
            : { name: 'Anonymous', color: '#6366f1' },
        }),
      ];
    }

    return [...base, StarterKit];
  }, [documentId, placeholder, richExtensions]);

  const editor = useEditor({
    extensions,
    content: documentId ? undefined : initialContent,
    editorProps: {
      attributes: {
        class: 'min-h-[400px] p-4 focus:outline-none text-sm leading-relaxed',
      },
    },
  });

  if (!editor) return null;

  const displayUsers: PresenceUser[] =
    status === 'connected' && liveUsers.length > 0
      ? liveUsers
      : externalPresence;

  return (
    <div className="border rounded-lg overflow-hidden">
      <CollaborativeEditorToolbar
        editor={editor}
        status={status}
        documentId={documentId}
        displayUsers={displayUsers}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <EditorContent
        editor={editor}
        className={[
          '[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-3',
          '[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-2',
          '[&_.ProseMirror_p]:mb-2',
          '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5',
          '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5',
          '[&_.ProseMirror_ul[data-type=taskList]]:list-none [&_.ProseMirror_ul[data-type=taskList]]:pl-0',
          '[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-muted-foreground/30 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic',
          '[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-xs',
          '[&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:my-2 [&_.ProseMirror_pre]:overflow-x-auto',
          '[&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:my-2',
          '[&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2',
          '[&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-muted [&_.ProseMirror_th]:font-semibold',
          '[&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_.is-editor-empty:first-child::before]:h-0',
          '[&_.collaboration-cursor__caret]:border-l-2 [&_.collaboration-cursor__caret]:border-solid',
          '[&_.collaboration-cursor__label]:text-[10px] [&_.collaboration-cursor__label]:px-1 [&_.collaboration-cursor__label]:rounded [&_.collaboration-cursor__label]:text-white',
        ].join(' ')}
      />
    </div>
  );
}
