import { XMLParser } from 'fast-xml-parser';
import { BadRequestException } from '@nestjs/common';

export interface ScormItem {
  identifier: string;
  title: string;
  resourceHref: string;
  isVisible: boolean;
}

export interface ScormManifest {
  version: '1.2' | '2004';
  title: string;
  identifier: string;
  items: ScormItem[];
}

interface ResourceMap {
  [id: string]: string;
}

/** Detect SCORM version from manifest metadata */
function detectVersion(manifest: Record<string, unknown>): '1.2' | '2004' {
  const ns = (manifest['@_xmlns'] as string | undefined) ?? '';
  if (ns.includes('2004') || ns.includes('cam')) return '2004';

  const metadata = manifest['metadata'] as Record<string, unknown> | undefined;
  if (metadata) {
    const schemaName = String(metadata['schema'] ?? '').toLowerCase();
    // schemaversion can be a number (e.g. 1.2) or a string — always stringify
    const schemaVer = String(metadata['schemaversion'] ?? '');
    if (schemaName.includes('2004') || schemaVer.includes('2004')) {
      return '2004';
    }
    if (schemaVer.startsWith('1.2') || schemaName.includes('1.2')) {
      return '1.2';
    }
  }
  return '1.2'; // default fallback
}

/** Build a flat map of resourceId → href */
function buildResourceMap(resources: unknown): ResourceMap {
  const map: ResourceMap = {};
  if (!resources || typeof resources !== 'object') return map;
  const res = resources as Record<string, unknown>;
  const list = Array.isArray(res['resource'])
    ? res['resource']
    : [res['resource']];
  for (const r of list) {
    if (!r || typeof r !== 'object') continue;
    const resource = r as Record<string, unknown>;
    const id = resource['@_identifier'] as string | undefined;
    const href = resource['@_href'] as string | undefined;
    if (id && href) {
      Object.assign(map, { [id]: href });
    }
  }
  return map;
}

/** Recursively collect items from an organization tree */
function collectItems(
  node: unknown,
  resourceMap: ResourceMap,
  results: ScormItem[]
): void {
  if (!node || typeof node !== 'object') return;
  const n = node as Record<string, unknown>;

  const identifier = (n['@_identifier'] as string | undefined) ?? '';
  const isVisible = (n['@_isvisible'] as string | undefined) !== 'false';

  // Extract title
  let title = '';
  if (n['title']) {
    title = typeof n['title'] === 'string' ? n['title'] : String(n['title']);
  }

  // Map resource reference
  const idref = (n['@_identifierref'] as string | undefined) ?? '';
  const href =
    (Object.prototype.hasOwnProperty.call(resourceMap, idref)
      ? resourceMap[idref as keyof typeof resourceMap]
      : undefined) ?? '';

  if (identifier && href) {
    results.push({
      identifier,
      title: title || identifier,
      resourceHref: href,
      isVisible,
    });
  }

  // Recurse into child items
  const children = n['item'];
  if (Array.isArray(children)) {
    for (const child of children) collectItems(child, resourceMap, results);
  } else if (children) {
    collectItems(children, resourceMap, results);
  }
}

export function parseScormManifest(xmlContent: string): ScormManifest {
  if (!xmlContent || xmlContent.trim().length === 0) {
    throw new BadRequestException('imsmanifest.xml is empty');
  }

  // Parse numeric values as strings to avoid version number coercion
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xmlContent) as Record<string, unknown>;
  } catch (e) {
    throw new BadRequestException(
      `Failed to parse imsmanifest.xml: ${String(e)}`
    );
  }

  const manifest = parsed['manifest'] as Record<string, unknown> | undefined;
  if (!manifest) {
    throw new BadRequestException(
      'imsmanifest.xml is missing <manifest> root element'
    );
  }

  const version = detectVersion(manifest);
  const identifier =
    (manifest['@_identifier'] as string | undefined) ?? 'unknown';

  // Extract title from organizations
  const organizations = manifest['organizations'] as
    | Record<string, unknown>
    | undefined;
  if (!organizations) {
    throw new BadRequestException('imsmanifest.xml is missing <organizations>');
  }

  const org = Array.isArray(organizations['organization'])
    ? organizations['organization'][0]
    : organizations['organization'];

  if (!org || typeof org !== 'object') {
    throw new BadRequestException(
      'imsmanifest.xml has no valid <organization>'
    );
  }

  const orgObj = org as Record<string, unknown>;
  const title =
    typeof orgObj['title'] === 'string'
      ? orgObj['title']
      : String(orgObj['title'] ?? identifier);

  // Build resource map and collect items
  const resources = manifest['resources'];
  const resourceMap = buildResourceMap(resources);

  const items: ScormItem[] = [];
  const rootItems = orgObj['item'];
  if (Array.isArray(rootItems)) {
    for (const item of rootItems) collectItems(item, resourceMap, items);
  } else if (rootItems) {
    collectItems(rootItems, resourceMap, items);
  }

  if (items.length === 0) {
    throw new BadRequestException(
      'imsmanifest.xml contains no launchable items with resources'
    );
  }

  return { version, title, identifier, items };
}
