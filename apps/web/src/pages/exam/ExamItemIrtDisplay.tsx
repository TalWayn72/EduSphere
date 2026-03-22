/**
 * ExamItemIrtDisplay — read-only IRT parameter display for calibrated exam items.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ExamItem } from '@/types/exam-entities';

interface ExamItemIrtDisplayProps {
  item: ExamItem;
}

export function ExamItemIrtDisplay({ item }: ExamItemIrtDisplayProps) {
  const isCalibrated = item.calibrationStatus === 'CALIBRATED';

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">IRT Parameters</CardTitle>
          {isCalibrated && <Badge className="bg-green-100 text-green-800 text-xs dark:bg-green-900 dark:text-green-200">Calibrated</Badge>}
          {!isCalibrated && (
            <Badge variant="outline" className="text-xs">
              {item.calibrationStatus} — values may change after calibration
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <IrtParam label="Discrimination (a)" value={item.irtA} />
          <IrtParam label="Difficulty (b)" value={item.irtB} />
          <IrtParam label="Guessing (c)" value={item.irtC} />
        </div>
        {(item.exposureCount ?? 0) > 0 && (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Administered {item.exposureCount} time(s)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function IrtParam({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-mono font-semibold">{value != null ? value.toFixed(3) : '—'}</p>
    </div>
  );
}
