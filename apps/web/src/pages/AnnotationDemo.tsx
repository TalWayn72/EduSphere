import { AnnotationPanel } from '@/components/AnnotationPanel';
import { PageShell } from '@/components/PageShell';

export default function AnnotationDemo() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 dark:bg-gray-800">
      <PageShell size="2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Annotation System Demo
          </h1>
          <p className="text-gray-600 mt-2 dark:text-gray-300">
            4-layer annotation system with threading, filtering, and real-time
            collaboration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area (Simulated) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4 dark:bg-gray-900">
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center dark:bg-gray-100">
                <div className="text-center text-white space-y-2 dark:text-white">
                  <svg
                    className="w-20 h-20 mx-auto opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-lg font-medium">Video Content</p>
                  <p className="text-sm opacity-75">
                    Introduction to Logic - Dr. Cohen
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold">
                  Introduction to Logical Reasoning
                </h2>
                <p className="text-gray-600 text-sm dark:text-gray-300">
                  Duration: 25:30 | Posted: February 15, 2026
                </p>
              </div>

              <div className="prose prose-sm max-w-none">
                <h3 className="text-lg font-semibold mt-4">Description</h3>
                <p className="text-gray-700 dark:text-gray-200">
                  This lecture introduces the fundamental concepts of logical
                  reasoning, including deductive and inductive arguments,
                  syllogisms, and formal logic. We'll explore the structure of
                  arguments and learn to identify valid reasoning patterns.
                </p>

                <h4 className="text-base font-semibold mt-4">Key Topics:</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 dark:text-gray-200">
                  <li>Premise and conclusion identification</li>
                  <li>Modus ponens and modus tollens</li>
                  <li>Categorical vs. hypothetical syllogisms</li>
                  <li>Validity vs. soundness</li>
                  <li>Common logical fallacies</li>
                </ul>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4 dark:bg-blue-950 dark:border-blue-400">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Instructor Note:</strong> This material will be
                    covered on the midterm exam. Please review the supplemental
                    reading by Prof. Williams before the next class.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Annotation Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg h-[800px] sticky top-8 dark:bg-gray-900">
              <AnnotationPanel
                contentId="b0000000-0000-0000-0000-000000000001"
                currentUserId="current-user"
                currentUserRole="student"
                contentTimestamp={undefined}
              />
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-900">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold mb-2">Private Notes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Create personal annotations visible only to you
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-900">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-semibold mb-2">Public Discussion</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Share insights with classmates and collaborate
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-900">
            <div className="text-3xl mb-3">🎓</div>
            <h3 className="font-semibold mb-2">Instructor Guidance</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Read expert annotations from your instructor
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-900">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold mb-2">AI Insights</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Get AI-generated suggestions and connections
            </p>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
