import { createDatabaseConnection, schema } from '../index.js';
import { eq } from 'drizzle-orm';

export const LIBRARY_COURSE_SEEDS = [
  {
    title: 'GDPR Compliance Essentials',
    description:
      'A comprehensive overview of GDPR principles, data subject rights, and obligations for data controllers and processors operating in the EU.',
    topic: 'GDPR' as const,
    scormPackageUrl: 'library/GDPR/course.zip',
    durationMinutes: 45,
    priceCents: 0,
    licenseType: 'FREE' as const,
  },
  {
    title: 'SOC 2 Security Awareness',
    description:
      'Covers the five Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy) and employee responsibilities.',
    topic: 'SOC2' as const,
    scormPackageUrl: 'library/SOC2/course.zip',
    durationMinutes: 60,
    priceCents: 0,
    licenseType: 'FREE' as const,
  },
  {
    title: 'HIPAA Privacy & Security',
    description:
      'Trains staff on Protected Health Information (PHI) handling, the Privacy Rule, Security Rule, and Breach Notification requirements.',
    topic: 'HIPAA' as const,
    scormPackageUrl: 'library/HIPAA/course.zip',
    durationMinutes: 90,
    priceCents: 0,
    licenseType: 'FREE' as const,
  },
  {
    title: 'Anti-Money Laundering (AML) Fundamentals',
    description:
      'Introduces AML legislation, Know Your Customer (KYC) procedures, suspicious activity recognition, and reporting obligations.',
    topic: 'AML' as const,
    scormPackageUrl: 'library/AML/course.zip',
    durationMinutes: 60,
    priceCents: 0,
    licenseType: 'FREE' as const,
  },
  {
    title: 'Diversity, Equity & Inclusion',
    description:
      'Builds awareness of unconscious bias, inclusive language, psychological safety, and actionable allyship strategies in the workplace.',
    topic: 'DEI' as const,
    scormPackageUrl: 'library/DEI/course.zip',
    durationMinutes: 45,
    priceCents: 0,
    licenseType: 'FREE' as const,
  },
  {
    title: 'Cybersecurity Awareness Training',
    description:
      'Teaches employees to identify phishing attempts, use strong passwords, handle data securely, and respond to security incidents.',
    topic: 'CYBERSECURITY' as const,
    scormPackageUrl: 'library/CYBERSECURITY/course.zip',
    durationMinutes: 30,
    priceCents: 0,
    licenseType: 'FREE' as const,
  },
  {
    title: 'Preventing Workplace Harassment',
    description:
      'Covers definitions of harassment and discrimination, bystander intervention, reporting procedures, and manager responsibilities.',
    topic: 'HARASSMENT_PREVENTION' as const,
    scormPackageUrl: 'library/HARASSMENT_PREVENTION/course.zip',
    durationMinutes: 60,
    priceCents: 0,
    licenseType: 'FREE' as const,
  },
] as const;

export async function seedLibraryCourses(): Promise<void> {
  const db = createDatabaseConnection();

  for (const seed of LIBRARY_COURSE_SEEDS) {
    const existing = await db
      .select({ id: schema.libraryCourses.id })
      .from(schema.libraryCourses)
      .where(eq(schema.libraryCourses.scormPackageUrl, seed.scormPackageUrl));

    if (existing.length === 0) {
      await db
        .insert(schema.libraryCourses)
        .values({ ...seed, isActive: true });
    }
  }
}
