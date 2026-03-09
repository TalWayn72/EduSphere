import { Youtube, Globe, FolderOpen } from 'lucide-react';

type ImportSource = 'youtube' | 'website' | 'folder' | null;

interface Props {
  selected: ImportSource;
  onSelect: (source: ImportSource) => void;
}

const SOURCES = [
  {
    id: 'youtube' as const,
    icon: Youtube,
    label: 'YouTube Playlist',
    description: 'Import lessons from a public YouTube playlist via the Data API v3.',
  },
  {
    id: 'website' as const,
    icon: Globe,
    label: 'Website / Blog',
    description: 'Crawl a site and auto-extract lesson pages using Firecrawl AI.',
  },
  {
    id: 'folder' as const,
    icon: FolderOpen,
    label: 'Upload Folder / ZIP',
    description: 'Upload a local folder or ZIP archive — supports MP4, PDF, PPTX, DOCX, images.',
  },
] as const;

export function ImportSourceSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <p className="text-sm font-medium mb-3">Select import source</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SOURCES.map(({ id, icon: Icon, label, description }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(selected === id ? null : id)}
            aria-pressed={selected === id}
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
              selected === id
                ? 'border-primary bg-primary/5 ring-2 ring-primary'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-medium text-sm">{label}</span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
