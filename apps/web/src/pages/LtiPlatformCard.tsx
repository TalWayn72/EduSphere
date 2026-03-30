/**
 * LtiPlatformCard -- Renders a single LTI platform entry with toggle and test.
 * Extracted from LtiSettingsPage for file-size compliance.
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link2, ToggleLeft, ToggleRight } from 'lucide-react';

interface LtiPlatform {
  id: string;
  platformName: string;
  platformUrl: string;
  clientId: string;
  authLoginUrl: string;
  keySetUrl: string;
  deploymentId: string;
  isActive: boolean;
}

interface LtiPlatformCardProps {
  platform: LtiPlatform;
  onToggle: (id: string, currentActive: boolean) => void;
  onTestConnection: (keySetUrl: string) => void;
}

export function LtiPlatformCard({
  platform,
  onToggle,
  onTestConnection,
}: LtiPlatformCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{platform.platformName}</span>
              <span
                className={
                  platform.isActive
                    ? 'text-xs text-green-600'
                    : 'text-xs text-muted-foreground'
                }
              >
                {platform.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {platform.platformUrl}
            </p>
            <p className="text-xs text-muted-foreground">
              Client ID: {platform.clientId}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTestConnection(platform.keySetUrl)}
            >
              Test Connection
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={
                platform.isActive
                  ? 'Deactivate platform'
                  : 'Activate platform'
              }
              onClick={() => onToggle(platform.id, platform.isActive)}
            >
              {platform.isActive ? (
                <ToggleRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { LtiPlatform };
