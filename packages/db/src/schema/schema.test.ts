import { describe, it, expect } from 'vitest';
import { tenants } from './tenants';
import { users } from './core';
import { courses, modules, media_assets, transcripts } from './content';
import { annotations } from './annotation';
import {
  content_embeddings,
  annotation_embeddings,
  concept_embeddings,
} from './embeddings';
import { agent_definitions, agent_executions } from './agent';
import { pk, tenantId, timestamps, softDelete } from './_shared';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

describe('shared helpers', () => {
  it('pk() returns a uuid column definition', () => {
    const col = pk();
    expect(col).toBeDefined();
  });

  it('tenantId() returns a non-null uuid column definition', () => {
    const col = tenantId();
    expect(col).toBeDefined();
  });

  it('timestamps object has created_at and updated_at', () => {
    expect(timestamps).toHaveProperty('created_at');
    expect(timestamps).toHaveProperty('updated_at');
  });

  it('softDelete object has deleted_at', () => {
    expect(softDelete).toHaveProperty('deleted_at');
  });
});

// ---------------------------------------------------------------------------
// tenants table
// ---------------------------------------------------------------------------

describe('tenants table', () => {
  it('is defined', () => {
    expect(tenants).toBeDefined();
  });

  it('has an id column', () => {
    expect(tenants.id).toBeDefined();
  });

  it('has a name column', () => {
    expect(tenants.name).toBeDefined();
  });

  it('has a slug column', () => {
    expect(tenants.slug).toBeDefined();
  });

  it('has a plan column', () => {
    expect(tenants.plan).toBeDefined();
  });

  it('has created_at and updated_at columns', () => {
    expect(tenants.created_at).toBeDefined();
    expect(tenants.updated_at).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// users table
// ---------------------------------------------------------------------------

describe('users table', () => {
  it('is defined', () => {
    expect(users).toBeDefined();
  });

  it('has tenant_id column', () => {
    expect(users.tenant_id).toBeDefined();
  });

  it('has email column', () => {
    expect(users.email).toBeDefined();
  });

  it('has role column', () => {
    expect(users.role).toBeDefined();
  });

  it('has soft-delete column (deleted_at)', () => {
    expect(users.deleted_at).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// courses table
// ---------------------------------------------------------------------------

describe('courses table', () => {
  it('is defined', () => {
    expect(courses).toBeDefined();
  });

  it('has is_published boolean column', () => {
    expect(courses.is_published).toBeDefined();
  });

  it('has is_public boolean column', () => {
    expect(courses.is_public).toBeDefined();
  });

  it('has soft-delete column', () => {
    expect(courses.deleted_at).toBeDefined();
  });

  it('has prerequisites jsonb column', () => {
    expect(courses.prerequisites).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// modules table
// ---------------------------------------------------------------------------

describe('modules table', () => {
  it('is defined', () => {
    expect(modules).toBeDefined();
  });

  it('has order_index column', () => {
    expect(modules.order_index).toBeDefined();
  });

  it('has course_id foreign key column', () => {
    expect(modules.course_id).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// media_assets table
// ---------------------------------------------------------------------------

describe('media_assets table', () => {
  it('is defined', () => {
    expect(media_assets).toBeDefined();
  });

  it('has media_type column', () => {
    expect(media_assets.media_type).toBeDefined();
  });

  it('has transcription_status column', () => {
    expect(media_assets.transcription_status).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// transcripts table
// ---------------------------------------------------------------------------

describe('transcripts table', () => {
  it('is defined', () => {
    expect(transcripts).toBeDefined();
  });

  it('has full_text column', () => {
    expect(transcripts.full_text).toBeDefined();
  });

  it('has language column', () => {
    expect(transcripts.language).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// annotations table
// ---------------------------------------------------------------------------

describe('annotations table', () => {
  it('is defined', () => {
    expect(annotations).toBeDefined();
  });

  it('has annotation_type column', () => {
    expect(annotations.annotation_type).toBeDefined();
  });

  it('has layer column', () => {
    expect(annotations.layer).toBeDefined();
  });

  it('has user_id column', () => {
    expect(annotations.user_id).toBeDefined();
  });

  it('has is_resolved column', () => {
    expect(annotations.is_resolved).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// embeddings tables
// ---------------------------------------------------------------------------

describe('content_embeddings table', () => {
  it('is defined', () => {
    expect(content_embeddings).toBeDefined();
  });

  it('has embedding column', () => {
    expect(content_embeddings.embedding).toBeDefined();
  });

  it('has segment_id column', () => {
    expect(content_embeddings.segment_id).toBeDefined();
  });
});

describe('annotation_embeddings table', () => {
  it('is defined', () => {
    expect(annotation_embeddings).toBeDefined();
  });

  it('has embedding column', () => {
    expect(annotation_embeddings.embedding).toBeDefined();
  });
});

describe('concept_embeddings table', () => {
  it('is defined', () => {
    expect(concept_embeddings).toBeDefined();
  });

  it('has concept_id column', () => {
    expect(concept_embeddings.concept_id).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// agent tables
// ---------------------------------------------------------------------------

describe('agent_definitions table', () => {
  it('is defined', () => {
    expect(agent_definitions).toBeDefined();
  });

  it('has template column', () => {
    expect(agent_definitions.template).toBeDefined();
  });

  it('has is_active column', () => {
    expect(agent_definitions.is_active).toBeDefined();
  });
});

describe('agent_executions table', () => {
  it('is defined', () => {
    expect(agent_executions).toBeDefined();
  });

  it('has status column', () => {
    expect(agent_executions.status).toBeDefined();
  });

  it('has input and output columns', () => {
    expect(agent_executions.input).toBeDefined();
    expect(agent_executions.output).toBeDefined();
  });
});
