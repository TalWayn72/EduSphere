/**
 * ExamItemBankPage — instructor view for managing certification exam items.
 * Route: /courses/:courseId/exams/items
 */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useExamItemBank, useRetireExamItem } from '@/hooks/useExamApi';
import { ItemBankTable } from '@/components/exam/ItemBankTable';
import { ItemBankFilters } from '@/components/exam/ItemBankFilters';
import type { ExamItem } from '@/types/exam-entities';
import type {
  BloomLevel,
  CalibrationStatus,
  ExamItemSource,
} from '@/types/exam';
import { toast } from 'sonner';

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);
const PAGE_SIZE = 20;

interface Filters {
  domainTag?: string;
  bloomLevel?: BloomLevel;
  calibrationStatus?: CalibrationStatus;
  source?: ExamItemSource;
}

export function ExamItemBankPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const role = useAuthRole();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { items, totalCount, fetching } = useExamItemBank(
    courseId ?? '',
    filters,
    PAGE_SIZE
  );
  const retireItem = useRetireExamItem();

  // Derive unique domains from the current item set for filter dropdown
  const domains = useMemo(
    () => [...new Set(items.map((i) => i.domainTag))].sort(),
    [items]
  );

  if (mounted && role && !ALLOWED_ROLES.has(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRowClick = (item: ExamItem) => {
    void navigate(`/courses/${courseId}/exams/items/${item.id}`);
  };

  const handleRetireSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    for (const id of ids) {
      await retireItem(id);
    }
    setSelectedIds(new Set());
    toast.success(`Retired ${ids.length} item(s)`);
  };

  return (
    <Layout>
      <PageShell size="full">
        <PageHeader title="Exam Item Bank" />
        <div className="container mx-auto p-6 space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ItemBankFilters
              domains={domains}
              filters={filters}
              onChange={setFilters}
            />
            <div className="flex gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleRetireSelected();
                  }}
                  data-testid="retire-selected-btn"
                >
                  Retire ({selectedIds.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void navigate(`/courses/${courseId}/exams/generate`)
                }
                data-testid="ai-generate-btn"
              >
                AI Generate
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  void navigate(`/courses/${courseId}/exams/items/new`)
                }
                data-testid="add-item-btn"
              >
                Add Item
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {fetching && (
            <p className="text-sm text-muted-foreground">Loading items...</p>
          )}

          {/* Data table */}
          <ItemBankTable
            items={items}
            totalCount={totalCount}
            page={page}
            pageSize={PAGE_SIZE}
            selectedIds={selectedIds}
            onPageChange={setPage}
            onSelect={setSelectedIds}
            onRowClick={handleRowClick}
          />
        </div>
      </PageShell>
    </Layout>
  );
}
