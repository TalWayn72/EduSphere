import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuthContext } from '@/providers/AuthProvider';
import { ImportSourceSelector } from '@/components/content-import/ImportSourceSelector';
import { FolderUploadZone } from '@/components/content-import/FolderUploadZone';
import { ImportProgressPanel } from '@/components/content-import/ImportProgressPanel';
import { useContentImport } from '@/hooks/useContentImport';

type ImportSource = 'youtube' | 'website' | 'folder' | null;

export function ContentImportPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [selectedSource, setSelectedSource] = useState<ImportSource>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const { importFromYoutube, importFromWebsite, importJob, isImporting, error } =
    useContentImport(courseId ?? '');

  // Role gate: only instructors and admins
  const allowedRoles = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'];
  if (user && !allowedRoles.includes(user.role)) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    if (selectedSource === 'youtube' && youtubeUrl) {
      await importFromYoutube(youtubeUrl);
    } else if (selectedSource === 'website' && websiteUrl) {
      await importFromWebsite(websiteUrl);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Import Content</h1>
        <p className="text-muted-foreground mb-8">
          Bulk-import lessons from YouTube playlists, websites, or local files.
        </p>

        {!importJob ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <ImportSourceSelector
              selected={selectedSource}
              onSelect={setSelectedSource}
            />

            {selectedSource === 'youtube' && (
              <div>
                <label htmlFor="youtube-url" className="block text-sm font-medium mb-1">
                  YouTube Playlist URL
                </label>
                <input
                  id="youtube-url"
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=..."
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>
            )}

            {selectedSource === 'website' && (
              <div>
                <label htmlFor="website-url" className="block text-sm font-medium mb-1">
                  Website / Blog URL
                </label>
                <input
                  id="website-url"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://your-course-site.com"
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>
            )}

            {selectedSource === 'folder' && (
              <FolderUploadZone courseId={courseId ?? ''} />
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {selectedSource && selectedSource !== 'folder' && (
              <button
                type="submit"
                disabled={isImporting}
                className="bg-primary text-primary-foreground px-6 py-2 rounded font-medium disabled:opacity-50"
              >
                {isImporting ? 'Importing…' : 'Start Import'}
              </button>
            )}
          </form>
        ) : (
          <ImportProgressPanel job={importJob} onDone={() => navigate(`/courses/${courseId}`)} />
        )}
      </div>
    </Layout>
  );
}
