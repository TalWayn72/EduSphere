import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { AnyExtension, Editor } from '@tiptap/core';
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
  extensions?: AnyExtension[];
  onSelectionUpdate?: (params: { editor: Editor }) => void;
}

/** Converts basic markdown to HTML so TipTap can render DB seed content. */
function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    const bq = line.match(/^> (.+)/);
    const ul = line.match(/^[-*] (.+)/);
    const ol = line.match(/^\d+\. (.+)/);

    if (h1)        { closeList(); out.push(`<h1>${inline(h1[1]!)}</h1>`); }
    else if (h2)   { closeList(); out.push(`<h2>${inline(h2[1]!)}</h2>`); }
    else if (h3)   { closeList(); out.push(`<h3>${inline(h3[1]!)}</h3>`); }
    else if (bq)   { closeList(); out.push(`<blockquote><p>${inline(bq[1]!)}</p></blockquote>`); }
    else if (line === '---' || line === '***') { closeList(); out.push('<hr/>'); }
    else if (ul)   {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${inline(ul[1]!)}</li>`);
    } else if (ol) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push(`<li>${inline(ol[1]!)}</li>`);
    } else if (line === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('');
}

export function RichContentViewer({
  content,
  extensions,
  onSelectionUpdate,
}: RichContentViewerProps) {
  const parsedContent = React.useMemo(() => {
    if (!content) return { type: 'doc', content: [] };
    try {
      return JSON.parse(content) as object;
    } catch {
      // content is markdown — convert to HTML for TipTap
      return markdownToHtml(content);
    }
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Mathematics,
      ...(extensions ?? []),
    ],
    content: parsedContent,
    editable: false,
    onSelectionUpdate,
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
