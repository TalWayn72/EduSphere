import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CertificateCard, type Certificate } from './CertificateCard';

const SAMPLE_CERT: Certificate = {
  id: 'cert-001',
  courseId: 'course-abc',
  issuedAt: '2025-11-15T10:30:00Z',
  verificationCode: 'EDU-2025-XK9M',
  pdfUrl: 'https://example.com/certs/cert-001.pdf',
  metadata: { courseName: 'Advanced GraphQL Federation' },
};

const meta: Meta<typeof CertificateCard> = {
  title: 'Certificates/CertificateCard',
  component: CertificateCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays a course completion certificate with verification code, copy-to-clipboard, and PDF download button.',
      },
    },
  },
  args: {
    onDownload: fn(),
  },
  argTypes: {
    onDownload: { action: 'download clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof CertificateCard>;

export const Default: Story = {
  args: {
    cert: SAMPLE_CERT,
  },
};

export const LongCourseName: Story = {
  args: {
    cert: {
      ...SAMPLE_CERT,
      id: 'cert-002',
      metadata: {
        courseName:
          'Complete Full-Stack Development with GraphQL Federation, NestJS, React 19 and PostgreSQL 16',
      },
    },
  },
};

export const NoMetadata: Story = {
  args: {
    cert: {
      ...SAMPLE_CERT,
      id: 'cert-003',
      metadata: null,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Falls back to "Course Certificate" when metadata.courseName is absent.',
      },
    },
  },
};

export const RecentlyIssued: Story = {
  args: {
    cert: {
      ...SAMPLE_CERT,
      id: 'cert-004',
      issuedAt: new Date().toISOString(),
      verificationCode: 'EDU-2026-ZA1B',
      metadata: { courseName: 'React 19 Concurrency Patterns' },
    },
  },
};
