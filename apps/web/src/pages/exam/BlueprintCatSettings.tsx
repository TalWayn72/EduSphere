/**
 * BlueprintCatSettings — CAT (Computer Adaptive Testing) configuration section.
 */
import { type UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
  Form,
} from '@/components/ui/form';

interface BlueprintCatSettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  enableCat: boolean;
  onEnableCatChange: (v: boolean) => void;
}

export function BlueprintCatSettings({
  form, enableCat, onEnableCatChange,
}: BlueprintCatSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Adaptive Testing (CAT)</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="cat-toggle" className="text-sm">Enable CAT</Label>
            <Switch
              id="cat-toggle"
              checked={enableCat}
              onCheckedChange={onEnableCatChange}
            />
          </div>
        </div>
      </CardHeader>
      {enableCat && (
        <CardContent>
          <Form {...form}>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="catMinItems" render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Items</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>Minimum questions before stopping</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="catMaxItems" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Items</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>Maximum questions administered</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="catSeCutoff" render={({ field }) => (
                <FormItem>
                  <FormLabel>SE Cutoff</FormLabel>
                  <FormControl>
                    <Input type="number" step={0.01} min={0.01} max={2} {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>Stop when SE drops below this</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="catStartTheta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Theta</FormLabel>
                  <FormControl>
                    <Input type="number" step={0.1} min={-4} max={4} {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>Initial ability estimate</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="catExposureControl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Exposure Control</FormLabel>
                  <FormControl>
                    <Input type="number" step={0.05} min={0} max={1} {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>Max item exposure rate (0-1)</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="minB" render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty Min (b)</FormLabel>
                  <FormControl>
                    <Input type="number" step={0.1} min={-4} max={4} {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="maxB" render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty Max (b)</FormLabel>
                  <FormControl>
                    <Input type="number" step={0.1} min={-4} max={4} {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </Form>
        </CardContent>
      )}
    </Card>
  );
}
