/**
 * Tests for source-manager/types.ts — verifies constants and type exports.
 */
import { describe, it, expect } from 'vitest';
import {
  TAB_KEYS,
  TAB_LABEL_KEYS,
  SOURCE_ICONS,
  STATUS_COLORS,
  STATUS_I18N_KEYS,
} from './types';
import type {
  SourceStatus,
  SourceType,
  KnowledgeSource,
  AddTab,
} from './types';

describe('source-manager/types', () => {
  describe('TAB_KEYS', () => {
    it('contains all 4 tab keys', () => {
      expect(TAB_KEYS).toEqual(['url', 'text', 'youtube', 'file']);
    });

    it('is an array', () => {
      expect(Array.isArray(TAB_KEYS)).toBe(true);
    });
  });

  describe('TAB_LABEL_KEYS', () => {
    it('maps each tab to an i18n key', () => {
      expect(TAB_LABEL_KEYS.url).toBe('sources.tabUrl');
      expect(TAB_LABEL_KEYS.text).toBe('sources.tabText');
      expect(TAB_LABEL_KEYS.youtube).toBe('sources.tabYoutube');
      expect(TAB_LABEL_KEYS.file).toBe('sources.tabFile');
    });

    it('has keys matching TAB_KEYS', () => {
      for (const key of TAB_KEYS) {
        expect(TAB_LABEL_KEYS[key]).toBeDefined();
      }
    });
  });

  describe('SOURCE_ICONS', () => {
    it('has icons for all source types', () => {
      const expectedTypes: SourceType[] = [
        'FILE_DOCX',
        'FILE_PDF',
        'FILE_TXT',
        'URL',
        'YOUTUBE',
        'TEXT',
      ];
      for (const type of expectedTypes) {
        expect(SOURCE_ICONS[type]).toBeDefined();
        expect(typeof SOURCE_ICONS[type]).toBe('string');
      }
    });

    it('has 6 entries', () => {
      expect(Object.keys(SOURCE_ICONS)).toHaveLength(6);
    });
  });

  describe('STATUS_COLORS', () => {
    it('has CSS classes for all statuses', () => {
      const expectedStatuses: SourceStatus[] = [
        'PENDING',
        'PROCESSING',
        'READY',
        'FAILED',
      ];
      for (const status of expectedStatuses) {
        expect(STATUS_COLORS[status]).toBeDefined();
        expect(typeof STATUS_COLORS[status]).toBe('string');
      }
    });

    it('PROCESSING has animate-pulse class', () => {
      expect(STATUS_COLORS.PROCESSING).toContain('animate-pulse');
    });

    it('READY has green color class', () => {
      expect(STATUS_COLORS.READY).toContain('green');
    });

    it('FAILED has red color class', () => {
      expect(STATUS_COLORS.FAILED).toContain('red');
    });
  });

  describe('STATUS_I18N_KEYS', () => {
    it('maps all statuses to i18n keys', () => {
      expect(STATUS_I18N_KEYS.PENDING).toBe('sources.statusPending');
      expect(STATUS_I18N_KEYS.PROCESSING).toBe('sources.statusProcessing');
      expect(STATUS_I18N_KEYS.READY).toBe('sources.statusReady');
      expect(STATUS_I18N_KEYS.FAILED).toBe('sources.statusFailed');
    });
  });

  describe('type structure validation', () => {
    it('KnowledgeSource type is structurally valid', () => {
      const source: KnowledgeSource = {
        id: 'src-1',
        title: 'Test Source',
        sourceType: 'URL',
        status: 'READY',
        chunkCount: 5,
        createdAt: '2026-01-01T00:00:00Z',
      };
      expect(source.id).toBe('src-1');
      expect(source.sourceType).toBe('URL');
    });

    it('KnowledgeSource with all optional fields', () => {
      const source: KnowledgeSource = {
        id: 'src-2',
        title: 'Full Source',
        sourceType: 'FILE_PDF',
        origin: 'https://example.com/doc.pdf',
        preview: 'Preview text...',
        rawContent: 'Full content...',
        status: 'FAILED',
        chunkCount: 0,
        errorMessage: 'Processing failed',
        createdAt: '2026-01-01T00:00:00Z',
      };
      expect(source.errorMessage).toBe('Processing failed');
      expect(source.origin).toBe('https://example.com/doc.pdf');
    });

    it('AddTab type accepts all tab values', () => {
      const tabs: AddTab[] = ['url', 'text', 'file', 'youtube'];
      expect(tabs).toHaveLength(4);
    });
  });
});
