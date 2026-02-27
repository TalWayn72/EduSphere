import { useState } from 'react';
import { useQuery, useMutation } from 'urql';
import { Link } from 'react-router-dom';
import { BarChart3, ChevronDown, BookOpen, PlusCircle } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  SKILL_GAP_ANALYSIS_QUERY,
  SKILL_PROFILES_QUERY,
  CREATE_SKILL_PROFILE_MUTATION,
} from '@/lib/graphql/knowledge-tier3.queries';

interface SkillProfile {
  id: string;
  roleName: string;
  description: string | null;
  requiredConceptsCount: number;
}
interface SkillGapItem {
  conceptName: string;
  isMastered: boolean;
  recommendedContentTitles: string[];
}
interface SkillGapReport {
  roleId: string;
  roleName: string;
  totalRequired: number;
  mastered: number;
  gapCount: number;
  completionPercentage: number;
  gaps: SkillGapItem[];
}

const MAX_VISIBLE_GAPS = 5;

export function SkillGapWidget() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newConcepts, setNewConcepts] = useState('');

  const [{ data: profilesData, fetching: profilesFetching }] = useQuery<{
    skillProfiles: SkillProfile[];
  }>({ query: SKILL_PROFILES_QUERY, pause: true }); // skillProfiles not in live gateway

  const [{ data: reportData, fetching: reportFetching }] = useQuery<{
    skillGapAnalysis: SkillGapReport;
  }>({
    query: SKILL_GAP_ANALYSIS_QUERY,
    variables: { roleId: selectedRoleId },
    pause: !selectedRoleId,
  });

  const [, createProfile] = useMutation(CREATE_SKILL_PROFILE_MUTATION);

  const profiles = profilesData?.skillProfiles ?? [];
  const report = reportData?.skillGapAnalysis;

  const handleCreate = async () => {
    if (!newRole.trim() || !newConcepts.trim()) return;
    const concepts = newConcepts
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    await createProfile({
      roleName: newRole.trim(),
      description: null,
      requiredConcepts: concepts,
    });
    setNewRole('');
    setNewConcepts('');
    setCreateOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Skill Gap Analysis
            </CardTitle>
            <CardDescription className="mt-1">
              Compare your knowledge against a role profile
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            New Profile
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {profilesFetching && (
            <p className="text-sm text-muted-foreground">Loading profiles...</p>
          )}

          {!profilesFetching && profiles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No skill profiles yet. Create one to see your gap analysis.
            </p>
          )}

          {profiles.length > 0 && (
            <Select
              value={selectedRoleId ?? ''}
              onValueChange={(v) => setSelectedRoleId(v || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role to analyze…" />
                <ChevronDown className="h-4 w-4 opacity-50" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.roleName} ({p.requiredConceptsCount} concepts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {reportFetching && (
            <p className="text-sm text-muted-foreground">Analyzing…</p>
          )}

          {report && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{report.roleName}</span>
                  <span className="text-muted-foreground">
                    {report.mastered}/{report.totalRequired} mastered
                  </span>
                </div>
                <Progress value={report.completionPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {report.completionPercentage}% complete · {report.gapCount}{' '}
                  gaps remaining
                </p>
              </div>

              {report.gaps.length > 0 && (
                <ul className="space-y-2">
                  {report.gaps.slice(0, MAX_VISIBLE_GAPS).map((gap) => (
                    <li
                      key={gap.conceptName}
                      className="border rounded-md p-2.5"
                    >
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                        {gap.conceptName}
                      </p>
                      {gap.recommendedContentTitles.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Recommended: {gap.recommendedContentTitles.join(', ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {report.gapCount === 0 && (
                <p className="text-sm text-emerald-600 font-medium">
                  All required skills mastered for this role!
                </p>
              )}

              <Link
                to={`/knowledge/skill-gap/${report.roleId}`}
                className="mt-1 inline-flex text-xs text-primary hover:underline"
              >
                View full analysis →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Skill Profile</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Input
              placeholder="Role name (e.g. Backend Engineer)"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Required concepts, comma-separated"
              value={newConcepts}
              onChange={(e) => setNewConcepts(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <p className="text-xs text-muted-foreground">
              Example: Graph Theory, SQL, REST APIs, Docker
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newRole.trim() || !newConcepts.trim()}
            >
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
