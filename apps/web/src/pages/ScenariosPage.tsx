/**
 * ScenariosPage — F-007 scenario browser.
 * Route: /scenarios
 *
 * Displays a grid of available role-play scenarios.
 * Instructors can create custom scenarios.
 */
import { useState } from 'react';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  HeartPulse,
  BarChart3,
  Users,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { RoleplaySimulator } from '@/components/RoleplaySimulator';
import { SCENARIO_TEMPLATES_QUERY } from '@/lib/graphql/roleplay.queries';

interface ScenarioTemplate {
  id: string;
  title: string;
  domain: string;
  difficultyLevel: string;
  sceneDescription: string;
  maxTurns: number;
  isBuiltin: boolean;
}

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  sales: <BarChart3 className="h-5 w-5" />,
  customer_service: <Briefcase className="h-5 w-5" />,
  healthcare: <HeartPulse className="h-5 w-5" />,
  management: <Users className="h-5 w-5" />,
};

const DOMAIN_COLORS: Record<string, string> = {
  sales: 'text-blue-500 bg-blue-50',
  customer_service: 'text-purple-500 bg-purple-50',
  healthcare: 'text-red-500 bg-red-50',
  management: 'text-amber-500 bg-amber-50',
};

const DIFFICULTY_BADGES: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-800 border-green-200',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ADVANCED: 'bg-red-100 text-red-800 border-red-200',
};

export function ScenariosPage() {
  const [activeScenario, setActiveScenario] = useState<ScenarioTemplate | null>(
    null
  );

  const [result] = useQuery({ query: SCENARIO_TEMPLATES_QUERY, pause: true }); // scenarioTemplates not in live gateway

  const scenarios: ScenarioTemplate[] =
    (result.data?.scenarioTemplates as ScenarioTemplate[] | undefined) ?? [];

  if (activeScenario) {
    return (
      <RoleplaySimulator
        scenario={activeScenario}
        onClose={() => setActiveScenario(null)}
      />
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Role-Play Scenarios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Practice real-world conversations with AI-powered characters and
              get coaching feedback.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Create Scenario
          </Button>
        </div>

        {/* Loading state */}
        {result.fetching && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Error state */}
        {result.error && (
          <p className="text-sm text-destructive">
            Failed to load scenarios: {result.error.message}
          </p>
        )}

        {/* Scenario grid */}
        {!result.fetching && scenarios.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground text-sm">
            No scenarios available yet. Create one to get started.
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => {
            const icon = DOMAIN_ICONS[scenario.domain] ?? (
              <Briefcase className="h-5 w-5" />
            );
            const iconClass =
              DOMAIN_COLORS[scenario.domain] ?? 'text-gray-500 bg-gray-50';
            const badgeClass =
              DIFFICULTY_BADGES[scenario.difficultyLevel] ??
              'bg-gray-100 text-gray-700';
            return (
              <Card
                key={scenario.id}
                className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setActiveScenario(scenario)}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${iconClass}`}>{icon}</div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}
                  >
                    {scenario.difficultyLevel}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm leading-tight">
                    {scenario.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                    {scenario.sceneDescription}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">
                    {scenario.domain.replace('_', ' ')} · {scenario.maxTurns}{' '}
                    turns
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
