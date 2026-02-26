import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

// Public accessibility statement page — no auth required.
// Route: /accessibility

interface AccessibilityFeature {
  criterion: string;
  description: string;
}

const FEATURES: AccessibilityFeature[] = [
  {
    criterion: 'SC 1.2.2 / 1.2.5',
    description: 'WebVTT captions on all prerecorded course videos',
  },
  {
    criterion: 'SC 2.1.1 / 2.1.2',
    description: 'Full keyboard navigation — no keyboard traps',
  },
  {
    criterion: 'SC 4.1.2',
    description: 'ARIA roles, states, and properties on all custom widgets',
  },
  {
    criterion: 'SC 1.4.3',
    description:
      'Colour contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text',
  },
  {
    criterion: 'SC 2.4.7 / 2.4.11',
    description:
      'Visible keyboard focus indicator (2 px solid outline, ≥ 3:1 contrast)',
  },
  {
    criterion: 'SC 2.4.12',
    description:
      'Focused element never fully hidden by sticky headers or overlays',
  },
  {
    criterion: 'SC 3.3.1 / 3.3.2',
    description:
      'Descriptive inline error messages linked to fields via aria-describedby',
  },
  {
    criterion: 'SC 3.1.1',
    description:
      'Page language set dynamically — English (LTR) and Hebrew (RTL) supported',
  },
  {
    criterion: 'SC 2.4.1',
    description:
      'Skip-to-main-content link as first focusable element on every page',
  },
  {
    criterion: 'SC 2.5.8',
    description: 'All interactive targets ≥ 24 × 24 CSS pixels activation area',
  },
  {
    criterion: 'SC 3.3.8',
    description:
      'No CAPTCHA in authentication — Keycloak OIDC without cognitive tests',
  },
  {
    criterion: 'SC 2.3.3 (AAA)',
    description: 'All animations disabled when prefers-reduced-motion is set',
  },
];

interface KnownLimitation {
  area: string;
  detail: string;
}

const KNOWN_LIMITATIONS: KnownLimitation[] = [
  {
    area: 'Live session captions',
    detail:
      'Automatic captions in live BigBlueButton sessions depend on the host enabling the BBB caption feature. The platform does not supply automatic real-time captions by default.',
  },
  {
    area: 'Audio descriptions',
    detail:
      'Instructors are advised to upload audio-described versions of prerecorded videos. The workflow recommends but does not yet mandate this step.',
  },
  {
    area: 'PDF exports',
    detail:
      'Exported PDF documents are not currently evaluated for WCAG conformance.',
  },
];

export function AccessibilityStatementPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">Accessibility Statement</h1>
          <Badge variant="secondary" className="text-sm">
            WCAG 2.2 Level AA — Partial Conformance
          </Badge>
        </div>
        <p className="text-muted-foreground">
          EduSphere is committed to ensuring digital accessibility for people
          with disabilities. We continually improve the user experience for
          everyone and apply relevant accessibility standards across our
          platform.
        </p>
        <p className="text-sm text-muted-foreground">
          Last updated: February 2026
        </p>
      </div>

      {/* Conformance status */}
      <Card>
        <CardHeader>
          <CardTitle>Conformance Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            EduSphere <strong>partially conforms</strong> to{' '}
            <a
              href="https://www.w3.org/TR/WCAG22/"
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              Web Content Accessibility Guidelines (WCAG) 2.2
            </a>{' '}
            Level AA. Partial conformance means that some parts of the content
            do not fully conform to the standard; known exceptions are listed
            below.
          </p>
          <p>
            Our platform also targets compliance with{' '}
            <strong>Section 508</strong> and <strong>EN 301 549</strong>. A full
            machine-readable conformance report is available in our{' '}
            <a href="/docs/VPAT_v2.5.pdf" className="underline text-primary">
              VPAT 2.5 (PDF)
            </a>
            .
          </p>
        </CardContent>
      </Card>

      {/* Implemented features */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul
            className="space-y-3"
            aria-label="Implemented accessibility features"
          >
            {FEATURES.map((f) => (
              <li key={f.criterion} className="flex items-start gap-3 text-sm">
                <CheckCircle
                  className="h-4 w-4 text-green-600 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-mono text-xs text-muted-foreground mr-2">
                    {f.criterion}
                  </span>
                  {f.description}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Known limitations */}
      <Card>
        <CardHeader>
          <CardTitle>Known Limitations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul
            className="space-y-4"
            aria-label="Known accessibility limitations"
          >
            {KNOWN_LIMITATIONS.map((l) => (
              <li key={l.area} className="text-sm space-y-1">
                <p className="font-semibold">{l.area}</p>
                <p className="text-muted-foreground">{l.detail}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback and Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            We welcome feedback on the accessibility of EduSphere. If you
            experience barriers or wish to report an accessibility issue, please
            contact us:
          </p>
          <ul className="space-y-1 list-none">
            <li>
              <span className="font-medium">Email:</span>{' '}
              <a
                href="mailto:accessibility@edusphere.io"
                className="underline text-primary"
              >
                accessibility@edusphere.io
              </a>
            </li>
            <li>
              <span className="font-medium">Response time:</span> We aim to
              respond within 2 business days.
            </li>
          </ul>
          <p className="text-muted-foreground">
            You may also escalate unresolved accessibility concerns to your
            country's supervisory authority or enforcement body if we do not
            respond adequately.
          </p>
        </CardContent>
      </Card>

      {/* Technical info */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Approach</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            EduSphere relies on the following technologies for conformance with
            WCAG 2.2: HTML5, CSS (Tailwind CSS), JavaScript / TypeScript (React
            19), ARIA, and WebVTT. Radix UI primitives provide keyboard
            management and ARIA patterns for custom widgets. Automated
            accessibility testing is performed with axe-core on every CI run.
          </p>
          <p>
            This statement was prepared in February 2026 based on
            self-evaluation and automated testing. We commit to reviewing and
            updating this statement at least annually.
          </p>
        </CardContent>
      </Card>

      {/* Back link */}
      <p className="text-sm">
        <Link to="/" className="underline text-primary">
          Return to home
        </Link>
      </p>
    </div>
  );
}
