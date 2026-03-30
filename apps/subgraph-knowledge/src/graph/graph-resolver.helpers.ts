/**
 * Shared auth context helper and type definitions for graph resolvers.
 */
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { ConceptRelationshipType } from '@edusphere/db';

export type { GraphQLContext } from '../auth/auth.middleware';

const VALID_RELATIONSHIP_TYPES: ReadonlySet<string> = new Set<ConceptRelationshipType>([
  'RELATED_TO',
  'RELATES_TO',
  'PREREQUISITE_OF',
  'CONTRADICTS',
  'DERIVED_FROM',
  'PART_OF',
  'AUTHORED_BY',
]);

export function assertRelationshipType(value: string): ConceptRelationshipType {
  if (!VALID_RELATIONSHIP_TYPES.has(value)) {
    throw new BadRequestException(
      `Invalid relationship type '${value}'. Must be one of: ${[...VALID_RELATIONSHIP_TYPES].join(', ')}`
    );
  }
  return value as ConceptRelationshipType;
}

export interface CreateConceptInput { name: string; definition: string; sourceIds?: string[] }
export interface UpdateConceptInput { name?: string; definition?: string; sourceIds?: string[] }
export interface CreatePersonInput { name: string; bio?: string }
export interface CreateTermInput { name: string; definition: string }
export interface CreateSourceInput { title: string; type: string; url?: string }
export interface CreateTopicClusterInput { name: string; description?: string }

export function getGraphAuthContext(context: import('../auth/auth.middleware').GraphQLContext) {
  if (!context.authContext || !context.authContext.userId || !context.authContext.tenantId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: context.authContext.tenantId,
    userId: context.authContext.userId,
    role: context.authContext.roles[0] || 'STUDENT',
  };
}
