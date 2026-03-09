import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { request, gql } from 'graphql-request';

const GRAPHQL_URL =
  (import.meta.env['VITE_GRAPHQL_URL'] as string) ?? '/graphql';

const IMPORT_YOUTUBE_MUTATION = gql`
  mutation ImportFromYoutube($input: YoutubeImportInput!) {
    importFromYoutube(input: $input) {
      id
      status
      lessonCount
      estimatedMinutes
    }
  }
`;

const IMPORT_WEBSITE_MUTATION = gql`
  mutation ImportFromWebsite($input: WebsiteImportInput!) {
    importFromWebsite(input: $input) {
      id
      status
      lessonCount
      estimatedMinutes
    }
  }
`;

const IMPORT_FROM_DRIVE_MUTATION = gql`
  mutation ImportFromDrive($input: DriveImportInput!) {
    importFromDrive(input: $input) {
      id
      status
      lessonCount
      estimatedMinutes
    }
  }
`;

const CANCEL_IMPORT_MUTATION = gql`
  mutation CancelImport($jobId: ID!) {
    cancelImport(jobId: $jobId)
  }
`;

interface ImportJob {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
  lessonCount: number;
  estimatedMinutes: number | null;
}

interface ImportYoutubeResult { importFromYoutube: ImportJob }
interface ImportWebsiteResult { importFromWebsite: ImportJob }
interface ImportFromDriveResult { importFromDrive: ImportJob }

export function useContentImport(courseId: string) {
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const youtubeMutation = useMutation({
    mutationFn: (playlistUrl: string) =>
      request<ImportYoutubeResult>(GRAPHQL_URL, IMPORT_YOUTUBE_MUTATION, {
        input: { playlistUrl, courseId, moduleId: '' },
      }),
    onSuccess: (data) => setImportJob(data.importFromYoutube),
    onError: (err: Error) => setError(err.message),
  });

  const websiteMutation = useMutation({
    mutationFn: (siteUrl: string) =>
      request<ImportWebsiteResult>(GRAPHQL_URL, IMPORT_WEBSITE_MUTATION, {
        input: { siteUrl, courseId, moduleId: '' },
      }),
    onSuccess: (data) => setImportJob(data.importFromWebsite),
    onError: (err: Error) => setError(err.message),
  });

  const driveMutation = useMutation({
    mutationFn: ({ folderId, accessToken }: { folderId: string; accessToken: string }) =>
      request<ImportFromDriveResult>(GRAPHQL_URL, IMPORT_FROM_DRIVE_MUTATION, {
        input: { folderId, accessToken, courseId, moduleId: '' },
      }),
    onSuccess: (data) => setImportJob(data.importFromDrive),
    onError: (err: Error) => setError(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) =>
      request(GRAPHQL_URL, CANCEL_IMPORT_MUTATION, { jobId }),
  });

  return {
    importFromYoutube: (playlistUrl: string) => youtubeMutation.mutateAsync(playlistUrl),
    importFromWebsite: (siteUrl: string) => websiteMutation.mutateAsync(siteUrl),
    importFromDrive: (folderId: string, accessToken: string) =>
      driveMutation.mutateAsync({ folderId, accessToken }),
    cancelImport: (jobId: string) => cancelMutation.mutateAsync(jobId),
    importJob,
    isImporting: youtubeMutation.isPending || websiteMutation.isPending || driveMutation.isPending,
    error,
  };
}
