/**
 * SkillPathCard — displays a single skill path with progress bar and gap analysis toggle.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown, ChevronUp, Target } from 'lucide-react';

interface SkillPath {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  skillIds: string[];
  estimatedHours: number;
  isPublished: boolean;
}

interface LearnerSkillProgress {
  skillId: string;
  masteryLevel: string;
  evidenceCount: number;
  lastActivityAt: string | null;
}

interface SkillPathCardProps {
  path: SkillPath;
  progress: LearnerSkillProgress[];
}

const MASTERED_LEVELS = new Set(['PROFICIENT', 'EXPERT', 'MASTER']);

export function SkillPathCard({ path, progress }: SkillPathCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const masteredIds = new Set(
    progress
      .filter((p) => MASTERED_LEVELS.has(p.masteryLevel))
      .map((p) => p.skillId),
  );

  const totalSkills = path.skillIds.length;
  const masteredCount = path.skillIds.filter((id) => masteredIds.has(id)).length;
  const completionPct =
    totalSkills > 0 ? Math.round((masteredCount / totalSkills) * 100) : 0;

  return (
    <Card className="flex flex-col" data-testid="skill-path-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{path.title}</CardTitle>
          {path.targetRole && (
            <Badge variant="secondary" className="shrink-0">
              {path.targetRole}
            </Badge>
          )}
        </div>
        {path.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{path.description}</p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pt-0">
        {/* Estimated hours */}
        {path.estimatedHours > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden />
            <span>{path.estimatedHours}h estimated</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {masteredCount} / {totalSkills} skills mastered
            </span>
            <span className="font-medium">{completionPct}%</span>
          </div>
          <Progress value={completionPct} className="h-2" aria-label="Skill path completion" />
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => navigate(`/skills/gap/${path.id}`)}
          >
            <Target className="h-3.5 w-3.5" aria-hidden />
            Gap Analysis
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="px-2"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>

        {/* Expanded inline preview */}
        {expanded && (
          <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
              Skills in this path
            </p>
            {path.skillIds.length === 0 ? (
              <p className="text-muted-foreground text-xs">No skills defined yet.</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                {path.skillIds.length} skill{path.skillIds.length !== 1 ? 's' : ''} — open Gap
                Analysis for details.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
