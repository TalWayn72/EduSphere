import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function getTierCost(students: number): number {
  if (students <= 500) return 12000;
  if (students <= 2000) return 28000;
  if (students <= 10000) return 65000;
  return 120000;
}

function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function ROICalculatorSection() {
  const [instructors, setInstructors] = useState(10);
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [hourlyRate, setHourlyRate] = useState(85);
  const [students, setStudents] = useState(1000);

  const hoursSaved = Math.round(instructors * hoursPerWeek * 52 * 0.6);
  const valueSaved = hoursSaved * hourlyRate;
  const annualCost = getTierCost(students);
  const netROI = annualCost > 0 ? Math.round(((valueSaved - annualCost) / annualCost) * 100) : 0;

  return (
    <section
      data-testid="roi-calculator-section"
      className="bg-white py-20"
      aria-label="ROI Calculator"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Calculate Your ROI
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            See how EduSphere pays for itself — usually within the first quarter.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Sliders */}
          <div className="space-y-8">
            {[
              { label: 'Number of Instructors', value: instructors, min: 1, max: 50, step: 1, set: setInstructors, format: (v: number) => `${v}` },
              { label: 'Hours/week on course creation', value: hoursPerWeek, min: 1, max: 20, step: 1, set: setHoursPerWeek, format: (v: number) => `${v} hrs` },
              { label: 'Hourly instructor cost', value: hourlyRate, min: 50, max: 200, step: 5, set: setHourlyRate, format: (v: number) => `$${v}/hr` },
              { label: 'Number of students', value: students, min: 100, max: 50000, step: 100, set: setStudents, format: (v: number) => v.toLocaleString() },
            ].map(({ label, value, min, max, step, set, format }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-sm font-semibold text-slate-700">{label}</Label>
                  <span className="text-sm font-bold text-indigo-600">{format(value)}</span>
                </div>
                <Slider
                  min={min}
                  max={max}
                  step={step}
                  value={[value]}
                  onValueChange={(vals) => { if (vals[0] !== undefined) set(vals[0]); }}
                  aria-label={label}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Results */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col gap-6">
            {[
              { label: 'Instructor hours saved/year', value: `${hoursSaved.toLocaleString()} hrs` },
              { label: 'Dollar value saved', value: formatCurrency(valueSaved), highlight: true },
              { label: 'EduSphere annual cost', value: formatCurrency(annualCost) },
            ].map(({ label, value, highlight }) => (
              <div key={label} className={`rounded-xl px-5 py-4 ${highlight ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}>
                <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${highlight ? 'text-indigo-200' : 'text-slate-500'}`}>{label}</p>
                <p className={`text-2xl font-extrabold ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</p>
              </div>
            ))}
            <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-green-600 mb-1">Net ROI</p>
              <p className="text-3xl font-extrabold text-green-700">{netROI > 0 ? '+' : ''}{netROI}%</p>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white w-full" asChild>
              <a href="#pilot-cta">Get Your Custom ROI Report</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
