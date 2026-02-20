import { Injectable, Logger } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, desc } from '@edusphere/db';

// ── Default template definitions ──────────────────────────────────────────────

interface DefaultTemplateConfig {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  description: string;
}

export const DEFAULT_TEMPLATES: Record<string, DefaultTemplateConfig> = {
  CHAVRUTA_DEBATE: {
    description:
      'Chavruta Study Partner — dialectical Socratic debate for deep understanding',
    systemPrompt: `You are a Chavruta (Jewish study partner) who engages in Socratic dialogue.
Guide the learner through ASSESS → CHALLENGE → RESPOND → EVALUATE → CONCLUDE states
to deepen comprehension through questioning and reflection.`,
    temperature: 0.8,
    maxTokens: 400,
  },
  QUIZ_ASSESS: {
    description:
      'Quiz Master — adaptive MCQ assessment with explanations and difficulty scaling',
    systemPrompt: `You are a quiz generator and evaluator. Generate 5 multiple-choice questions
from course content, evaluate answers with explanations, and track score across
LOAD_CONTENT → GENERATE_QUESTIONS → ASK → EVALUATE_ANSWER → SCORE states.`,
    temperature: 0.4,
    maxTokens: 1200,
  },
  SUMMARIZE: {
    description:
      'Content Summarizer — structured extraction with key concepts, main points, and learning objectives',
    systemPrompt: `You are a content summarizer. Process course materials through
EXTRACT → OUTLINE → DRAFT → REFINE → COMPLETE states to produce structured
summaries with key concepts, main points, and learning objectives.`,
    temperature: 0.3,
    maxTokens: 900,
  },
  RESEARCH_SCOUT: {
    description:
      'Research Scout — guided inquiry, resource suggestions, and knowledge gap identification',
    systemPrompt: `You are a research assistant for learners. Help explore topics in depth,
suggest academic and practical resources, identify knowledge gaps, and guide
inquiry-based learning with curiosity and precision.`,
    temperature: 0.7,
    maxTokens: 1500,
  },
  EXPLAIN: {
    description:
      'Concept Explainer — patient, adaptive explanations with analogies and comprehension checks',
    systemPrompt: `You are a clear and patient concept explainer. Break down complex ideas
into accessible terms, use relatable analogies, and adapt depth to the learner's
demonstrated understanding. Always check for comprehension before moving on.`,
    temperature: 0.6,
    maxTokens: 1000,
  },
};

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private db = createDatabaseConnection();

  async findById(id: string) {
    const [template] = await this.db
      .select()
      .from(schema.agent_definitions)
      .where(eq(schema.agent_definitions.id, id))
      .limit(1);
    return template || null;
  }

  async findAll(limit: number, offset: number) {
    return this.db
      .select()
      .from(schema.agent_definitions)
      .orderBy(desc(schema.agent_definitions.created_at))
      .limit(limit)
      .offset(offset);
  }

  async findByType(template: string) {
    return this.db
      .select()
      .from(schema.agent_definitions)
      .where(eq(schema.agent_definitions.template, template as never))
      .orderBy(desc(schema.agent_definitions.created_at));
  }

  async create(input: {
    tenantId: string;
    creatorId: string;
    name: string;
    template: string;
    config?: Record<string, unknown>;
  }) {
    const [template] = await this.db
      .insert(schema.agent_definitions)
      .values({
        tenant_id: input.tenantId,
        creator_id: input.creatorId,
        name: input.name,
        template: input.template as never,
        config: input.config ?? {},
        is_active: true,
      })
      .returning();
    return template;
  }

  async update(
    id: string,
    input: {
      name?: string;
      config?: Record<string, unknown>;
      isActive?: boolean;
    }
  ) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };
    if (input.name !== undefined) updateData['name'] = input.name;
    if (input.config !== undefined) updateData['config'] = input.config;
    if (input.isActive !== undefined) updateData['is_active'] = input.isActive;

    const [template] = await this.db
      .update(schema.agent_definitions)
      .set(updateData as never)
      .where(eq(schema.agent_definitions.id, id))
      .returning();
    return template;
  }

  async delete(id: string) {
    await this.db
      .update(schema.agent_definitions)
      .set({ deleted_at: new Date() } as never)
      .where(eq(schema.agent_definitions.id, id));
    return true;
  }

  async activate(id: string) {
    const [template] = await this.db
      .update(schema.agent_definitions)
      .set({ is_active: true, updated_at: new Date() } as never)
      .where(eq(schema.agent_definitions.id, id))
      .returning();
    return template;
  }

  async deactivate(id: string) {
    const [template] = await this.db
      .update(schema.agent_definitions)
      .set({ is_active: false, updated_at: new Date() } as never)
      .where(eq(schema.agent_definitions.id, id))
      .returning();
    return template;
  }

  /**
   * Seed the 5 default agent templates for a given tenant.
   * Idempotent: skips templates that already exist by type.
   */
  async seedDefaults(tenantId: string, creatorId: string): Promise<void> {
    for (const [templateKey, cfg] of Object.entries(DEFAULT_TEMPLATES)) {
      const existing = await this.findByType(templateKey);
      if (existing.length > 0) continue;

      await this.create({
        tenantId,
        creatorId,
        name: cfg.description,
        template: templateKey,
        config: {
          systemPrompt: cfg.systemPrompt,
          temperature: cfg.temperature,
          maxTokens: cfg.maxTokens,
          description: cfg.description,
        },
      });

      this.logger.log(`Seeded default template: ${templateKey}`);
    }
  }

  /** Return the config for a built-in template type (for direct AI service use). */
  getDefaultConfig(templateKey: string): DefaultTemplateConfig | null {
    return DEFAULT_TEMPLATES[templateKey] ?? null;
  }
}
