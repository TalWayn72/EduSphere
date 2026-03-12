import React from 'react';
import { User, Award, BookOpen } from 'lucide-react';
import { PageMeta, PersonSchema, BreadcrumbSchema } from '@/components/seo';

interface Instructor {
  id: string;
  name: string;
  jobTitle: string;
  institution: string;
  credential: string;
  bio: string;
  expertise: string[];
  courses: number;
  url: string;
}

const INSTRUCTORS: Instructor[] = [
  {
    id: 'sarah-chen',
    name: 'Dr. Sarah Chen',
    jobTitle: 'AI & Machine Learning Researcher',
    institution: 'EduSphere',
    credential: 'Stanford PhD, Computer Science',
    bio: 'Leading AI researcher with 10+ years in machine learning and neural network architectures. Former Google Brain researcher, author of 30+ peer-reviewed papers.',
    expertise: ['Machine Learning', 'Deep Learning', 'Natural Language Processing'],
    courses: 4,
    url: 'https://app.edusphere.dev/instructors#sarah-chen',
  },
  {
    id: 'david-levi',
    name: 'Prof. David Levi',
    jobTitle: 'Knowledge Graph Architect',
    institution: 'EduSphere',
    credential: 'MIT CSAIL, Semantic Web',
    bio: 'Pioneer in enterprise knowledge graph design. Co-author of the W3C Graph Standardization Working Group. 15 years building semantic data infrastructure for Fortune 500 companies.',
    expertise: ['Knowledge Graphs', 'Semantic Web', 'Graph Databases'],
    courses: 3,
    url: 'https://app.edusphere.dev/instructors#david-levi',
  },
  {
    id: 'maria-santos',
    name: 'Dr. Maria Santos',
    jobTitle: 'L&D Strategy Director',
    institution: 'EduSphere',
    credential: 'Harvard EdD, Learning Sciences',
    bio: 'Award-winning instructional designer with expertise in corporate learning transformation. Led L&D programs at 50+ global enterprises reaching 200,000+ employees.',
    expertise: ['Learning Design', 'Instructional Design', 'Change Management'],
    courses: 5,
    url: 'https://app.edusphere.dev/instructors#maria-santos',
  },
  {
    id: 'james-thompson',
    name: 'James Thompson',
    jobTitle: 'Corporate Training Lead',
    institution: 'EduSphere',
    credential: '15 Years Corporate Training Experience',
    bio: 'Veteran corporate trainer specializing in leadership development and executive coaching. Built training programs for 30+ Fortune 500 companies across 4 continents.',
    expertise: ['Leadership Development', 'Executive Coaching', 'Team Performance'],
    courses: 6,
    url: 'https://app.edusphere.dev/instructors#james-thompson',
  },
];

interface InstructorCardProps {
  instructor: Instructor;
}

function InstructorCard({ instructor }: InstructorCardProps) {
  return (
    <article
      id={instructor.id}
      className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-6 flex flex-col gap-4"
      aria-label={`Instructor: ${instructor.name}`}
    >
      <div className="flex items-start gap-4">
        <div
          className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <User className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-foreground">
            {instructor.name}
          </h2>
          <p className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">
            {instructor.jobTitle}
          </p>
          <p className="text-gray-500 dark:text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
            <Award className="h-3 w-3" aria-hidden="true" />
            {instructor.credential}
          </p>
        </div>
      </div>

      <p className="text-gray-600 dark:text-muted-foreground text-sm leading-relaxed">
        {instructor.bio}
      </p>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-muted-foreground uppercase tracking-wide mb-2">
          Areas of Expertise
        </p>
        <ul
          role="list"
          aria-label={`${instructor.name}'s areas of expertise`}
          className="flex flex-wrap gap-2"
        >
          {instructor.expertise.map((area) => (
            <li
              key={area}
              className="text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full"
            >
              {area}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-border">
        <span className="text-sm text-gray-500 dark:text-muted-foreground flex items-center gap-1">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          {instructor.courses} courses
        </span>
        <a
          href="/pilot"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          aria-label={`Learn from ${instructor.name} — Start Free Trial`}
        >
          Learn with them →
        </a>
      </div>
    </article>
  );
}

export function InstructorDirectoryPage() {
  return (
    <>
      <PageMeta
        title="Instructor Directory — Expert Educators on EduSphere"
        description="Meet EduSphere's world-class instructors: AI researchers, knowledge graph architects, L&D strategists, and corporate training leaders from Stanford, MIT, and Harvard."
        canonical="https://app.edusphere.dev/instructors"
      />
      {INSTRUCTORS.map((instructor) => (
        <PersonSchema
          key={instructor.id}
          name={instructor.name}
          jobTitle={instructor.jobTitle}
          url={instructor.url}
          worksFor={instructor.institution}
          description={instructor.bio}
        />
      ))}
      <BreadcrumbSchema
        items={[
          { name: 'EduSphere', url: 'https://app.edusphere.dev/landing' },
          { name: 'Instructors', url: 'https://app.edusphere.dev/instructors' },
        ]}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-background">
        {/* Header */}
        <div className="bg-indigo-700 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Meet Our Instructors
            </h1>
            <p className="text-indigo-200 text-lg max-w-2xl mx-auto">
              World-class educators from leading research institutions and Fortune 500 companies,
              bringing real-world expertise to your organization.
            </p>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <ul
            role="list"
            aria-label="EduSphere instructors"
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            {INSTRUCTORS.map((instructor) => (
              <li key={instructor.id}>
                <InstructorCard instructor={instructor} />
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-12 p-8 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-2">
              Want to become an EduSphere instructor?
            </h2>
            <p className="text-gray-600 dark:text-muted-foreground mb-6">
              Share your expertise with thousands of learners worldwide.
            </p>
            <a
              href="/pilot"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              aria-label="Apply to become an EduSphere instructor"
            >
              Get Started
            </a>
          </div>
        </main>
      </div>
    </>
  );
}

export default InstructorDirectoryPage;
