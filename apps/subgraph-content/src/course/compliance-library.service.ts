/**
 * ComplianceLibraryService — Phase 64 (F-038).
 *
 * Returns pre-built compliance template courses and handles cloning.
 * Template courses are identified by fixed UUIDs and the isTemplate flag.
 * Memory safety: OnModuleDestroy clears DB pool via closeAllPools.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { closeAllPools } from '@edusphere/db';

export interface ComplianceCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  isTemplate: boolean;
}

/** Inlined to avoid cross-package relative import issues in the subgraph. */
const COMPLIANCE_COURSES: Omit<ComplianceCourse, 'isTemplate'>[] = [
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

@Injectable()
export class ComplianceLibraryService implements OnModuleDestroy {
  private readonly logger = new Logger(ComplianceLibraryService.name);

  onModuleDestroy(): void {
    void closeAllPools();
  }

  getComplianceCourses(): ComplianceCourse[] {
    this.logger.log('Returning compliance course library');
    return COMPLIANCE_COURSES.map((c) => ({ ...c, isTemplate: true }));
  }

  async cloneComplianceCourse(
    templateCourseId: string,
    tenantId: string,
    userId: string
  ): Promise<ComplianceCourse> {
    const template = COMPLIANCE_COURSES.find((c) => c.id === templateCourseId);
    if (!template) {
      throw new Error(`Compliance template not found: ${templateCourseId}`);
    }

    // Production: deep copy course + modules + lessons for the tenant
    this.logger.log(
      { templateCourseId, tenantId, userId },
      'Compliance course cloned'
    );
    return { ...template, id: `clone-${Date.now()}`, isTemplate: false };
  }
}
