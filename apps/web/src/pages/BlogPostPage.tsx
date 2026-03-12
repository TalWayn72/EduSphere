import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBlogPost } from '@/lib/blog-data';
import { PageMeta, ArticleSchema, BreadcrumbSchema, PersonSchema } from '@/components/seo';

const BASE_URL = 'https://app.edusphere.dev';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderBody(markdown: string) {
  return markdown.split('\n\n').map((paragraph, i) => {
    if (paragraph.startsWith('## ')) {
      return (
        <h2
          key={i}
          className="text-xl font-bold text-gray-900 dark:text-foreground mt-8 mb-3"
        >
          {paragraph.slice(3)}
        </h2>
      );
    }
    return (
      <p key={i} className="text-gray-700 dark:text-muted-foreground leading-relaxed mb-4">
        {paragraph}
      </p>
    );
  });
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = slug ? getBlogPost(slug) : undefined;

  useEffect(() => {
    if (!post) {
      void navigate('/blog', { replace: true });
    }
  }, [post, navigate]);

  if (!post) return null;

  const canonicalUrl = `${BASE_URL}/blog/${post.slug}`;
  const ogImage = `${BASE_URL}/aeo/og?title=${encodeURIComponent(post.title)}&type=blog`;

  return (
    <>
      <PageMeta
        title={post.title}
        description={post.description}
        canonical={canonicalUrl}
        ogType="article"
        ogImage={ogImage}
      />
      <ArticleSchema
        title={post.title}
        description={post.description}
        slug={post.slug}
        author={post.author}
        authorUrl={post.authorUrl}
        datePublished={post.datePublished}
        dateModified={post.dateModified}
        keywords={post.keywords}
        category={post.category}
        readingTimeMinutes={post.readingTimeMinutes}
      />
      <BreadcrumbSchema
        items={[
          { name: 'EduSphere', url: BASE_URL },
          { name: 'Blog', url: '/blog' },
          { name: post.title, url: canonicalUrl },
        ]}
      />
      <PersonSchema name={post.author} url={post.authorUrl} />

      <div className="min-h-screen bg-gray-50 dark:bg-background">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/blog"
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline mb-6"
          >
            ← Blog
          </Link>

          <span className="inline-block px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full uppercase tracking-wide mb-4">
            {post.category}
          </span>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-foreground mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-muted-foreground mb-8 pb-6 border-b border-gray-200 dark:border-border">
            <span className="font-medium text-gray-700 dark:text-foreground">{post.author}</span>
            <span>{formatDate(post.datePublished)}</span>
            <span>{post.readingTimeMinutes} min read</span>
          </div>

          <article className="prose-sm">{renderBody(post.bodyMarkdown)}</article>
        </main>
      </div>
    </>
  );
}

export default BlogPostPage;
