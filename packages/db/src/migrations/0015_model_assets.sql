-- Add 3D model support fields to media_assets
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS model_format TEXT; -- 'gltf' | 'glb' | 'obj' | 'fbx'
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS model_animations JSONB DEFAULT '[]'::jsonb; -- [{name, duration}]
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS poly_count INT; -- triangle count for LOD hints
