/**
 * AtRiskDashboardPage.config.tsx — Risk threshold configuration card.
 * Used by AtRiskDashboardPage.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export function RiskThresholdConfig() {
  const [inactiveDays, setInactiveDays] = useState(7);
  const [completionThreshold, setCompletionThreshold] = useState(30);
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    // TODO: persist via mutation once admin config API is implemented
    setTimeout(() => {
      setSaving(false);
      toast.success('Risk thresholds saved');
    }, 600);
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
