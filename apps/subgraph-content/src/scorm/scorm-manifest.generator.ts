import type { ContentItem } from '@edusphere/db';

export interface CourseData {
  id: string;
  title: string;
  description: string | null;
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

const SCORM_2004_NAMESPACES = [
  'xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"',
  'xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"',
  'xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"',
  'xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"',
  'xmlns:imsss="http://www.imsglobal.org/xsd/imsss"',
].join('\n  ');

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function itemIdentifier(item: ContentItem): string {
  return `ITEM-${item.id}`;
}

function resourceIdentifier(item: ContentItem): string {
  return `RES-${item.id}`;
}

function resourceHref(item: ContentItem): string {
  const type = item.type;
  if (type === 'VIDEO') return `content/${item.id}/video.html`;
  if (type === 'QUIZ') return `content/${item.id}/quiz.html`;
  if (type === 'PDF') return `content/${item.id}/document.pdf`;
  if (type === 'MARKDOWN') return `content/${item.id}/document.html`;
  return `content/${item.id}/index.html`;
}

function buildItems(items: ContentItem[]): string {
  return items
    .map(
      (item) =>
        `      <item identifier="${itemIdentifier(item)}" identifierref="${resourceIdentifier(item)}" isvisible="true">\n` +
        `        <title>${escapeXml(item.title)}</title>\n` +
        `      </item>`,
    )
    .join('\n');
}

function buildResources(items: ContentItem[]): string {
  return items
    .map(
      (item) =>
        `    <resource identifier="${resourceIdentifier(item)}" type="webcontent" ` +
        `adlcp:scormType="sco" href="${resourceHref(item)}">\n` +
        `      <file href="${resourceHref(item)}"/>\n` +
        `    </resource>`,
    )
    .join('\n');
}

export function generateManifest2004(course: CourseData, items: ContentItem[]): string {
  const orgId = `ORG-${course.id}`;
  const title = escapeXml(course.title);

  return [
    XML_HEADER,
    `<manifest identifier="${course.id}" version="1"`,
    `  ${SCORM_2004_NAMESPACES}>`,
    `  <metadata>`,
    `    <schema>ADL SCORM</schema>`,
    `    <schemaversion>2004 4th Edition</schemaversion>`,
    `  </metadata>`,
    `  <organizations default="${orgId}">`,
    `    <organization identifier="${orgId}">`,
    `      <title>${title}</title>`,
    buildItems(items),
    `    </organization>`,
    `  </organizations>`,
    `  <resources>`,
    buildResources(items),
    `  </resources>`,
    `</manifest>`,
  ].join('\n');
}

export const SCORM_2004_API_SHIM = `// Minimal SCORM 2004 API shim for standalone viewing
var API_1484_11 = {
  Initialize: function(s) { return 'true'; },
  Terminate: function(s) { return 'true'; },
  GetValue: function(e) { return ''; },
  SetValue: function(e, v) { return 'true'; },
  Commit: function(s) { return 'true'; },
  GetLastError: function() { return '0'; },
  GetErrorString: function(n) { return ''; },
  GetDiagnostic: function(s) { return ''; }
};
`;

export function injectScormApiShim(htmlContent: string): string {
  const shimScript = `<script>\n${SCORM_2004_API_SHIM}</script>`;
  if (htmlContent.includes('</head>')) {
    return htmlContent.replace('</head>', `${shimScript}\n</head>`);
  }
  if (htmlContent.includes('<body')) {
    return htmlContent.replace('<body', `${shimScript}\n<body`);
  }
  return shimScript + '\n' + htmlContent;
}

export function buildVideoHtml(item: ContentItem): string {
  const src = JSON.parse(item.content ?? '{}') as { url?: string };
  const videoSrc = src.url ?? '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${escapeXml(item.title)}</title></head>
<body>
<h1>${escapeXml(item.title)}</h1>
<video controls style="max-width:100%">${videoSrc ? `<source src="${escapeXml(videoSrc)}">` : ''}Your browser does not support video.</video>
</body></html>`;
}

export function buildQuizHtml(item: ContentItem): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${escapeXml(item.title)}</title></head>
<body>
<h1>${escapeXml(item.title)}</h1>
<p>This quiz is available in the EduSphere platform.</p>
</body></html>`;
}
