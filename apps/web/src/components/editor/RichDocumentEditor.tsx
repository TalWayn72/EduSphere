import React, { useState, useCallback } from 'react';
import { useMutation } from 'urql';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichEditor } from './RichEditor';
import { CREATE_CONTENT_ITEM_MUTATION } from '@/lib/graphql/content-tier3.queries';
import { PRESIGNED_UPLOAD_QUERY } from '@/lib/graphql/content.queries';
import { urqlClient } from '@/lib/urql-client';

interface RichDocumentEditorProps {
  moduleId: string;
  courseId: string;
  onSaved?: (contentItemId: string) => void;
}

interface CreateContentItemResult {
  createContentItem: { id: string; title: string };
}

interface CreateContentItemVariables {
  input: {
    moduleId: string;
    title: string;
    type: string;
    content: string;
    orderIndex: number;
  };
}

export function RichDocumentEditor({
  moduleId,
  courseId,
  onSaved,
}: RichDocumentEditorProps) {
  const [title, setTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');

  const [createResult, executeCreate] = useMutation<
    CreateContentItemResult,
    CreateContentItemVariables
  >(CREATE_CONTENT_ITEM_MUTATION);

  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      const presignResult = await urqlClient
        .query(PRESIGNED_UPLOAD_QUERY, {
          fileName: file.name,
          contentType: file.type,
          courseId,
        })
        .toPromise();

      if (presignResult.error || !presignResult.data?.getPresignedUploadUrl) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileKey } = presignResult.data
        .getPresignedUploadUrl as {
        uploadUrl: string;
        fileKey: string;
      };

      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResp.ok) {
        throw new Error(`Upload failed: ${uploadResp.statusText}`);
      }

      // Return a public URL using the fileKey (MinIO path)
      return `/media/${fileKey}`;
    },
    [courseId]
  );

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for this document.');
      return;
    }

    const { data, error } = await executeCreate({
      input: {
        moduleId,
        title: title.trim(),
        type: 'RICH_DOCUMENT',
        content: editorContent,
        orderIndex: 0,
      },
    });

    if (error) {
      const msg =
        error.graphQLErrors?.[0]?.message ??
        error.message ??
        'Failed to save document';
      toast.error(msg);
      return;
    }

    if (data?.createContentItem) {
      toast.success(`"${data.createContentItem.title}" saved successfully.`);
      onSaved?.(data.createContentItem.id);
    }
  }, [title, editorContent, moduleId, executeCreate, onSaved]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rich-doc-title">Document Title</Label>
        <Input
          id="rich-doc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter document title..."
          className="text-lg font-medium"
        />
      </div>

      <RichEditor
        content={editorContent}
        onChange={setEditorContent}
        onImageUpload={handleImageUpload}
      />

      <div className="flex justify-end">
        <Button
          onClick={() => {
            void handleSave();
          }}
          disabled={createResult.fetching || !title.trim()}
          className="gap-2"
        >
          {createResult.fetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Document
        </Button>
      </div>
    </div>
  );
}
