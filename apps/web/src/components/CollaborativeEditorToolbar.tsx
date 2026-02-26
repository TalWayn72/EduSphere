import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  CheckSquare,
  Table,
  Sigma,
  Undo2,
  Redo2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { PresenceUser } from './CollaborativeEditor';

// ─── ToolbarButton ─────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function ToolbarButton({
  active = false,
  onClick,
  title,
  children,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      className="h-7 w-7 p-0"
      onClick={onClick}
      title={title}
      disabled={disabled}
      type="button"
    >
      {children}
    </Button>
  );
}

// ─── Toolbar ───────────────────────────────────────────────────────────────

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface CollaborativeEditorToolbarProps {
  editor: Editor;
  status: ConnectionStatus;
  documentId?: string;
  displayUsers: PresenceUser[];
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function CollaborativeEditorToolbar({
  editor,
  status,
  documentId,
  displayUsers,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CollaborativeEditorToolbarProps) {
  const insertTable = () =>
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();

  const toggleMath = () => editor.chain().focus().insertContent('$...$').run();

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/40 flex-wrap">
      {/* History */}
      <ToolbarButton onClick={onUndo} title="Undo (Ctrl+Z)" disabled={!canUndo}>
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={onRedo} title="Redo (Ctrl+Y)" disabled={!canRedo}>
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Inline formatting */}
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Headings */}
      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Lists */}
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task list (checklist)"
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Rich blocks */}
      <ToolbarButton
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code block"
      >
        <Code2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('table')}
        onClick={insertTable}
        title="Insert table (3×3)"
      >
        <Table className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        onClick={toggleMath}
        title="Insert math (LaTeX)"
      >
        <Sigma className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Connection status badge */}
      {documentId && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs">
          {status === 'connected' ? (
            <>
              <Wifi className="h-3 w-3 text-green-500" />
              <span className="text-green-600">Live</span>
            </>
          ) : status === 'connecting' ? (
            <>
              <Wifi className="h-3 w-3 text-yellow-500 animate-pulse" />
              <span className="text-yellow-600">Connecting</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-destructive" />
              <span className="text-destructive">Offline</span>
            </>
          )}
        </div>
      )}

      {/* Presence avatars */}
      {displayUsers.length > 0 && (
        <>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {displayUsers.map((u) => (
              <div key={u.id} className="relative" title={u.name}>
                <Avatar className="h-6 w-6">
                  <AvatarFallback
                    className="text-[10px] font-semibold"
                    style={{ backgroundColor: u.color, color: '#fff' }}
                  >
                    {u.initials}
                  </AvatarFallback>
                </Avatar>
                {u.isTyping && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />
                )}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {displayUsers.length} online
            </span>
          </div>
        </>
      )}
    </div>
  );
}
