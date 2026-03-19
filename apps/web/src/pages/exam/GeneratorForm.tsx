/**
 * GeneratorForm — form for configuring AI exam item generation parameters.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BloomLevel } from '@/types/exam';

const BLOOM_LEVELS: BloomLevel[] = [
  'REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE',
];

const DIFFICULTY_MAP: Record<string, number> = {
  easy: -1.0,
  medium: 0.0,
  hard: 1.5,
};

interface CourseModule {
  id: string;
  title: string;
  orderIndex: number;
}

interface GeneratorFormProps {
  modules: CourseModule[];
  loading: boolean;
  onGenerate: (input: {
    moduleId?: string;
    domain: string;
    bloomLevel: BloomLevel;
    count: number;
    targetDifficulty: number;
  }) => Promise<void>;
}

export function GeneratorForm({ modules, loading, onGenerate }: GeneratorFormProps) {
  const [moduleId, setModuleId] = useState<string>('');
  const [domain, setDomain] = useState('');
  const [bloomLevel, setBloomLevel] = useState<BloomLevel>('APPLY');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onGenerate({
      moduleId: moduleId || undefined,
      domain,
      bloomLevel,
      count,
      targetDifficulty: DIFFICULTY_MAP[difficulty] ?? 0,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Generation Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="gen-module">Module (optional)</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger id="gen-module">
                <SelectValue placeholder="Select module..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Module</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gen-domain">Domain Tag</Label>
            <Input
              id="gen-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. Data Structures"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Bloom Level</Label>
            <Select value={bloomLevel} onValueChange={(v) => setBloomLevel(v as BloomLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLOOM_LEVELS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Count: {count}</Label>
            <Slider
              value={[count]}
              onValueChange={([v]) => setCount(v ?? 10)}
              min={1}
              max={50}
              step={1}
              aria-label="Number of items to generate"
            />
          </div>

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading || !domain.trim()} className="w-full">
            {loading ? 'Generating...' : 'Generate Items'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
