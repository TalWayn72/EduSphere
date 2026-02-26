/**
 * BlockRenderer — renders a preview of each portal block type.
 * Used in CanvasDropZone (builder) and PortalPage (viewer).
 */
import type { PortalBlock } from '../types';

interface Props {
  block: PortalBlock;
}

function HeroBannerPreview({ config }: { config: Record<string, unknown> }) {
  const title =
    (config['title'] as string | undefined) ??
    'Welcome to Your Learning Portal';
  const subtitle =
    (config['subtitle'] as string | undefined) ?? 'Start learning today';
  const ctaText = (config['ctaText'] as string | undefined) ?? 'Get Started';

  return (
    <div className="relative bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-10 rounded-t-xl">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-sm opacity-80 mb-4">{subtitle}</p>
      <button className="bg-white text-primary text-sm font-medium px-4 py-2 rounded-lg">
        {ctaText}
      </button>
    </div>
  );
}

function FeaturedCoursesPreview({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = (config['title'] as string | undefined) ?? 'Featured Courses';
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-24 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground"
          >
            Course {n}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatWidgetPreview() {
  return (
    <div className="p-6 grid grid-cols-3 gap-4">
      {[
        { label: 'Completions', value: '1,248' },
        { label: 'Learners', value: '3,420' },
        { label: 'Courses', value: '86' },
      ].map((stat) => (
        <div key={stat.label} className="text-center p-4 bg-muted rounded-lg">
          <p className="text-2xl font-bold text-primary">{stat.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function TextBlockPreview({ config }: { config: Record<string, unknown> }) {
  const content =
    (config['content'] as string | undefined) ??
    'Add your text content here...';
  const alignment = (config['alignment'] as string | undefined) ?? 'left';
  const alignClass =
    alignment === 'center'
      ? 'text-center'
      : alignment === 'right'
        ? 'text-right'
        : 'text-left';
  return (
    <div className={`p-6 ${alignClass}`}>
      <p className="text-sm text-foreground">{content}</p>
    </div>
  );
}

function ImageBlockPreview({ config }: { config: Record<string, unknown> }) {
  const alt = (config['alt'] as string | undefined) ?? 'Portal image';
  const width = (config['width'] as string | undefined) ?? 'full';
  return (
    <div className={`p-4 ${width === 'half' ? 'w-1/2 mx-auto' : 'w-full'}`}>
      <div className="bg-muted rounded-lg h-32 flex items-center justify-center border-2 border-dashed">
        <span className="text-xs text-muted-foreground">{alt}</span>
      </div>
    </div>
  );
}

function CTAButtonPreview({ config }: { config: Record<string, unknown> }) {
  const text = (config['text'] as string | undefined) ?? 'Click Here';
  const variant = (config['variant'] as string | undefined) ?? 'primary';
  const btnClass =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : 'border border-primary text-primary hover:bg-primary/10';
  return (
    <div className="p-6 flex justify-center">
      <button
        className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${btnClass}`}
      >
        {text}
      </button>
    </div>
  );
}

export function BlockRenderer({ block }: Props) {
  switch (block.type) {
    case 'HeroBanner':
      return <HeroBannerPreview config={block.config} />;
    case 'FeaturedCourses':
      return <FeaturedCoursesPreview config={block.config} />;
    case 'StatWidget':
      return <StatWidgetPreview />;
    case 'TextBlock':
      return <TextBlockPreview config={block.config} />;
    case 'ImageBlock':
      return <ImageBlockPreview config={block.config} />;
    case 'CTAButton':
      return <CTAButtonPreview config={block.config} />;
    default:
      return (
        <div className="p-4 text-sm text-muted-foreground">
          Unknown block type
        </div>
      );
  }
}
