import React from 'react';
import { Clock, BarChart2, Tag } from 'lucide-react';
import { PageMeta, CourseSchema, BreadcrumbSchema } from '@/components/seo';

interface FeaturedCourse {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  category: string;
  keywords: string[];
}

const FEATURED_COURSES: FeaturedCourse[] = [
  {
    id: 'intro-ml',
    title: 'Introduction to Machine Learning',
    description:
      'Build your first ML models. Learn supervised and unsupervised learning, model evaluation, and feature engineering using Python.',
    level: 'Beginner',
    duration: '8 hours',
    category: 'Technology',
    keywords: ['machine learning', 'python', 'data science', 'AI'],
  },
  {
    id: 'advanced-kg',
    title: 'Advanced Knowledge Graphs',
    description:
      'Master graph databases, ontology design, and semantic querying with Apache AGE and Cypher. Build enterprise knowledge networks.',
    level: 'Advanced',
    duration: '12 hours',
    category: 'Data Science',
    keywords: ['knowledge graph', 'graph database', 'semantic web', 'ontology'],
  },
  {
    id: 'corporate-leadership',
    title: 'Corporate Leadership Excellence',
    description:
      'Develop strategic leadership capabilities, manage high-performing teams, and drive organizational change effectively.',
    level: 'Intermediate',
    duration: '6 hours',
    category: 'Leadership',
    keywords: ['leadership', 'management', 'strategy', 'organizational development'],
  },
  {
    id: 'python-data-science',
    title: 'Python for Data Science',
    description:
      'Learn pandas, NumPy, matplotlib, and scikit-learn to analyze data and build predictive models from scratch.',
    level: 'Beginner',
    duration: '10 hours',
    category: 'Programming',
    keywords: ['python', 'data science', 'pandas', 'numpy', 'scikit-learn'],
  },
  {
    id: 'ai-ethics',
    title: 'AI Ethics and Responsible AI',
    description:
      'Understand bias, fairness, transparency, and accountability in AI systems. Learn frameworks for ethical AI deployment.',
    level: 'Intermediate',
    duration: '4 hours',
    category: 'AI/ML',
    keywords: ['AI ethics', 'responsible AI', 'bias', 'fairness', 'transparency'],
  },
  {
    id: 'org-learning-design',
    title: 'Organizational Learning Design',
    description:
      'Design scalable learning programs for enterprises. Apply instructional design principles to build impactful L&D strategies.',
    level: 'Advanced',
    duration: '8 hours',
    category: 'L&D',
    keywords: ['learning design', 'instructional design', 'L&D', 'corporate training'],
  },
];

const LEVEL_COLORS: Record<string, string> = {
  Beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface CourseCardProps {
  course: FeaturedCourse;
}

function CourseCard({ course }: CourseCardProps) {
  return (
    <article
      className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl p-6 flex flex-col gap-3 hover:shadow-md transition-shadow"
      aria-label={`Course: ${course.title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-foreground leading-tight">
          {course.title}
        </h2>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${LEVEL_COLORS[course.level] ?? 'bg-gray-100 text-gray-700'}`}
        >
          {course.level}
        </span>
      </div>
      <p className="text-gray-600 dark:text-muted-foreground text-sm leading-relaxed flex-1">
        {course.description}
      </p>
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {course.duration}
        </span>
        <span className="flex items-center gap-1">
          <Tag className="h-4 w-4" aria-hidden="true" />
          {course.category}
        </span>
        <span className="flex items-center gap-1">
          <BarChart2 className="h-4 w-4" aria-hidden="true" />
          {course.level}
        </span>
      </div>
      <a
        href="/pilot"
        className="mt-2 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        aria-label={`Enroll in ${course.title} — Start Free Trial`}
      >
        Start Free Trial
      </a>
    </article>
  );
}

export function CourseCatalogPage() {
  return (
    <>
      <PageMeta
        title="Course Catalog — Featured Learning Programs"
        description="Browse EduSphere's featured courses: Machine Learning, Knowledge Graphs, Leadership, Python, AI Ethics, and Learning Design. Start your free trial today."
        canonical="https://app.edusphere.dev/catalog"
      />
      {FEATURED_COURSES.map((course) => (
        <CourseSchema
          key={course.id}
          name={course.title}
          description={course.description}
          url={`https://app.edusphere.dev/catalog#${course.id}`}
          keywords={course.keywords}
          educationalLevel={course.level}
        />
      ))}
      <BreadcrumbSchema
        items={[
          { name: 'EduSphere', url: 'https://app.edusphere.dev/landing' },
          { name: 'Courses', url: 'https://app.edusphere.dev/catalog' },
        ]}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-background">
        {/* Header */}
        <div className="bg-indigo-700 text-white py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Featured Learning Programs
            </h1>
            <p className="text-indigo-200 text-lg mb-8 max-w-2xl mx-auto">
              Explore our curated courses designed for modern professionals. AI-powered
              personalization adapts every course to your learning pace.
            </p>
            <a
              href="/pilot"
              className="inline-flex items-center px-6 py-3 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition-colors"
              aria-label="Start your free EduSphere pilot"
            >
              Start Free Trial
            </a>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <ul
            role="list"
            aria-label="Featured courses"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {FEATURED_COURSES.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} />
              </li>
            ))}
          </ul>

          {/* CTA Section */}
          <div className="mt-14 p-8 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-2">
              Ready to transform your organization&apos;s learning?
            </h2>
            <p className="text-gray-600 dark:text-muted-foreground mb-6 max-w-xl mx-auto">
              EduSphere supports 100,000+ concurrent learners with AI-powered tutoring,
              knowledge graphs, and enterprise-grade compliance.
            </p>
            <a
              href="/pilot"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
              aria-label="Request an EduSphere pilot program"
            >
              Request a Pilot
            </a>
          </div>
        </main>
      </div>
    </>
  );
}

export default CourseCatalogPage;
