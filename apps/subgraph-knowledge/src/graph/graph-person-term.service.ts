/**
 * GraphPersonTermService — Person and Term graph operations.
 * Wraps CypherPersonService / CypherTermService calls inside withTenantContext (RLS enforcement).
 *
 * Source, TopicCluster, and Learning Path operations live in GraphSourceClusterService.
 */
import { Injectable } from '@nestjs/common';
import { db, withTenantContext } from '@edusphere/db';
import { CypherPersonService } from './cypher-person.service';
import { CypherTermService } from './cypher-term.service';
import { toUserRole } from './graph-types';

@Injectable()
export class GraphPersonTermService {
  constructor(
    private readonly person: CypherPersonService,
    private readonly term: CypherTermService
  ) {}

  // ── Person ─────────────────────────────────────────────────────────────────
  async findPersonById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.person.findPersonById(id, tenantId)
    );
  }

  async findPersonByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.person.findPersonByName(name, tenantId)
    );
  }

  async createPerson(
    name: string,
    bio: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.person.createPerson(name, bio, tenantId)
    );
  }

  // ── Term ───────────────────────────────────────────────────────────────────
  async findTermById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.term.findTermById(id, tenantId)
    );
  }

  async findTermByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.term.findTermByName(name, tenantId)
    );
  }

  async createTerm(
    name: string,
    definition: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => this.term.createTerm(name, definition, tenantId)
    );
  }
}
