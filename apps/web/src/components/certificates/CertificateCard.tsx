import { Award, Copy, Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface Certificate {
  id: string;
  courseId: string;
  issuedAt: string;
  verificationCode: string;
  pdfUrl: string;
  metadata: Record<string, unknown> | null;
}

interface CertificateCardProps {
  cert: Certificate;
  onDownload: (certId: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function copyCode(code: string): void {
  void navigator.clipboard.writeText(code);
}

export function CertificateCard({ cert, onDownload }: CertificateCardProps) {
  const courseName =
    (cert.metadata?.['courseName'] as string | undefined) ??
    'Course Certificate';

  return (
    <Card className="flex flex-col" data-testid="certificate-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary shrink-0" />
          <CardTitle className="text-base line-clamp-2">{courseName}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <p className="text-sm text-muted-foreground">
          Issued: <span className="font-medium">{formatDate(cert.issuedAt)}</span>
        </p>

        <div className="flex items-center gap-2">
          <code
            className="text-xs font-mono bg-muted px-2 py-1 rounded select-all"
            data-testid="verification-code"
          >
            {cert.verificationCode}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label="Copy verification code"
            onClick={() => copyCode(cert.verificationCode)}
            data-testid="copy-code-btn"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => onDownload(cert.id)}
          data-testid="download-btn"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </CardFooter>
    </Card>
  );
}
