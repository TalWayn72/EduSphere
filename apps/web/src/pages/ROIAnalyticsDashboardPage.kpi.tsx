/**
 * ROIAnalyticsDashboardPage.kpi — KPI grid + Cost-per-user sub-components.
 * Extracted for 150-line file size rule compliance.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KpiGridProps {
  yearlyActiveUsers: number;
  monthlyActiveUsers: number;
  seatUtilizationPct: number;
  plan: string;
}

export function KpiGrid({
  yearlyActiveUsers,
  monthlyActiveUsers,
  seatUtilizationPct,
  plan,
}: KpiGridProps) {
  return (
    <div
      data-testid="kpi-grid"
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
    >
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Yearly Active Users</p>
          <p
            data-testid="kpi-yau"
            className="text-2xl font-bold"
          >
            {yearlyActiveUsers.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Monthly Active Users</p>
          <p
            data-testid="kpi-mau"
            className="text-2xl font-bold"
          >
            {monthlyActiveUsers.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Seat Utilization</p>
          <p
            data-testid="kpi-utilization"
            className="text-2xl font-bold"
          >
            {seatUtilizationPct.toFixed(1)}%
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Current Plan</p>
          <p
            data-testid="kpi-plan"
            className="text-2xl font-bold"
          >
            {plan}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const PLAN_COSTS: Record<string, number> = {
  PILOT: 0,
  STARTER: 12000,
  GROWTH: 32000,
  UNIVERSITY: 65000,
  ENTERPRISE: -1, // -1 signals custom pricing
};

interface CostPerUserProps {
  plan: string;
  yearlyActiveUsers: number;
}

export function CostPerUser({ plan, yearlyActiveUsers }: CostPerUserProps) {
  const planCost = PLAN_COSTS[plan] ?? -1;
  const isCustom = planCost === -1 || plan === 'ENTERPRISE';
  const showContactPricing = isCustom || planCost === 0;

  return (
    <Card data-testid="cost-per-user" className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cost Per Active User</CardTitle>
      </CardHeader>
      <CardContent>
        {showContactPricing ? (
          <p className="text-lg font-semibold text-muted-foreground">
            Contact for pricing
          </p>
        ) : (
          <p className="text-2xl font-bold">
            ${yearlyActiveUsers > 0
              ? (planCost / yearlyActiveUsers).toFixed(2)
              : '—'}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              per YAU ({plan} plan)
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
