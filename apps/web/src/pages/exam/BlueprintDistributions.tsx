/**
 * BlueprintDistributions — domain + bloom distribution editors for blueprints.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BlueprintDistributionEditor,
  type DistributionItem,
} from '@/components/exam/BlueprintDistributionEditor';

interface BlueprintDistributionsProps {
  domainDist: DistributionItem[];
  onDomainChange: (items: DistributionItem[]) => void;
  bloomDist: DistributionItem[];
  onBloomChange: (items: DistributionItem[]) => void;
}

export function BlueprintDistributions({
  domainDist,
  onDomainChange,
  bloomDist,
  onBloomChange,
}: BlueprintDistributionsProps) {
  const [newDomain, setNewDomain] = useState('');

  const addDomain = () => {
    const name = newDomain.trim();
    if (!name || domainDist.some((d) => d.label === name)) return;
    onDomainChange([
      ...domainDist,
      { label: name, weight: 10, minPercent: 5, maxPercent: 30 },
    ]);
    setNewDomain('');
  };

  const removeDomain = (label: string) => {
    onDomainChange(domainDist.filter((d) => d.label !== label));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Domain Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="Add domain (e.g. Algorithms)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDomain();
                }
              }}
              className="max-w-[240px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDomain}
            >
              Add
            </Button>
          </div>

          {domainDist.length > 0 ? (
            <>
              <BlueprintDistributionEditor
                title="Domain Weights"
                items={domainDist}
                onChange={onDomainChange}
              />
              <div className="flex flex-wrap gap-2">
                {domainDist.map((d) => (
                  <Button
                    key={d.label}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive"
                    onClick={() => removeDomain(d.label)}
                  >
                    Remove {d.label}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No domains added. Domains are auto-populated from item bank tags.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bloom Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <BlueprintDistributionEditor
            title="Bloom Weights"
            items={bloomDist}
            onChange={onBloomChange}
          />
        </CardContent>
      </Card>
    </>
  );
}
