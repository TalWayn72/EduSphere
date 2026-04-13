/**
 * CitationFormatWizard — step-by-step wizard for configuring citation format.
 *
 * Step 1: Choose a citation preset (JEWISH_TEXTS, APA, MLA, CHICAGO, CUSTOM)
 * Step 2: If CUSTOM → textarea for free-text description
 * Step 3: Confirmation and save via setCitationFormat mutation
 */
import { useState } from 'react';
import { useMutation } from 'urql';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SET_CITATION_FORMAT_MUTATION } from '@/lib/graphql/citation-format.queries';
import {
  type CitationPreset,
  PRESET_OPTIONS,
  StepDots,
  Step1PresetSelector,
  Step2CustomDescription,
  Step3Confirmation,
} from './citation-wizard-steps';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CitationFormatWizardProps {
  courseId: string;
  onComplete: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CitationFormatWizard({
  courseId,
  onComplete,
}: CitationFormatWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedPreset, setSelectedPreset] =
    useState<CitationPreset>('JEWISH_TEXTS');
  const [customDescription, setCustomDescription] = useState('');
  const [error, setError] = useState('');

  const isCustom = selectedPreset === 'CUSTOM';
  const totalSteps = isCustom ? 3 : 2;

  const [mutationState, setFormat] = useMutation(SET_CITATION_FORMAT_MUTATION);

  const handleNext = () => {
    setStep(isCustom && step === 1 ? 2 : 3);
  };

  const handleBack = () => {
    setStep(isCustom && step === 3 ? 2 : 1);
  };

  const handleSave = async () => {
    setError('');
    const result = await setFormat({
      input: {
        courseId,
        preset: selectedPreset,
        customDescription: isCustom ? customDescription : undefined,
      },
    });
    if (result.error) {
      setError(result.error.message ?? 'Failed to save citation format.');
      return;
    }
    onComplete();
  };

  const selectedOption = PRESET_OPTIONS.find((o) => o.value === selectedPreset);
  const displayStep = step <= 2 ? step : totalSteps;

  return (
    <Card
      className="w-full max-w-lg"
      dir="auto"
      data-testid="citation-format-wizard"
    >
      <CardHeader>
        <CardTitle className="text-base">Configure Citation Format</CardTitle>
        <StepDots total={totalSteps} current={displayStep} />
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <Step1PresetSelector
            selectedPreset={selectedPreset}
            onChange={setSelectedPreset}
          />
        )}
        {step === 2 && isCustom && (
          <Step2CustomDescription
            value={customDescription}
            onChange={setCustomDescription}
          />
        )}
        {step === 3 && (
          <Step3Confirmation
            selectedOption={selectedOption}
            isCustom={isCustom}
            customDescription={customDescription}
            error={error}
          />
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        {step > 1 ? (
          <Button variant="outline" size="sm" onClick={handleBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onComplete}>
            Cancel
          </Button>
          {step < 3 ? (
            <Button size="sm" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={mutationState.fetching}
            >
              {mutationState.fetching ? 'Saving…' : 'Save Format'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
