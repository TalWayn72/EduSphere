/**
 * ExamBlueprintBuilderPage — create/edit an exam blueprint with distribution editors.
 * Route: /courses/:courseId/exams/blueprints/new | .../blueprints/:blueprintId
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { PageShell } from '@/components/PageShell';
import { PageHeader } from '@/components/PageHeader';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  useExamBlueprint,
  useCreateExamBlueprint,
  useUpdateExamBlueprint,
} from '@/hooks/useExamApi';
import { BlueprintBasicFields } from './BlueprintBasicFields';
import { BlueprintDistributions } from './BlueprintDistributions';
import { BlueprintCatSettings } from './BlueprintCatSettings';
import { blueprintSchema, type BlueprintFormData } from './blueprint-schema';
import type { BloomLevel } from '@/types/exam';
import type { DistributionItem } from '@/components/exam/BlueprintDistributionEditor';

interface DomainDistEntry {
  domain: string;
  weight: number;
  minPercent: number;
  maxPercent: number;
}

interface BloomDistEntry {
  level: string;
  minPercent: number;
  maxPercent: number;
}

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

const DEFAULT_BLOOM: DistributionItem[] = [
  { label: 'REMEMBER', weight: 15, minPercent: 10, maxPercent: 25 },
  { label: 'UNDERSTAND', weight: 20, minPercent: 15, maxPercent: 30 },
  { label: 'APPLY', weight: 25, minPercent: 15, maxPercent: 35 },
  { label: 'ANALYZE', weight: 20, minPercent: 10, maxPercent: 30 },
  { label: 'EVALUATE', weight: 15, minPercent: 5, maxPercent: 25 },
  { label: 'CREATE', weight: 5, minPercent: 0, maxPercent: 15 },
];

export function ExamBlueprintBuilderPage() {
  const { courseId, blueprintId } = useParams<{
    courseId: string;
    blueprintId: string;
  }>();
  const navigate = useNavigate();
  const role = useAuthRole();
  const isEdit = Boolean(blueprintId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { blueprint, fetching } = useExamBlueprint(blueprintId);
  const createBlueprint = useCreateExamBlueprint();
  const updateBlueprint = useUpdateExamBlueprint();

  const [domainDist, setDomainDist] = useState<DistributionItem[]>([]);
  const [bloomDist, setBloomDist] = useState<DistributionItem[]>(DEFAULT_BLOOM);
  const [enableCat, setEnableCat] = useState(false);

  const form = useForm<BlueprintFormData>({
    resolver: zodResolver(blueprintSchema),
    defaultValues: {
      title: '',
      description: '',
      totalItems: 50,
      timeLimitMinutes: 90,
      passingMethod: 'PERCENTAGE',
      passingThreshold: 700,
      status: 'DRAFT',
      catMinItems: 20,
      catMaxItems: 60,
      catSeCutoff: 0.3,
      catStartTheta: 0,
      catExposureControl: 0.8,
      minB: -3,
      maxB: 3,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (!blueprint) return;
    form.reset({
      title: blueprint.title,
      description: blueprint.description ?? '',
      totalItems: blueprint.totalQuestions,
      timeLimitMinutes: blueprint.timeLimitMinutes,
      passingMethod: blueprint.passingMethod,
      passingThreshold: blueprint.passingScore,
      status: blueprint.status,
      catMinItems: blueprint.catMinItems ?? 20,
      catMaxItems: blueprint.catMaxItems ?? 60,
      catSeCutoff: 0.3,
      catStartTheta: 0,
      catExposureControl: 0.8,
      minB: -3,
      maxB: 3,
    });
    setEnableCat(blueprint.isAdaptive);
    const domains = blueprint.domainDistribution as
      | DomainDistEntry[]
      | undefined;
    if (domains?.length) {
      setDomainDist(
        domains.map((d) => ({
          label: d.domain,
          weight: d.weight,
          minPercent: d.minPercent,
          maxPercent: d.maxPercent,
        }))
      );
    }
    const blooms = blueprint.bloomDistribution as BloomDistEntry[] | undefined;
    if (blooms?.length) {
      setBloomDist(
        blooms.map((b) => ({
          label: b.level,
          weight: b.minPercent,
          minPercent: b.minPercent,
          maxPercent: b.maxPercent,
        }))
      );
    }
  }, [blueprint, form]);

  if (mounted && role && !ALLOWED_ROLES.has(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: BlueprintFormData) => {
    const input = {
      courseId: courseId ?? '',
      title: data.title,
      description: data.description || undefined,
      totalQuestions: data.totalItems,
      timeLimitMinutes: data.timeLimitMinutes,
      passingMethod: data.passingMethod,
      passingScore: data.passingThreshold,
      domainDistribution: domainDist.map((d) => ({
        domain: d.label,
        weight: d.weight,
        minPercent: d.minPercent,
        maxPercent: d.maxPercent,
      })),
      bloomDistribution: bloomDist.map((b) => ({
        level: b.label as BloomLevel,
        minPercent: b.minPercent,
        maxPercent: b.maxPercent,
      })),
      isAdaptive: enableCat,
      ...(enableCat
        ? {
            catMinItems: data.catMinItems,
            catMaxItems: data.catMaxItems,
          }
        : {}),
    };

    if (isEdit && blueprintId) {
      const result = await updateBlueprint(blueprintId, {
        ...input,
        status: data.status,
      });
      if (result.error) {
        toast.error('Failed to update blueprint');
        return;
      }
      toast.success('Blueprint updated');
    } else {
      const result = await createBlueprint(input as never);
      if (result.error) {
        toast.error('Failed to create blueprint');
        return;
      }
      toast.success('Blueprint created');
    }
    void navigate(`/courses/${courseId}/exams/blueprints`);
  };

  return (
    <Layout>
      <PageShell size="full">
        <PageHeader title={isEdit ? 'Edit Blueprint' : 'Create Blueprint'} />
        <div className="container mx-auto p-6 max-w-3xl space-y-6">
          {fetching && <p className="text-muted-foreground">Loading...</p>}
          <BlueprintBasicFields
            form={form}
            isEdit={isEdit}
            onSubmit={onSubmit}
          />
          <BlueprintDistributions
            domainDist={domainDist}
            onDomainChange={setDomainDist}
            bloomDist={bloomDist}
            onBloomChange={setBloomDist}
          />
          <BlueprintCatSettings
            form={form}
            enableCat={enableCat}
            onEnableCatChange={setEnableCat}
          />
        </div>
      </PageShell>
    </Layout>
  );
}
