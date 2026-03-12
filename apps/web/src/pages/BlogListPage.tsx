import React from 'react';
import { Link } from 'react-router-dom';
import { BLOG_POSTS } from '@/lib/blog-data';
import { PageMeta, BreadcrumbSchema } from '@/components/seo';

const BASE_URL = 'https://app.edusphere.dev';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function BlogListPage() {
  return (
    <>
      <PageMeta
        title="EduSphere Blog — AI Education Insights"
        description="Insights on AI-powered learning, knowledge graphs, e-learning standards, and compliance training automation from the EduSphere team."
        canonical={`${BASE_URL}/blog`}
        ogType="website"
        ogImage={`${BASE_URL}/aeo/og?title=EduSphere+Blog&type=blog`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'EduSphere', url: BASE_URL },
          { name: 'Blog', url: '/blog' },
        ]}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-background">
        <div className="bg-indigo-700 text-white py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
              EduSphere Blog
            </h1>
            <p className="text-indigo-200 text-lg">
              AI education insights, learning science, and platform updates.
            </p>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BLOG_POSTS.map((post) => (
              <article
                key={post.slug}
                className="bg-white dark:bg-card border border-gray-200 dark:border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="mb-3">
                    <span className="inline-block px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full uppercase tracking-wide">
                      {post.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-foreground mb-2 leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 dark:text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">
                    {post.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-muted-foreground mt-auto pt-4 border-t border-gray-100 dark:border-border">
                    <span>{post.author}</span>
                    <span>{post.readingTimeMinutes} min read</span>
                    <span>{formatDate(post.datePublished)}</span>
                  </div>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="mt-4 inline-flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
                    aria-label={`Read: ${post.title}`}
                  >
                    Read More →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}

export default BlogListPage;
