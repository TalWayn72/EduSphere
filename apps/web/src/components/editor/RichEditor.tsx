import React, { useCallback, useRef } from 'react';
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
import { EditorToolbar } from './EditorToolbar';
import './editor.css';
import 'katex/dist/katex.min.css';

const lowlight = createLowlight();

export interface RichEditorProps {
  content: string;
  onChange: (json: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  readOnly?: boolean;
  placeholder?: string;
}

export function RichEditor({
  content,
  onChange,
  onImageUpload,
  readOnly = false,
  placeholder = 'Start writing...',
}: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedContent = React.useMemo(() => {
    if (!content) return { type: 'doc', content: [{ type: 'paragraph' }] };
    try {
      return JSON.parse(content) as object;
    } catch {
      return { type: 'doc', content: [{ type: 'paragraph' }] };
    }
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Mathematics,
    ],
    content: parsedContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        'data-placeholder': placeholder,
        role: readOnly ? 'document' : 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Rich text editor',
        'aria-readonly': String(readOnly),
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(JSON.stringify(e.getJSON()));
    },
  });

  const handleImageUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor || !onImageUpload) return;
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } finally {
        e.target.value = '';
      }
    },
    [editor, onImageUpload],
  );

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {!readOnly && (
        <EditorToolbar
          editor={editor}
          onImageUpload={onImageUpload ? handleImageUploadClick : undefined}
          hasMath
        />
      )}
      <EditorContent editor={editor} />
      {onImageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => { void handleFileChange(e); }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
