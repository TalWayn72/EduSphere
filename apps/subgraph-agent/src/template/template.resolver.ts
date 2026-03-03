import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
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

  @Query('agentTemplate')
  async getAgentTemplate(@Args('id') id: string) {
    return this.templateService.findById(id);
  }

  @Query('agentTemplates')
  async getAgentTemplates(
    @Args('limit') limit: number,
    @Args('offset') offset: number
  ) {
    return this.templateService.findAll(limit, offset);
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
  async updateAgentTemplate(@Args('id') id: string, @Args('input') input: UpdateAgentTemplateInput) {
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
