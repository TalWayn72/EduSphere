/**
 * Shared portal builder types — F-037
 */

export const ALLOWED_BLOCK_TYPES = [
  'HeroBanner',
  'FeaturedCourses',
  'StatWidget',
  'TextBlock',
  'ImageBlock',
  'CTAButton',
] as const;

export type BlockType = (typeof ALLOWED_BLOCK_TYPES)[number];

export interface PortalBlock {
  id: string;
  type: BlockType;
  order: number;
  config: Record<string, unknown>;
}
