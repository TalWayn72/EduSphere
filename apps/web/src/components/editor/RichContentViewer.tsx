import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Mathematics from '@tiptap/extension-mathematics';
import { createLowlight } from 'lowlight';
import './editor.css';
import 'katex/dist/katex.min.css';

const lowlight = createLowlight();

export interface RichContentViewerProps {
  content: string;
}

export function RichContentViewer({ content }: RichContentViewerProps) {
  const parsedContent = React.useMemo(() => {
    if (!content) return { type: 'doc', content: [] };
    try {
      return JSON.parse(content) as object;
    } catch {
      return { type: 'doc', content: [] };
    }
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Mathematics,
    ],
    content: parsedContent,
    editable: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        role: 'document',
        'aria-label': 'Rich document content',
        'aria-readonly': 'true',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rich-content-viewer bg-background rounded-lg">
      <EditorContent editor={editor} />
    </div>
  );
}
