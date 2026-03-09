/**
 * Seed data for the skills taxonomy — Phase 44
 * 20 sample skills across Programming, Frontend, Database, API Design,
 * DevOps, Quality, Computer Science, and Soft Skills categories.
 */

export type SeedSkill = {
  slug: string;
  name: string;
  description?: string;
  category: string;
  level: number;
  parentSkillSlug?: string;
};

export const SAMPLE_SKILLS: SeedSkill[] = [
  // ---------- Programming ----------
  {
    slug: 'javascript-fundamentals',
    name: 'JavaScript Fundamentals',
    description: 'Variables, types, control flow, functions, and ES6+ syntax',
    category: 'Programming',
    level: 1,
  },
  {
    slug: 'javascript-closures',
    name: 'JavaScript Closures',
    description:
      'Lexical scoping, closure patterns, IIFE, and memory implications',
    category: 'Programming',
    level: 2,
    parentSkillSlug: 'javascript-fundamentals',
  },
  {
    slug: 'typescript-basics',
    name: 'TypeScript Basics',
    description: 'Static typing, interfaces, enums, and tsconfig',
    category: 'Programming',
    level: 2,
    parentSkillSlug: 'javascript-fundamentals',
  },
  {
    slug: 'typescript-generics',
    name: 'TypeScript Generics',
    description:
      'Generic functions, constrained generics, conditional types, and utility types',
    category: 'Programming',
    level: 3,
    parentSkillSlug: 'typescript-basics',
  },

  // ---------- Frontend ----------
  {
    slug: 'react-fundamentals',
    name: 'React Fundamentals',
    description: 'Components, JSX, props, state, and the virtual DOM',
    category: 'Frontend',
    level: 1,
  },
  {
    slug: 'react-hooks',
    name: 'React Hooks',
    description:
      'useState, useEffect, useRef, useCallback, useMemo, and custom hooks',
    category: 'Frontend',
    level: 2,
    parentSkillSlug: 'react-fundamentals',
  },
  {
    slug: 'react-performance',
    name: 'React Performance Optimisation',
    description: 'Memoisation, code splitting, Suspense, and profiling',
    category: 'Frontend',
    level: 3,
    parentSkillSlug: 'react-hooks',
  },

  // ---------- API Design ----------
  {
    slug: 'rest-apis',
    name: 'REST API Design',
    description:
      'HTTP verbs, status codes, resource naming, pagination, and versioning',
    category: 'API Design',
    level: 2,
  },
  {
    slug: 'graphql-queries',
    name: 'GraphQL Queries',
    description: 'Schema, queries, mutations, variables, and fragments',
    category: 'API Design',
    level: 2,
  },
  {
    slug: 'graphql-federation',
    name: 'GraphQL Federation',
    description: 'Subgraph design, entity references, and gateway composition',
    category: 'API Design',
    level: 4,
    parentSkillSlug: 'graphql-queries',
  },

  // ---------- Database ----------
  {
    slug: 'sql-fundamentals',
    name: 'SQL Fundamentals',
    description: 'SELECT, JOIN, GROUP BY, subqueries, and indexes',
    category: 'Database',
    level: 1,
  },
  {
    slug: 'postgresql-rls',
    name: 'PostgreSQL Row Level Security',
    description:
      'RLS policies, USING/WITH CHECK clauses, and multi-tenant isolation patterns',
    category: 'Database',
    level: 3,
    parentSkillSlug: 'sql-fundamentals',
  },
  {
    slug: 'database-indexing',
    name: 'Database Indexing Strategies',
    description: 'B-tree, HNSW, GIN, partial indexes, and EXPLAIN ANALYZE',
    category: 'Database',
    level: 3,
    parentSkillSlug: 'sql-fundamentals',
  },

  // ---------- DevOps ----------
  {
    slug: 'docker-compose',
    name: 'Docker Compose',
    description:
      'Multi-service orchestration, volumes, networks, and health checks',
    category: 'DevOps',
    level: 2,
  },
  {
    slug: 'ci-cd-pipelines',
    name: 'CI/CD Pipelines',
    description: 'GitHub Actions workflows, stages, caching, and deployment gates',
    category: 'DevOps',
    level: 3,
    parentSkillSlug: 'docker-compose',
  },

  // ---------- Quality ----------
  {
    slug: 'unit-testing',
    name: 'Unit Testing',
    description: 'Test structure, mocking, assertions, and coverage targets',
    category: 'Quality',
    level: 2,
  },
  {
    slug: 'e2e-testing',
    name: 'End-to-End Testing',
    description: 'Playwright, browser automation, visual regression, and CI integration',
    category: 'Quality',
    level: 3,
    parentSkillSlug: 'unit-testing',
  },

  // ---------- Computer Science ----------
  {
    slug: 'data-structures',
    name: 'Data Structures & Algorithms',
    description:
      'Arrays, linked lists, trees, graphs, sorting, and time/space complexity',
    category: 'Computer Science',
    level: 3,
  },

  // ---------- Soft Skills ----------
  {
    slug: 'agile-scrum',
    name: 'Agile / Scrum',
    description:
      'Sprint planning, daily standups, retrospectives, and velocity tracking',
    category: 'Soft Skills',
    level: 1,
  },
  {
    slug: 'technical-communication',
    name: 'Technical Communication',
    description:
      'Writing docs, ADRs, PRDs, and presenting technical concepts clearly',
    category: 'Soft Skills',
    level: 2,
  },
];

/** Prerequisite edges: [skillSlug, prerequisiteSlug] */
export const SAMPLE_PREREQUISITES: [string, string][] = [
  ['javascript-closures', 'javascript-fundamentals'],
  ['typescript-basics', 'javascript-fundamentals'],
  ['typescript-generics', 'typescript-basics'],
  ['react-hooks', 'react-fundamentals'],
  ['react-performance', 'react-hooks'],
  ['graphql-federation', 'graphql-queries'],
  ['postgresql-rls', 'sql-fundamentals'],
  ['database-indexing', 'sql-fundamentals'],
  ['ci-cd-pipelines', 'docker-compose'],
  ['e2e-testing', 'unit-testing'],
];
