/**
 * ItemBankTable — sortable, paginated data table for the exam item bank.
 * Supports row selection for bulk operations.
 */
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { ExamItem } from '@/types/exam-entities';
import type { CalibrationStatus, BloomLevel } from '@/types/exam';
import { ItemBankPagination } from './ItemBankPagination';

const STATUS_COLORS: Record<CalibrationStatus, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  PILOT: 'bg-blue-100 text-blue-800',
  CALIBRATED: 'bg-green-100 text-green-800',
  RETIRED: 'bg-gray-100 text-gray-500',
};

const BLOOM_COLORS: Record<BloomLevel, string> = {
  REMEMBER: 'bg-slate-100 text-slate-700',
  UNDERSTAND: 'bg-sky-100 text-sky-700',
  APPLY: 'bg-indigo-100 text-indigo-700',
  ANALYZE: 'bg-violet-100 text-violet-700',
  EVALUATE: 'bg-amber-100 text-amber-700',
  CREATE: 'bg-rose-100 text-rose-700',
};

interface ItemBankTableProps {
  items: ExamItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  selectedIds: Set<string>;
  onPageChange: (page: number) => void;
  onSelect: (ids: Set<string>) => void;
  onRowClick: (item: ExamItem) => void;
}

function extractQuestionText(item: ExamItem): string {
  const qd = item.questionData;
  const text = typeof qd === 'object' && qd !== null && 'question' in qd
    ? (qd as { question: string }).question
    : '';
  return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

export function ItemBankTable({
  items, totalCount, page, pageSize,
  selectedIds, onPageChange, onSelect, onRowClick,
}: ItemBankTableProps) {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelect(new Set());
    } else {
      onSelect(new Set(items.map((i) => i.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelect(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Bloom</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">IRT b</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(item)}
                data-testid={`item-row-${item.id}`}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleOne(item.id)}
                    aria-label={`Select item ${item.id}`}
                  />
                </TableCell>
                <TableCell className="max-w-[280px] truncate font-medium">
                  {extractQuestionText(item)}
                </TableCell>
                <TableCell>{item.domainTag}</TableCell>
                <TableCell>
                  <Badge className={BLOOM_COLORS[item.bloomLevel]}>{item.bloomLevel}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[item.calibrationStatus]}>
                    {item.calibrationStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.source}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {item.irtB != null ? item.irtB.toFixed(2) : '—'}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No items found. Create or generate items to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <ItemBankPagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}
