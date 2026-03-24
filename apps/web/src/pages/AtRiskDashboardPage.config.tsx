/**
 * AtRiskDashboardPage.config.tsx — Risk threshold configuration card.
 * Used by AtRiskDashboardPage.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const STORAGE_KEY = 'edusphere_risk_thresholds';

interface RiskThresholds {
  inactiveDays: number;
  completionThreshold: number;
}

/** Load persisted thresholds from localStorage */
function loadThresholds(): RiskThresholds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RiskThresholds>;
      return {
        inactiveDays: parsed.inactiveDays ?? 7,
        completionThreshold: parsed.completionThreshold ?? 30,
      };
    }
  } catch {
    console.error('[RiskThresholdConfig] Failed to load saved thresholds');
  }
  return { inactiveDays: 7, completionThreshold: 30 };
}

/**
 * Persist thresholds. Currently uses localStorage.
 * TODO: Replace with GraphQL mutation (e.g. updateRiskThresholds) once
 * the backend admin config API is available in the supergraph.
 */
function persistThresholds(thresholds: RiskThresholds): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
  } catch {
    console.error('[RiskThresholdConfig] Failed to persist thresholds');
    throw new Error('Failed to save risk thresholds');
  }
}

export function RiskThresholdConfig() {
  const defaults = loadThresholds();
  const [inactiveDays, setInactiveDays] = useState(defaults.inactiveDays);
  const [completionThreshold, setCompletionThreshold] = useState(defaults.completionThreshold);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        console.error('[RiskThresholdConfig] cleanup: save timer cleared on unmount');
      }
    };
  }, []);

  function handleSave() {
    setSaving(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      persistThresholds({ inactiveDays, completionThreshold });
      saveTimerRef.current = setTimeout(() => {
        setSaving(false);
        toast.success('Risk thresholds saved');
      }, 600);
    } catch {
      setSaving(false);
      toast.error('Failed to save thresholds. Please try again.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Risk Threshold Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="inactive-days">
            Flag learners as at-risk when inactive for (days)
          </Label>
          <Input
            id="inactive-days"
            type="number"
            min={1}
            max={90}
            value={inactiveDays}
            onChange={(e) => setInactiveDays(Number(e.target.value))}
            className="w-32"
          />
        </div>
        <div className="space-y-3">
          <Label>
            Or completion below —{' '}
            <span className="font-semibold">{completionThreshold}%</span>
          </Label>
          <Slider
            min={5}
            max={80}
            step={5}
            value={[completionThreshold]}
            onValueChange={(vals) =>
              setCompletionThreshold(vals[0] ?? completionThreshold)
            }
            className="max-w-xs"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving…' : 'Save Thresholds'}
        </Button>
      </CardContent>
    </Card>
  );
}
