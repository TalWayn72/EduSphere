import { describe, it, expect } from 'vitest';
import {
  UPLOAD_MODEL_3D_MUTATION,
  GET_MEDIA_ASSET_MODEL_QUERY,
} from './model3d.queries';

describe('model3d.queries', () => {
  it('exports UPLOAD_MODEL_3D_MUTATION as a mutation DocumentNode', () => {
    expect(UPLOAD_MODEL_3D_MUTATION).toBeDefined();
    expect(UPLOAD_MODEL_3D_MUTATION.kind).toBe('Document');
    expect(UPLOAD_MODEL_3D_MUTATION.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = UPLOAD_MODEL_3D_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UploadModel3D');
  });

  it('exports GET_MEDIA_ASSET_MODEL_QUERY as a query DocumentNode', () => {
    expect(GET_MEDIA_ASSET_MODEL_QUERY).toBeDefined();
    expect(GET_MEDIA_ASSET_MODEL_QUERY.kind).toBe('Document');
    expect(
      GET_MEDIA_ASSET_MODEL_QUERY.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = GET_MEDIA_ASSET_MODEL_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('GetMediaAssetModel');
  });
});
