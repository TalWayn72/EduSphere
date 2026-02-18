import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateResolver } from './template.resolver';

// ── TemplateService mock ──────────────────────────────────────────────────────
const mockTemplateService = {
  findById: vi.fn(),
  findAll: vi.fn(),
  findByType: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  activate: vi.fn(),
  deactivate: vi.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_TEMPLATE = {
  id: 'tmpl-1',
  name: 'Chavruta Debate',
  template: 'CHAVRUTA_DEBATE',
  config: { temperature: 0.7 },
  is_active: true,
  tenant_id: 'tenant-1',
  creator_id: 'user-1',
};

describe('TemplateResolver', () => {
  let resolver: TemplateResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new TemplateResolver(mockTemplateService as any);
  });

  // ── getAgentTemplate ──────────────────────────────────────────────────────

  describe('getAgentTemplate()', () => {
    it('delegates to templateService.findById with correct id', async () => {
      mockTemplateService.findById.mockResolvedValue(MOCK_TEMPLATE);
      const result = await resolver.getAgentTemplate('tmpl-1');
      expect(mockTemplateService.findById).toHaveBeenCalledWith('tmpl-1');
      expect(result).toEqual(MOCK_TEMPLATE);
    });

    it('returns null when template is not found', async () => {
      mockTemplateService.findById.mockResolvedValue(null);
      const result = await resolver.getAgentTemplate('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── getAgentTemplates ─────────────────────────────────────────────────────

  describe('getAgentTemplates()', () => {
    it('delegates to templateService.findAll with limit and offset', async () => {
      mockTemplateService.findAll.mockResolvedValue([MOCK_TEMPLATE]);
      const result = await resolver.getAgentTemplates(10, 0);
      expect(mockTemplateService.findAll).toHaveBeenCalledWith(10, 0);
      expect(result).toEqual([MOCK_TEMPLATE]);
    });

    it('returns paginated results with custom limit', async () => {
      mockTemplateService.findAll.mockResolvedValue([MOCK_TEMPLATE]);
      await resolver.getAgentTemplates(25, 50);
      expect(mockTemplateService.findAll).toHaveBeenCalledWith(25, 50);
    });

    it('returns empty array when no templates exist', async () => {
      mockTemplateService.findAll.mockResolvedValue([]);
      const result = await resolver.getAgentTemplates(10, 0);
      expect(result).toEqual([]);
    });
  });

  // ── getAgentTemplatesByType ───────────────────────────────────────────────

  describe('getAgentTemplatesByType()', () => {
    it('delegates to templateService.findByType with template string', async () => {
      mockTemplateService.findByType.mockResolvedValue([MOCK_TEMPLATE]);
      const result = await resolver.getAgentTemplatesByType('CHAVRUTA_DEBATE');
      expect(mockTemplateService.findByType).toHaveBeenCalledWith('CHAVRUTA_DEBATE');
      expect(result).toEqual([MOCK_TEMPLATE]);
    });

    it('returns quiz templates when QUIZ_ASSESS is queried', async () => {
      const quizTemplate = { ...MOCK_TEMPLATE, template: 'QUIZ_ASSESS' };
      mockTemplateService.findByType.mockResolvedValue([quizTemplate]);
      const result = await resolver.getAgentTemplatesByType('QUIZ_ASSESS');
      expect(result[0].template).toBe('QUIZ_ASSESS');
    });

    it('returns summarize templates when SUMMARIZE is queried', async () => {
      const summarizeTemplate = { ...MOCK_TEMPLATE, template: 'SUMMARIZE' };
      mockTemplateService.findByType.mockResolvedValue([summarizeTemplate]);
      const result = await resolver.getAgentTemplatesByType('SUMMARIZE');
      expect(result[0].template).toBe('SUMMARIZE');
    });
  });

  // ── createAgentTemplate ───────────────────────────────────────────────────

  describe('createAgentTemplate()', () => {
    it('delegates to templateService.create with input', async () => {
      mockTemplateService.create.mockResolvedValue(MOCK_TEMPLATE);
      const input = { tenantId: 'tenant-1', name: 'New Agent', template: 'TUTOR' };
      const result = await resolver.createAgentTemplate(input);
      expect(mockTemplateService.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(MOCK_TEMPLATE);
    });

    it('returns the newly created template', async () => {
      mockTemplateService.create.mockResolvedValue(MOCK_TEMPLATE);
      const result = await resolver.createAgentTemplate({});
      expect(result).toHaveProperty('id', 'tmpl-1');
    });
  });

  // ── updateAgentTemplate ───────────────────────────────────────────────────

  describe('updateAgentTemplate()', () => {
    it('delegates to templateService.update with id and input', async () => {
      const updated = { ...MOCK_TEMPLATE, name: 'Updated' };
      mockTemplateService.update.mockResolvedValue(updated);
      const result = await resolver.updateAgentTemplate('tmpl-1', { name: 'Updated' });
      expect(mockTemplateService.update).toHaveBeenCalledWith('tmpl-1', { name: 'Updated' });
      expect(result).toEqual(updated);
    });
  });

  // ── deleteAgentTemplate ───────────────────────────────────────────────────

  describe('deleteAgentTemplate()', () => {
    it('delegates to templateService.delete with id', async () => {
      mockTemplateService.delete.mockResolvedValue(true);
      const result = await resolver.deleteAgentTemplate('tmpl-1');
      expect(mockTemplateService.delete).toHaveBeenCalledWith('tmpl-1');
      expect(result).toBe(true);
    });

    it('returns true on successful soft-delete', async () => {
      mockTemplateService.delete.mockResolvedValue(true);
      const result = await resolver.deleteAgentTemplate('tmpl-1');
      expect(result).toBe(true);
    });
  });

  // ── activateAgentTemplate ─────────────────────────────────────────────────

  describe('activateAgentTemplate()', () => {
    it('delegates to templateService.activate with id', async () => {
      const activated = { ...MOCK_TEMPLATE, is_active: true };
      mockTemplateService.activate.mockResolvedValue(activated);
      const result = await resolver.activateAgentTemplate('tmpl-1');
      expect(mockTemplateService.activate).toHaveBeenCalledWith('tmpl-1');
      expect(result).toEqual(activated);
    });
  });

  // ── deactivateAgentTemplate ───────────────────────────────────────────────

  describe('deactivateAgentTemplate()', () => {
    it('delegates to templateService.deactivate with id', async () => {
      const deactivated = { ...MOCK_TEMPLATE, is_active: false };
      mockTemplateService.deactivate.mockResolvedValue(deactivated);
      const result = await resolver.deactivateAgentTemplate('tmpl-1');
      expect(mockTemplateService.deactivate).toHaveBeenCalledWith('tmpl-1');
      expect(result).toEqual(deactivated);
    });

    it('returns template with is_active false', async () => {
      const deactivated = { ...MOCK_TEMPLATE, is_active: false };
      mockTemplateService.deactivate.mockResolvedValue(deactivated);
      const result = await resolver.deactivateAgentTemplate('tmpl-1');
      expect(result.is_active).toBe(false);
    });
  });
});
