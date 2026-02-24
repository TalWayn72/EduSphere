export interface ConceptNode {
  id: string;
  tenantId: string;
  name: string;
  definition: string;
  sourceIds: string[];
  createdAt: Date;
}

export interface TermNode {
  id: string;
  tenantId: string;
  name: string;
  definition: string;
  createdAt: Date;
}

export interface PersonNode {
  id: string;
  tenantId: string;
  name: string;
  bio: string | null;
  createdAt: Date;
}

export function createConcept(overrides?: Partial<ConceptNode>): ConceptNode {
  return {
    id: 'concept-test-001',
    tenantId: 'tenant-test-001',
    name: 'Test Concept',
    definition: 'A concept used for unit testing purposes',
    sourceIds: [],
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function createTerm(overrides?: Partial<TermNode>): TermNode {
  return {
    id: 'term-test-001',
    tenantId: 'tenant-test-001',
    name: 'Test Term',
    definition: 'A term used for unit testing purposes',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function createPerson(overrides?: Partial<PersonNode>): PersonNode {
  return {
    id: 'person-test-001',
    tenantId: 'tenant-test-001',
    name: 'Test Person',
    bio: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
