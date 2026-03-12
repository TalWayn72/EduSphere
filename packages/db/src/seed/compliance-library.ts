/**
 * Compliance Library Seed — Phase 64 (F-038).
 *
 * Seeds 8 pre-built compliance template courses.
 * tenant_id = NULL (platform-wide templates accessible to all tenants).
 * is_template = true flag.
 *
 * Each course: title + description + category (compliance) + tags.
 * Uses upsert to be idempotent (run-safe multiple times).
 */

export interface ComplianceCourseSeed {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

export const COMPLIANCE_COURSES: ComplianceCourseSeed[] = [
  {
    id: '00000000-0000-0000-0000-000000000c01',
    title: 'FERPA Basics for Educators',
    description:
      'Understand FERPA requirements for student data privacy in educational institutions.',
    category: 'compliance',
    tags: ['FERPA', 'privacy', 'education'],
  },
  {
    id: '00000000-0000-0000-0000-000000000c02',
    title: 'GDPR for Employees',
    description: 'Essential GDPR knowledge for employees handling EU personal data.',
    category: 'compliance',
    tags: ['GDPR', 'privacy', 'EU'],
  },
  {
    id: '00000000-0000-0000-0000-000000000c03',
    title: 'HIPAA Overview',
    description: 'Core HIPAA requirements for protecting healthcare information.',
    category: 'compliance',
    tags: ['HIPAA', 'healthcare', 'privacy'],
  },
  {
    id: '00000000-0000-0000-0000-000000000c04',
    title: 'Cybersecurity Fundamentals',
    description: 'Essential cybersecurity practices to protect organizational assets.',
    category: 'compliance',
    tags: ['cybersecurity', 'security'],
  },
  {
    id: '00000000-0000-0000-0000-000000000c05',
    title: 'Workplace Harassment Prevention',
    description: 'Identifying and preventing harassment in the workplace.',
    category: 'compliance',
    tags: ['HR', 'harassment', 'workplace'],
  },
  {
    id: '00000000-0000-0000-0000-000000000c06',
    title: 'Data Privacy 101',
    description: 'Foundational data privacy concepts for all employees.',
    category: 'compliance',
    tags: ['privacy', 'data', 'fundamentals'],
  },
  {
    id: '00000000-0000-0000-0000-000000000c07',
    title: 'AI Ethics in the Workplace',
    description:
      'Ethical considerations when using AI tools and data in organizational contexts.',
    category: 'compliance',
    tags: ['AI', 'ethics', 'governance'],
  },
  {
    id: '00000000-0000-0000-0000-000000000c08',
    title: 'Academic Integrity',
    description:
      'Standards and expectations for academic honesty in educational settings.',
    category: 'compliance',
    tags: ['academic', 'integrity', 'education'],
  },
];

export default COMPLIANCE_COURSES;
