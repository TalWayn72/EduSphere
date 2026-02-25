import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  asc,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { scenarioContentSchema } from './scenario.schemas';
import type {
  ScenarioContent,
  ScenarioNodeDto,
  ScenarioProgressEntryDto,
} from './scenario.types';

@Injectable()
export class ScenarioService implements OnModuleDestroy {
  private readonly logger = new Logger(ScenarioService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /** Parse and validate the scenario JSON stored in a content item */
  parseScenarioContent(raw: string | null): ScenarioContent {
    if (!raw) throw new BadRequestException('SCENARIO content is required');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('SCENARIO content must be valid JSON');
    }
    const result = scenarioContentSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message).join(', ');
      throw new BadRequestException(`Invalid SCENARIO content: ${issues}`);
    }
    return result.data as ScenarioContent;
  }

  /** Fetch and return a scenario node (content item) as ScenarioNodeDto */
  async getScenarioNode(
    contentItemId: string,
    tenantCtx: TenantContext,
  ): Promise<ScenarioNodeDto> {
    return withTenantContext(this.db, tenantCtx, async () => {
      const [row] = await this.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, contentItemId))
        .limit(1);
      if (!row) {
        throw new NotFoundException(`ContentItem ${contentItemId} not found`);
      }
      if (row.type !== 'SCENARIO') {
        throw new BadRequestException('Content item is not a SCENARIO node');
      }
      const content = this.parseScenarioContent(row.content ?? null);
      return this.mapNode(row.id, row.title, content);
    });
  }

  /** Record a learner's choice and return the next scenario node (or null) */
  async recordChoice(
    fromContentItemId: string,
    choiceId: string,
    scenarioRootId: string,
    tenantCtx: TenantContext,
  ): Promise<ScenarioNodeDto | null> {
    return withTenantContext(this.db, tenantCtx, async () => {
      const [row] = await this.db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, fromContentItemId))
        .limit(1);
      if (!row) {
        throw new NotFoundException(`ContentItem ${fromContentItemId} not found`);
      }
      const content = this.parseScenarioContent(row.content ?? null);
      const choice = content.choices.find((c) => c.id === choiceId);
      if (!choice) {
        throw new NotFoundException(`Choice ${choiceId} not found in node ${fromContentItemId}`);
      }
      await this.db.insert(schema.scenario_choices).values({
        user_id: tenantCtx.userId,
        tenant_id: tenantCtx.tenantId,
        from_content_item_id: fromContentItemId,
        choice_id: choiceId,
        to_content_item_id: choice.nextContentItemId ?? undefined,
        scenario_root_id: scenarioRootId,
      });
      this.logger.log(
        `Scenario choice recorded: user=${tenantCtx.userId} from=${fromContentItemId} choice=${choiceId}`,
      );
      if (!choice.nextContentItemId) return null;
      return this.getScenarioNode(choice.nextContentItemId, tenantCtx);
    });
  }

  /** Return the ordered list of choices made for a scenario root */
  async getScenarioProgress(
    scenarioRootId: string,
    tenantCtx: TenantContext,
  ): Promise<ScenarioProgressEntryDto[]> {
    return withTenantContext(this.db, tenantCtx, async () => {
      const rows = await this.db
        .select()
        .from(schema.scenario_choices)
        .where(
          and(
            eq(schema.scenario_choices.scenario_root_id, scenarioRootId),
            eq(schema.scenario_choices.user_id, tenantCtx.userId),
          ),
        )
        .orderBy(asc(schema.scenario_choices.chosen_at));

      const entries: ScenarioProgressEntryDto[] = [];
      for (const r of rows) {
        const [itemRow] = await this.db
          .select()
          .from(schema.contentItems)
          .where(eq(schema.contentItems.id, r.from_content_item_id))
          .limit(1);
        const content = itemRow
          ? this.parseScenarioContent(itemRow.content ?? null)
          : null;
        const choiceText =
          content?.choices.find((c) => c.id === r.choice_id)?.text ?? r.choice_id;
        entries.push({
          fromContentItemId: r.from_content_item_id,
          choiceId: r.choice_id,
          choiceText,
          chosenAt: r.chosen_at.toISOString(),
        });
      }
      return entries;
    });
  }

  private mapNode(
    id: string,
    title: string,
    content: ScenarioContent,
  ): ScenarioNodeDto {
    return {
      id,
      title,
      description: content.description,
      choices: content.choices,
      isEndNode: content.isEndNode,
      endingType: content.endingType,
    };
  }
}
