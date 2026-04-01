/**
 * ItemBankFilters — filter bar for domain, bloom level, status, source.
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  BloomLevel,
  CalibrationStatus,
  ExamItemSource,
} from '@/types/exam';

const BLOOM_LEVELS: BloomLevel[] = [
  'REMEMBER',
  'UNDERSTAND',
  'APPLY',
  'ANALYZE',
  'EVALUATE',
  'CREATE',
];

const STATUSES: CalibrationStatus[] = [
  'DRAFT',
  'PILOT',
  'CALIBRATED',
  'RETIRED',
];
const SOURCES: ExamItemSource[] = ['MANUAL', 'AI_GENERATED', 'IMPORTED'];

interface Filters {
  domainTag?: string;
  bloomLevel?: BloomLevel;
  calibrationStatus?: CalibrationStatus;
  source?: ExamItemSource;
}

interface ItemBankFiltersProps {
  domains: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function ItemBankFilters({
  domains,
  filters,
  onChange,
}: ItemBankFiltersProps) {
  const update = (patch: Partial<Filters>) =>
    onChange({ ...filters, ...patch });

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      data-testid="item-bank-filters"
    >
      <Select
        value={filters.domainTag ?? 'ALL'}
        onValueChange={(v) =>
          update({ domainTag: v === 'ALL' ? undefined : v })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Domain" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Domains</SelectItem>
          {domains.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.bloomLevel ?? 'ALL'}
        onValueChange={(v) =>
          update({ bloomLevel: v === 'ALL' ? undefined : (v as BloomLevel) })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Bloom Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Levels</SelectItem>
          {BLOOM_LEVELS.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.calibrationStatus ?? 'ALL'}
        onValueChange={(v) =>
          update({
            calibrationStatus:
              v === 'ALL' ? undefined : (v as CalibrationStatus),
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.source ?? 'ALL'}
        onValueChange={(v) =>
          update({ source: v === 'ALL' ? undefined : (v as ExamItemSource) })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Sources</SelectItem>
          {SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
