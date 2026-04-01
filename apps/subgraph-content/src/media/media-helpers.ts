export const PRESIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes

export const VALID_MODEL_FORMATS = ['gltf', 'glb', 'obj', 'fbx'] as const;
export type ModelFormat = (typeof VALID_MODEL_FORMATS)[number];

export interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  expiresAt: string;
}

export interface MediaAssetResult {
  id: string;
  courseId: string;
  fileKey: string;
  title: string;
  contentType: string;
  status: string;
  downloadUrl: string | null;
  hlsManifestUrl: string | null;
  captionsUrl: string | null;
  altText: string | null;
  model_format?: string | null;
  model_animations?: unknown;
  poly_count?: number | null;
}

export interface Model3DUploadResult {
  assetId: string;
  uploadUrl: string;
  key: string;
}

const MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
};

export function extractContentTypeFromKey(fileKey: string): string {
  const ext = fileKey.split('.').pop()?.toLowerCase() ?? '';
  return MIME_MAP[ext as keyof typeof MIME_MAP] ?? 'application/octet-stream';
}

export function detectMediaType(
  contentType: string
): 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'MODEL_3D' {
  if (contentType.startsWith('video/')) return 'VIDEO';
  if (contentType.startsWith('audio/')) return 'AUDIO';
  if (
    contentType === 'model/gltf+json' ||
    contentType === 'model/gltf-binary' ||
    contentType === 'model/obj' ||
    contentType === 'application/octet-stream-fbx'
  )
    return 'MODEL_3D';
  return 'DOCUMENT';
}

export function contentTypeForModelFormat(format: ModelFormat): string {
  switch (format) {
    case 'gltf':
      return 'model/gltf+json';
    case 'glb':
      return 'model/gltf-binary';
    case 'obj':
      return 'model/obj';
    case 'fbx':
      return 'application/octet-stream';
  }
}

/** UUID v4 regex for validating courseId/lessonId */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const LANG_LABELS: Record<string, string> = {
  en: 'English',
  he: 'Hebrew',
  ar: 'Arabic',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  ru: 'Russian',
};
