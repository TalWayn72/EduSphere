import { useState } from 'react';
import {
  Annotation,
  AnnotationLayer,
  ANNOTATION_LAYER_CONFIGS,
} from '@/types/annotations';
import { Button } from '@/components/ui/button';
import { AnnotationForm } from './AnnotationForm';

interface AnnotationItemProps {
  annotation: Annotation;
  currentUserId: string;
  currentUserRole: 'student' | 'instructor' | 'ai';
  depth?: number;
  onReply: (parentId: string, content: string, layer: AnnotationLayer) => void;
  onEdit: (annotationId: string, content: string) => void;
  onDelete: (annotationId: string) => void;
}

export function AnnotationItem({
  annotation,
  currentUserId,
  currentUserRole,
  depth = 0,
  onReply,
  onEdit,
  onDelete,
}: AnnotationItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(annotation.content);

  const config = ANNOTATION_LAYER_CONFIGS[annotation.layer];
  const canEdit = config.canEdit(annotation, currentUserId);
  const canDelete = config.canDelete(annotation, currentUserId);
  const isOwn = annotation.userId === currentUserId;

  const handleReplySubmit = (content: string, layer: AnnotationLayer) => {
    onReply(annotation.id, content, layer);
    setIsReplying(false);
  };

  const handleEditSubmit = () => {
    if (editContent.trim() && editContent !== annotation.content) {
      onEdit(annotation.id, editContent);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(annotation.content);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`${depth > 0 ? 'ml-8 mt-2 border-l-2 border-gray-200 pl-4' : ''}`}
      data-annotation-id={annotation.id}
    >
      <div className="bg-white rounded-lg border p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${config.color}`}>
              {config.icon} {config.label}
            </span>
            <span className="text-sm font-semibold">
              {annotation.userName}
              {isOwn && <span className="text-gray-500 ml-1">(You)</span>}
            </span>
            {annotation.timestamp && (
              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                {annotation.timestamp}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {formatDate(annotation.createdAt)}
            </span>
          </div>

          {/* Actions */}
          {(canEdit || canDelete) && !isEditing && (
            <div className="flex gap-1">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-7 text-xs"
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(annotation.id)}
                  className="h-7 text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleEditCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEditSubmit}
                disabled={!editContent.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {annotation.content}
          </p>
        )}

        {/* Reply button */}
        {!isEditing && depth < 3 && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReplying(!isReplying)}
              className="h-7 text-xs"
            >
              {isReplying ? 'Cancel' : 'Reply'}
            </Button>
            {annotation.replies && annotation.replies.length > 0 && (
              <span className="text-xs text-gray-500 self-center">
                {annotation.replies.length}{' '}
                {annotation.replies.length === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        )}

        {/* Reply form */}
        {isReplying && (
          <AnnotationForm
            userRole={currentUserRole}
            parentId={annotation.id}
            onSubmit={handleReplySubmit}
            onCancel={() => setIsReplying(false)}
          />
        )}
      </div>

      {/* Nested replies */}
      {annotation.replies && annotation.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {annotation.replies.map((reply) => (
            <AnnotationItem
              key={reply.id}
              annotation={reply}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
