import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { TemplateService } from './template.service';

interface CreateAgentTemplateInput {
  tenantId: string;
  creatorId: string;
  name: string;
  template: string;
  config?: Record<string, unknown>;
}

interface UpdateAgentTemplateInput {
  name?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

@Resolver('AgentTemplate')
export class TemplateResolver {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * Map DB column `template` to GraphQL field `templateType`.
   * The agent_definitions table stores the enum value in `template`,
   * but the AgentTemplate GraphQL type exposes it as `templateType`.
   */
  @ResolveField('templateType')
  resolveTemplateType(@Parent() template: Record<string, unknown>) {
    return template['templateType'] ?? template['template'] ?? 'CUSTOM';
  }

  /**
   * Map DB `config.systemPrompt` to GraphQL field `systemPrompt`.
   * The agent_definitions table stores systemPrompt inside the config jsonb column.
   */
  @ResolveField('systemPrompt')
  resolveSystemPrompt(@Parent() template: Record<string, unknown>) {
    if (template['systemPrompt']) return template['systemPrompt'];
    const config = template['config'] as Record<string, unknown> | undefined;
    return config?.['systemPrompt'] ?? '';
  }

  /**
   * Map DB `config` to GraphQL field `parameters`.
   * The hardcoded templates use `parameters`, the DB uses `config`.
   */
  @ResolveField('parameters')
  resolveParameters(@Parent() template: Record<string, unknown>) {
    return template['parameters'] ?? template['config'] ?? {};
  }

  @Query('agentTemplate')
  async getAgentTemplate(@Args('id') id: string) {
    return this.templateService.findById(id);
  }

  @Query('agentTemplatesByType')
  async getAgentTemplatesByType(@Args('template') template: string) {
    return this.templateService.findByType(template);
  }

  @Mutation('createAgentTemplate')
  async createAgentTemplate(@Args('input') input: CreateAgentTemplateInput) {
    return this.templateService.create(input);
  }

  @Mutation('updateAgentTemplate')
  async updateAgentTemplate(
    @Args('id') id: string,
    @Args('input') input: UpdateAgentTemplateInput
  ) {
    return this.templateService.update(id, input);
  }

  @Mutation('deleteAgentTemplate')
  async deleteAgentTemplate(@Args('id') id: string) {
    return this.templateService.delete(id);
  }

  @Mutation('activateAgentTemplate')
  async activateAgentTemplate(@Args('id') id: string) {
    return this.templateService.activate(id);
  }

  @Mutation('deactivateAgentTemplate')
  async deactivateAgentTemplate(@Args('id') id: string) {
    return this.templateService.deactivate(id);
  }
}
