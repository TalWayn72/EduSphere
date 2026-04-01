import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuthRole } from '@/hooks/useAuthRole';
import { ImportSourceSelector } from '@/components/content-import/ImportSourceSelector';
import { FolderUploadZone } from '@/components/content-import/FolderUploadZone';
import { DriveImportCard } from '@/components/content-import/DriveImportCard';
import { ImportProgressPanel } from '@/components/content-import/ImportProgressPanel';
import { useContentImport } from '@/hooks/useContentImport';
import { PageShell } from '@/components/PageShell';
import { ProgressStatus } from '@/components/ProgressStatus';
import { CONTENT_IMPORT_MESSAGES } from '@/lib/progress-messages';

type ImportSource = 'youtube' | 'website' | 'folder' | 'drive' | null;

export function ContentImportPage() {
  const { t } = useTranslation('admin');
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const role = useAuthRole();
  const [selectedSource, setSelectedSource] = useState<ImportSource>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const {
    importFromYoutube,
    importFromWebsite,
    importFromDrive,
    importJob,
    isImporting,
    error,
  } = useContentImport(courseId ?? '');

  // Role gate: only instructors and admins
  const allowedRoles = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'];
  if (role && !allowedRoles.includes(role)) {
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
      <PageShell size="sm" className="max-w-3xl p-6" spacing="normal">
        <h1 className="text-3xl font-bold mb-2">
          {t('contentImport.pageTitle')}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t('contentImport.pageDescription')}
        </p>

        {!importJob ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <ImportSourceSelector
              selected={selectedSource}
              onSelect={setSelectedSource}
            />

            {selectedSource === 'youtube' && (
              <div>
                <label
                  htmlFor="youtube-url"
                  className="block text-sm font-medium mb-1"
                >
                  {t('contentImport.youtubeLabel')}
                </label>
                <input
                  id="youtube-url"
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder={t('contentImport.youtubePlaceholder')}
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>
            )}

            {selectedSource === 'website' && (
              <div>
                <label
                  htmlFor="website-url"
                  className="block text-sm font-medium mb-1"
                >
                  {t('contentImport.websiteLabel')}
                </label>
                <input
                  id="website-url"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder={t('contentImport.websitePlaceholder')}
                  className="w-full border rounded px-3 py-2 text-sm"
                  required
                />
              </div>
            )}

            {selectedSource === 'folder' && (
              <FolderUploadZone courseId={courseId ?? ''} />
            )}

            {selectedSource === 'drive' && (
              <DriveImportCard
                courseId={courseId ?? ''}
                moduleId=""
                onImport={(folderId, accessToken) =>
                  void importFromDrive(folderId, accessToken)
                }
                isImporting={isImporting}
              />
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {selectedSource &&
              selectedSource !== 'folder' &&
              selectedSource !== 'drive' && (
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={isImporting}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded font-medium disabled:opacity-50"
                  >
                    {isImporting
                      ? t('contentImport.importing')
                      : t('contentImport.startImport')}
                  </button>
                  <ProgressStatus
                    messages={[...CONTENT_IMPORT_MESSAGES]}
                    active={isImporting}
                    variant="inline"
                  />
                </div>
              )}
          </form>
        ) : (
          <ImportProgressPanel
            job={importJob}
            onDone={() => navigate(`/courses/${courseId}`)}
          />
        )}
      </PageShell>
    </Layout>
  );
}
