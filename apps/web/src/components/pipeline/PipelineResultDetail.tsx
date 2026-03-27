/**
 * PipelineResultDetail — tabbed dialog for viewing a single pipeline module output.
 * Tabs: Summary | Diagram | QA Score | Raw JSON
 */
import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface PipelineResultData {
  id: string;
  moduleName: string;
  outputType: string;
  outputData?: Record<string, unknown> | null;
  fileUrl?: string | null;
}

interface Props {
  result: PipelineResultData | null;
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export function PipelineResultDetail({ result, open, onClose, isLoading }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle data-testid="result-detail-title">
            {result?.moduleName ?? 'תוצאת מודול'}
          </DialogTitle>
          <DialogDescription className="sr-only">Pipeline module output details</DialogDescription>
        </DialogHeader>
        {isLoading ? <LoadingSkeleton /> : result ? <ResultTabs result={result} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4" data-testid="result-detail-skeleton">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function ResultTabs({ result }: { result: PipelineResultData }) {
  const data = result.outputData ?? {};
  const summary = extractString(data, 'shortSummary') ?? extractString(data, 'outputSummary');
  const outputMarkdown = extractString(data, 'outputMarkdown');
  const rawMermaidSvg = extractString(data, 'mermaidSvg') ?? extractString(data, 'diagramSvg');
  const qaScore = typeof data['qaScore'] === 'number' ? (data['qaScore'] as number) : null;

  // Security: sanitize SVG to prevent XSS via injected <script>, event handlers, etc.
  const mermaidSvg = useMemo(
    () => (rawMermaidSvg ? DOMPurify.sanitize(rawMermaidSvg, { USE_PROFILES: { svg: true, html: true } }) : null),
    [rawMermaidSvg],
  );

  const hasDiagram = Boolean(mermaidSvg);
  const hasQa = qaScore !== null;

  return (
    <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col" dir="rtl">
      <TabsList className="shrink-0">
        <TabsTrigger value="summary" data-testid="tab-summary">סיכום</TabsTrigger>
        {hasDiagram && <TabsTrigger value="diagram" data-testid="tab-diagram">תרשים</TabsTrigger>}
        {hasQa && <TabsTrigger value="qa" data-testid="tab-qa">ציון איכות</TabsTrigger>}
        <TabsTrigger value="raw" data-testid="tab-raw">JSON גולמי</TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="flex-1 overflow-y-auto p-4">
        <SummaryTab summary={summary} markdown={outputMarkdown} />
      </TabsContent>

      {hasDiagram && (
        <TabsContent value="diagram" className="flex-1 overflow-auto p-4">
          <div
            className="w-full overflow-auto"
            data-testid="diagram-container"
            dangerouslySetInnerHTML={{ __html: mermaidSvg ?? '' }}
          />
        </TabsContent>
      )}

      {hasQa && (
        <TabsContent value="qa" className="flex-1 overflow-y-auto p-4 flex justify-center items-start pt-8">
          <QaScoreDonut score={qaScore} />
        </TabsContent>
      )}

      <TabsContent value="raw" className="flex-1 overflow-y-auto p-4">
        <RawJsonTab data={data} />
      </TabsContent>
    </Tabs>
  );
}

function SummaryTab({ summary, markdown }: { summary: string | null; markdown: string | null }) {
  const text = summary ?? markdown ?? 'אין סיכום זמין';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={handleCopy} data-testid="copy-summary-btn">
          {copied ? 'הועתק!' : 'העתק'}
        </Button>
      </div>
      <div className="prose prose-sm max-w-none text-right leading-relaxed whitespace-pre-line" dir="rtl" data-testid="summary-content">
        {text}
      </div>
    </div>
  );
}

function QaScoreDonut({ score }: { score: number }) {
  const radius = 60;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-3" data-testid="qa-score-donut">
      <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx="80" cy="80" r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <span className="text-3xl font-bold" style={{ color }}>{score}%</span>
      <span className="text-sm text-muted-foreground">ציון איכות</span>
    </div>
  );
}

function RawJsonTab({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={handleCopy} data-testid="copy-json-btn">
          {copied ? 'הועתק!' : 'העתק JSON'}
        </Button>
      </div>
      <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap" dir="ltr" data-testid="raw-json">
        {json}
      </pre>
    </div>
  );
}

function extractString(data: Record<string, unknown>, key: string): string | null {
  const val = data[key];
  return typeof val === 'string' ? val : null;
}
