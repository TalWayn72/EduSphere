/**
 * XapiTokenSection -- API token management + generation modal for xAPI settings.
 * Extracted from XapiSettingsPage for file-size compliance.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';

interface XapiToken {
  id: string;
  description: string;
  lrsEndpoint: string | null;
  isActive: boolean;
  createdAt: string;
}

interface XapiTokenSectionProps {
  tokens: XapiToken[];
  fetching: boolean;
  onGenerate: (
    description: string,
    lrsEndpoint: string
  ) => Promise<string | null>;
  onRevoke: (id: string) => void;
}

export function XapiTokenSection({
  tokens,
  fetching,
  onGenerate,
  onRevoke,
}: XapiTokenSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [lrsEndpoint, setLrsEndpoint] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const handleGenerateToken = async () => {
    if (!description.trim()) return;
    const token = await onGenerate(description.trim(), lrsEndpoint.trim());
    if (token) setGeneratedToken(token);
  };

  const closeModal = () => {
    setShowModal(false);
    setDescription('');
    setLrsEndpoint('');
    setGeneratedToken(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API Tokens</CardTitle>
            <CardDescription>
              Bearer tokens for LRS authentication
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setShowModal(true);
              setGeneratedToken(null);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Generate
          </Button>
        </CardHeader>
        <CardContent>
          {fetching ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tokens yet.</p>
          ) : (
            <div className="divide-y">
              {tokens.map((t) => (
                <div
                  key={t.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(t.createdAt).toLocaleDateString()}
                      {t.lrsEndpoint !== null && (
                        <span> &middot; Fwd {t.lrsEndpoint}</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={
                      t.isActive
                        ? 'text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700'
                        : 'text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700'
                    }
                  >
                    {t.isActive ? 'Active' : 'Revoked'}
                  </span>
                  {t.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onRevoke(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            if (!generatedToken) setShowModal(false);
          }}
        >
          <div
            className="bg-background rounded-lg p-6 max-w-md w-full mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Generate xAPI Token</h2>
            {generatedToken ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm dark:bg-amber-950 dark:border-amber-700">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
                  <span className="text-amber-800 dark:text-amber-200">
                    Save this token — it will not be shown again.
                  </span>
                </div>
                <div className="p-3 bg-muted rounded-md font-mono text-xs break-all select-all">
                  {generatedToken}
                </div>
                <Button className="w-full" onClick={closeModal}>
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Description
                  </label>
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="e.g. Rustici SCORM Cloud"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    External LRS URL (optional)
                  </label>
                  <input
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    placeholder="https://lrs.example.com"
                    value={lrsEndpoint}
                    onChange={(e) => setLrsEndpoint(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!description.trim()}
                    onClick={() => void handleGenerateToken()}
                  >
                    Generate
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export type { XapiToken };
