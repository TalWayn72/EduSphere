export type AnnotationLayer = 'PERSONAL' | 'SHARED' | 'INSTRUCTOR';

export interface Annotation {
  id: string;
  assetId: string;
  userId: string;
  tenantId: string;
  layer: AnnotationLayer;
  text: string;
  timestampStart: number;
  timestampEnd: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationInput {
  assetId: string;
  layer: AnnotationLayer;
  text: string;
  timestampStart: number;
  timestampEnd?: number;
}

export function createAnnotation(overrides?: Partial<Annotation>): Annotation {
  return {
    id: 'annotation-test-001',
    assetId: 'asset-test-001',
    userId: 'user-test-001',
    tenantId: 'tenant-test-001',
    layer: 'PERSONAL',
    text: 'Test annotation',
    timestampStart: 0,
    timestampEnd: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function createAnnotationInput(
  overrides?: Partial<AnnotationInput>
): AnnotationInput {
  return {
    assetId: 'asset-test-001',
    layer: 'PERSONAL',
    text: 'Test annotation',
    timestampStart: 0,
    ...overrides,
  };
}
