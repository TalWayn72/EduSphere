import { describe, it, expect } from 'vitest';
import { parseScormManifest } from './scorm-manifest.parser';

const SCORM_12_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.course1" version="1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>Introduction to Torah Studies</title>
      <item identifier="item1" identifierref="res1" isvisible="true">
        <title>Module 1: Bereshit</title>
      </item>
      <item identifier="item2" identifierref="res2" isvisible="true">
        <title>Module 2: Noach</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="module1/index.html">
    </resource>
    <resource identifier="res2" type="webcontent" adlcp:scormtype="sco" href="module2/index.html">
    </resource>
  </resources>
</manifest>`;

const SCORM_2004_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.course2"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.gov/xsd/adlcp_v1p3">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>Advanced Talmud Course</title>
      <item identifier="item1" identifierref="res1" isvisible="true">
        <title>Tractate Berachot</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" adlcp:scormType="sco" href="berachot/index.html">
    </resource>
  </resources>
</manifest>`;

const MISSING_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<organizations default="org1">
  <organization identifier="org1"><title>Test</title></organization>
</organizations>`;

describe('parseScormManifest', () => {
  it('parses SCORM 1.2 manifest correctly', () => {
    const result = parseScormManifest(SCORM_12_MANIFEST);
    expect(result.version).toBe('1.2');
    expect(result.title).toBe('Introduction to Torah Studies');
    expect(result.identifier).toBe('com.example.course1');
    expect(result.items).toHaveLength(2);
  });

  it('extracts item titles and resource hrefs from SCORM 1.2', () => {
    const result = parseScormManifest(SCORM_12_MANIFEST);
    expect(result.items[0]).toMatchObject({
      identifier: 'item1',
      title: 'Module 1: Bereshit',
      resourceHref: 'module1/index.html',
      isVisible: true,
    });
    expect(result.items[1]).toMatchObject({
      identifier: 'item2',
      title: 'Module 2: Noach',
      resourceHref: 'module2/index.html',
    });
  });

  it('parses SCORM 2004 manifest and detects version', () => {
    const result = parseScormManifest(SCORM_2004_MANIFEST);
    expect(result.version).toBe('2004');
    expect(result.title).toBe('Advanced Talmud Course');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.resourceHref).toBe('berachot/index.html');
  });

  it('throws BadRequestException for empty content', () => {
    expect(() => parseScormManifest('')).toThrow('empty');
  });

  it('throws BadRequestException when <manifest> root element is missing', () => {
    expect(() => parseScormManifest(MISSING_MANIFEST)).toThrow('manifest');
  });

  it('throws BadRequestException for malformed XML', () => {
    expect(() => parseScormManifest('<manifest><unclosed>')).toThrow();
  });

  it('throws when no items have resource references', () => {
    const noResources = `<?xml version="1.0"?>
    <manifest identifier="test" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
      <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
      <organizations default="o1">
        <organization identifier="o1">
          <title>Empty Course</title>
          <item identifier="i1" identifierref="nonexistent" isvisible="true">
            <title>Item 1</title>
          </item>
        </organization>
      </organizations>
      <resources></resources>
    </manifest>`;
    expect(() => parseScormManifest(noResources)).toThrow(
      'no launchable items'
    );
  });
});
